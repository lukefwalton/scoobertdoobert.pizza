// Radio smoke: the flip-through song radio is an UPGRADE, locked until you roll
// the jukebox d20. Covers (1) before the upgrade the pause-menu radio is LOCKED
// (a read-out + a hint, no ◀/▶); (2) rolling the jukebox d20 UNLOCKS it durably
// (persisted to the progress spine); (3) once unlocked the ◀/▶ flip the catalog
// and the engine's loop voice actually follows — read off the gated __sdp* globals.
import { startSmoke } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
const { page, fail: bad, finish, failures } = await startSmoke();
page.on('pageerror', (e) => bad(`pageerror: ${e.message}`));

// ── 1. LOCKED before the upgrade: a read-out + a hint, and NO flip buttons ──
await page.goto(base + '/?world=1', { waitUntil: 'commit' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 12000 })
  .catch(() => bad('world never mounted'));
await page.keyboard.press('Escape');
await page
  .waitForSelector('.hud-pause', { timeout: 6000 })
  .catch(() => bad('pause menu did not open'));
const lockedHint = await page.$('.hud-pause__radiohint').then((e) => !!e);
const noFlipWhenLocked = !(await page.$('button[aria-label="next song"]'));
if (!lockedHint) bad('locked radio did not show the "roll the bone" hint');
if (!noFlipWhenLocked) bad('flip buttons were present BEFORE the radio was unlocked');

// ── 2. UNLOCK by rolling the jukebox d20 (the upgrade) ──
await page.goto(base + '/?room=jukebox&debug=1', { waitUntil: 'commit' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 12000 })
  .catch(() => bad('jukebox never mounted'));
// The Scoobertverse welcome card sits over the cabinet/die for ~3s on entry —
// wait it out (it removes itself) so the click lands on the die, not the card.
await page.waitForSelector('.hud-welcome', { state: 'detached', timeout: 6000 }).catch(() => {});
await page.waitForTimeout(400);
const jbBox = await page.locator('canvas').boundingBox();
// The d20 sits to the right of the cabinet (world [2.7,1,-3.4]); it projects near
// (0.66w, 0.61h). Click a small cluster, waiting out the ~1s tumble after each, so
// a near-miss retries rather than flaking. __sdpDice flips to the rolled face.
const rolled = await (async () => {
  for (const [fx, fy] of [
    [0.664, 0.606],
    [0.65, 0.6],
    [0.68, 0.61],
    [0.66, 0.62],
    [0.67, 0.59],
    [0.655, 0.615],
    [0.675, 0.6],
  ]) {
    await page.mouse.click(jbBox.x + jbBox.width * fx, jbBox.y + jbBox.height * fy);
    const ok = await page
      .waitForFunction(() => typeof window.__sdpDice === 'number', null, { timeout: 1800 })
      .then(
        () => true,
        () => false,
      );
    if (ok) return true;
  }
  return false;
})();
if (!rolled) bad('clicking the jukebox d20 did not register a roll (__sdpDice unset)');
const unlocked = await page.evaluate(() => {
  try {
    return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').radioUnlocked === true;
  } catch {
    return false;
  }
});
if (!unlocked) bad('rolling the jukebox d20 did not unlock the radio (not persisted)');

// ── 3. UNLOCKED: the ◀/▶ now flip the catalog and the engine voice follows ──
await page.keyboard.press('Escape');
await page
  .waitForSelector('.hud-pause', { timeout: 6000 })
  .catch(() => bad('pause menu did not open (post-unlock)'));
const flipReady = await page
  .waitForFunction(
    () => {
      const b = [...document.querySelectorAll('button')].find(
        (x) => x.getAttribute('aria-label') === 'next song',
      );
      return !!b && !b.disabled;
    },
    null,
    { timeout: 12000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!flipReady) bad('flip buttons never appeared/enabled after unlocking the radio');

let flipped = false;
if (flipReady) {
  const urlBefore = await page.evaluate(() => window.__sdpJukeboxUrl);
  await page.getByRole('button', { name: 'next song' }).click();
  flipped = await page
    .waitForFunction(
      (prev) => !!window.__sdpJukeboxUrl && window.__sdpJukeboxUrl !== prev,
      urlBefore,
      {
        timeout: 12000,
      },
    )
    .then(
      () => true,
      () => false,
    );
  if (!flipped) bad('flipping ▶ did not swap the engine loop voice to another track');
}
// ── 4. Same-URL no-op guard: replaying the CURRENT track must NOT restart the loop
//      voice (the "song stepping over itself" fix); a genuine swap still must. The
//      engine bumps __sdpLoopStarts on every ACTUAL (re)start, so the count holding
//      across a same-URL replay proves the guard short-circuited. ──
let guardHeld = false;
let swapBumped = false;
if (flipped) {
  const before = await page.evaluate(() => ({
    url: window.__sdpJukeboxUrl ?? null,
    starts: window.__sdpLoopStarts ?? 0,
  }));
  // Replay the SAME url straight through the engine — the guard should short-circuit.
  await page.evaluate((u) => window.__sdpAudio?.playJukeboxTrack(u), before.url);
  await page.waitForTimeout(200);
  const afterSame = await page.evaluate(() => ({
    url: window.__sdpJukeboxUrl ?? null,
    starts: window.__sdpLoopStarts ?? 0,
  }));
  guardHeld = afterSame.starts === before.starts && afterSame.url === before.url;
  if (!guardHeld) bad('replaying the CURRENT track restarted the loop (same-URL guard failed)');

  // A genuine flip to another track must still (re)start the loop voice (counter up).
  await page.getByRole('button', { name: 'next song' }).click();
  swapBumped = await page
    .waitForFunction((s) => (window.__sdpLoopStarts ?? 0) > s, before.starts, { timeout: 12000 })
    .then(
      () => true,
      () => false,
    );
  if (!swapBumped) bad('a genuine track swap did not (re)start the loop voice');
}

console.log(
  `radio -> lockedHint=${lockedHint} noFlipLocked=${noFlipWhenLocked} rolled=${rolled} ` +
    `unlocked=${unlocked} flipped=${flipped} guardHeld=${guardHeld} swapBumped=${swapBumped} ` +
    `errors=${failures()}`,
);
await finish('\nradio checks passed.', `\n${failures()} radio check(s) FAILED`);
