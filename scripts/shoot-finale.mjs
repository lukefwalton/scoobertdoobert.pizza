// Verifies the finale / win arc (Commit D): with every objective done EXCEPT one,
// completing that last one flips completion to 100% and fires the finale once — a
// celebratory toast, a durable 'finale' secret, and the pause-menu "★ 100%" badge.
// We complete the last objective deterministically via the shrine clap hook.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

const secrets = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || [];
    } catch {
      return [];
    }
  });

// Seed EVERY objective done except "earn-luck" (luckEarned 0) — so the next clap
// at the shrine completes the set and trips the finale.
await page.addInitScript(() => {
  localStorage.setItem(
    'sdp_progress_v1',
    JSON.stringify({
      everEnteredWorld: true,
      luckEarned: 0,
      luckSpent: 0,
      radioUnlocked: true,
      // Every cassette in CASSETTE_IDS (the 4 original lost tapes + the 3 Basement
      // Sessions master reels) so the collect-tapes objective is DONE — keep this in
      // sync with items.ts whenever a music-item (anything with a `track`) is added.
      itemsHeld: [
        'pool-locker-key',
        'hall-closet-key',
        'tape-mystery-machine',
        'tape-moonlight',
        'tape-japan',
        'tape-internet',
        'tape-information',
        'tape-1101',
        'tape-jolly-roger-bay',
      ],
      secretsFound: [
        'jump-unlocked',
        // unlock-radio now keys off the jukebox-roll ritual (not radioUnlocked), so
        // seed it done here; earn-luck's 'shrine-clap' is deliberately withheld so
        // the shrine clap below completes the FINAL objective and trips the finale.
        'jukebox-roll',
        'dice-monster',
        'grass-cleared',
        'danced:seed',
        'garden-slide',
        'turtle-stage',
      ],
      visitedRooms: ['shop', 'hallway', 'jukebox', 'poolrooms', 'shrine', 'terminus'],
    }),
  );
});
await page.goto(base + '/?room=shrine&debug=1', { waitUntil: 'networkidle' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 15000 })
  .catch(() => bad('world never mounted'));
const hasClap = await page
  .waitForFunction(() => typeof window.__sdpShrineClap === 'function', null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!hasClap) bad('finale: shrine clap hook never appeared');

// Guard the hardcoded tape seed against drift: the seed above must cover the LIVE
// CASSETTE_IDS set (read from the app via __sdpCassetteIds), or the collect-tapes
// objective silently won't complete and the finale "mysteriously" never fires.
// Surface a missing tape by NAME instead, so a future `track` item is obvious.
const missingTapes = await page.evaluate(() => {
  const ids = window.__sdpCassetteIds || [];
  let held = [];
  try {
    held = JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').itemsHeld || [];
  } catch {
    held = [];
  }
  return ids.filter((id) => !held.includes(id));
});
if (missingTapes.length)
  bad(
    `finale: seed is missing cassette(s) ${missingTapes.join(', ')} — update itemsHeld in this file`,
  );
await page.waitForTimeout(600);

let finaleToast = false;
let finaleSecret = false;
let finaleCard = false;
let badge = false;
if (hasClap) {
  if ((await secrets()).includes('finale'))
    bad('finale: started already finished (state not fresh)');

  // Complete the last objective — the clap earns luck → 100% → finale.
  await page.evaluate(() => window.__sdpShrineClap());

  finaleToast = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('.hud-toast--crit-good');
        return !!el && /seen it all/i.test(el.textContent || '');
      },
      null,
      { timeout: 6000 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!finaleToast) bad('finale: no "seen it all" finale toast fired on completion');

  finaleSecret = (await secrets()).includes('finale');
  if (!finaleSecret) bad('finale: durable finale secret not recorded');

  // The persistent 100% CAPSTONE card appears (in-room, wherever you are) carrying
  // the share button — the legible, shareable finale, not just the fleeting toast.
  // Dismiss it and confirm it retires (a durable once-ever flag).
  finaleCard = await page.waitForSelector('.hud-finale', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!finaleCard) bad('finale: the 100% capstone card did not appear');
  else {
    if ((await page.$('.hud-finale__share')) === null)
      bad('finale: the capstone card has no share button');
    await page.click('.hud-finale__close', { timeout: 3000 }).catch(() => {});
    const gone = await page
      .waitForSelector('.hud-finale', { state: 'detached', timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
    if (!gone) bad('finale: the capstone card did not dismiss');
  }

  // Pause menu shows the ★ 100% badge.
  await page.keyboard.press('Escape');
  const count = await page
    .waitForSelector('.hud-pause__todocount', { timeout: 4000 })
    .catch(() => null);
  const txt = count ? ((await count.textContent()) ?? '').trim() : '';
  badge = /★/.test(txt) && /100%/.test(txt);
  if (!badge) bad(`finale: pause badge not at ★ 100% (saw ${JSON.stringify(txt)})`);
  await page.screenshot({ path: '.shots/finale.png' });
}

console.log(
  `finale -> clap=${hasClap} toast=${finaleToast} secret=${finaleSecret} card=${finaleCard} badge=${badge} errors=${failures()}`,
);

await ctx.close();
await finish('\nfinale checks passed.', `\n${failures()} finale check(s) FAILED`);
