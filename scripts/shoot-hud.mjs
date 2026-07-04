// HUD layout smoke: the always-on objective chip and the announce toast both live
// top-centre. When the chip is showing it can stand two rows tall, so the toast must
// drop BELOW it (the hud-toast--below-objective modifier) instead of overlapping —
// a regression guard for that fix. Also pins the collect-tapes hint to the LIVE
// cassette count (derived from CASSETTE_IDS), so it can't drift back to a frozen
// number when a `track` item is added.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

// Seed so "collect-tapes" is the FIRST undone objective (earlier ones done, no tapes
// held) — that chip carries the long, two-row hint that used to collide with toasts.
await page.addInitScript(() => {
  localStorage.setItem(
    'sdp_progress_v1',
    JSON.stringify({
      everEnteredWorld: true,
      luckEarned: 1,
      luckSpent: 0,
      radioUnlocked: true,
      itemsHeld: ['pool-locker-key', 'hall-closet-key'],
      // The surface-wing objectives (garden slide / Turtle stage) come before
      // collect-tapes in QUESTS order — seed them done so the tapes chip is first.
      secretsFound: ['jump-unlocked', 'garden-slide', 'turtle-stage'],
    }),
  );
});
await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 15000 })
  .catch(() => bad('world never mounted'));
// Dismiss the intro overlay if it's up (wait on the button, not a fixed sleep).
await page
  .getByRole('button', { name: 'dismiss intro' })
  .click({ timeout: 8000 })
  .catch(() => {});

// The cassette-id debug hook (Doors.tsx) is exposed once the world mounts — wait
// for it rather than a fixed sleep, then read the live count.
await page
  .waitForFunction(() => (window.__sdpCassetteIds || []).length > 0, { timeout: 10000 })
  .catch(() => {});
const liveCount = await page.evaluate(() => (window.__sdpCassetteIds || []).length);

// 1) Wait for the objective chip to actually show the collect-tapes hint with the
//    LIVE count (not "Four") — wait on the concrete DOM state, not a timed guess.
let countOk = false;
const chipReady = await page
  .waitForFunction(
    (n) => {
      const t = document.querySelector('.hud-objective')?.textContent || '';
      return /Find the lost cassettes/i.test(t) && t.includes(`${n} tapes`);
    },
    liveCount,
    { timeout: 10000 },
  )
  .catch(() => null);
const chipText = await page.$eval('.hud-objective', (e) => e.textContent || '').catch(() => '');
if (!chipReady) {
  bad(
    `hud: collect-tapes chip never showed the live ${liveCount}-tape hint (saw ${JSON.stringify(chipText)})`,
  );
} else {
  countOk =
    liveCount > 0 && chipText.includes(`${liveCount} tapes`) && !/Four tapes/i.test(chipText);
  if (!countOk) bad(`hud: hint count not the live ${liveCount} (saw ${JSON.stringify(chipText)})`);
}

// 2) Fire a toast (pocket a tape — the shop hides tape-mystery-machine) and confirm
//    it lands BELOW the chip, never overlapping it.
let noOverlap = false;
await page.evaluate(() => window['__sdpPickup:tape-mystery-machine']?.());
const toast = await page.waitForSelector('.hud-toast', { timeout: 5000 }).catch(() => null);
if (!toast) bad('hud: no toast appeared after pocketing a tape');
else {
  // Wait for the toast's entrance animation to FINISH before measuring, so the
  // position is final (not mid-transform) — robust to slow runners.
  await page
    .waitForFunction(
      () => {
        const t = document.querySelector('.hud-toast');
        return (
          !!t &&
          t.getAnimations().every((a) => a.playState === 'finished' || a.playState === 'idle')
        );
      },
      { timeout: 3000 },
    )
    .catch(() => {});
  const box = await page.evaluate(() => {
    const o = document.querySelector('.hud-objective')?.getBoundingClientRect();
    const t = document.querySelector('.hud-toast')?.getBoundingClientRect();
    return o && t ? { objBottom: o.bottom, toastTop: t.top } : null;
  });
  if (!box) bad('hud: could not measure chip/toast boxes');
  else {
    noOverlap = box.toastTop >= box.objBottom;
    if (!noOverlap)
      bad(
        `hud: toast overlaps the objective chip (toastTop ${box.toastTop} < objBottom ${box.objBottom})`,
      );
  }
  await page.screenshot({ path: '.shots/hud-overlap.png' });
}

// 3) STACKED-MODAL FOCUS TRAP (regression guard). The lyrics reader opens ON TOP of
//    the pause menu — the one place two role=dialog overlays coexist. Only the TOP
//    dialog may own Tab; before the fix, the pause menu beneath also trapped and
//    yanked focus out of the lyrics reader on every Tab. Open pause → open lyrics →
//    Tab must STAY in lyrics → Escape closes lyrics → focus restores to the menu.
let stackOk = false;
await page.keyboard.press('Escape'); // open the pause menu
const paused = await page.waitForSelector('.hud-pause', { timeout: 5000 }).catch(() => null);
if (!paused) bad('hud: pause menu never opened on Escape');
else {
  const opened = await page.evaluate(() => typeof window.__sdpOpenLyrics === 'function');
  if (!opened) bad('hud: __sdpOpenLyrics hook missing (needed to stack lyrics over pause)');
  else {
    await page.evaluate(() => window.__sdpOpenLyrics());
    const lyrics = await page
      .waitForSelector('.hud-dialog--lyrics', { timeout: 5000 })
      .catch(() => null);
    if (!lyrics) bad('hud: lyrics reader never opened over the pause menu');
    else {
      // The top dialog's hook focuses its first control; Tab must keep focus INSIDE
      // it and never fall through to the pause menu beneath.
      const inLyrics = () =>
        page.evaluate(() => !!document.activeElement?.closest('.hud-dialog--lyrics'));
      let trapped = await inLyrics();
      for (let i = 0; i < 4 && trapped; i++) {
        await page.keyboard.press('Tab');
        trapped = await inLyrics();
      }
      if (!trapped) bad('hud: Tab escaped the top (lyrics) dialog into the pause menu');
      // Close the top layer — focus must hand back DOWN to the pause menu.
      await page.keyboard.press('Escape');
      await page.waitForSelector('.hud-dialog--lyrics', { state: 'detached', timeout: 5000 });
      const backInMenu = await page.evaluate(() => !!document.activeElement?.closest('.hud-pause'));
      if (!backInMenu) bad('hud: focus not restored to the pause menu after closing lyrics');
      stackOk = trapped && backInMenu;
    }
  }
}

console.log(
  `hud -> count=${countOk} noOverlap=${noOverlap} modalStack=${stackOk} errors=${failures()}`,
);

await ctx.close();
await finish('\nhud checks passed.', `\n${failures()} hud check(s) FAILED`);
