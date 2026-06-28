// Verifies the music ladder (cassette tapes): pocketing a tape plays its track
// (the reward IS sound), unlocks the radio (an exploration path to the upgrade),
// drops it in Pockets + the Tapes counter, and tips luck. The full "collect all →
// quest done → finale" path is covered by shoot:finale; this is one tape's loop.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

const prog = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
    } catch {
      return {};
    }
  });

const TAPE = 'tape-mystery-machine';
// The shop hides the first cassette; &debug=1 exposes the pickup + audio globals.
await page.goto(base + '/?room=shop&debug=1', { waitUntil: 'commit' });
await page.evaluate(() => localStorage.clear());
await page.goto(base + '/?room=shop&debug=1', { waitUntil: 'networkidle' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 15000 })
  .catch(() => bad('world never mounted'));
const hasHook = await page
  .waitForFunction(
    () => typeof window[`__sdpPickup:${'tape-mystery-machine'}`] === 'function',
    null,
    {
      timeout: 8000,
    },
  )
  .then(
    () => true,
    () => false,
  );
if (!hasHook) bad('tapes: pickup hook never appeared');
await page.waitForTimeout(500);

let pocketed = false;
let radioUnlocked = false;
let plays = false;
let inPockets = false;
let tapesCount = false;
let radioFlip = false;
if (hasHook) {
  const before = await prog();
  if (before.radioUnlocked) bad('tapes: radio already unlocked (state not fresh)');

  await page.evaluate((t) => window[`__sdpPickup:${t}`](), TAPE);
  await page
    .waitForFunction(
      () => {
        const el = document.querySelector('.hud-toast--luck');
        return !!el && /spin|Mystery Machine/i.test(el.textContent || '');
      },
      null,
      { timeout: 5000 },
    )
    .catch(() => bad('tapes: no pickup toast'));

  const after = await prog();
  pocketed = (after.itemsHeld || []).includes(TAPE);
  if (!pocketed) bad('tapes: cassette not in itemsHeld');
  radioUnlocked = after.radioUnlocked === true;
  if (!radioUnlocked) bad('tapes: pocketing a cassette did not unlock the radio');

  // The cassette's track is now the loop voice.
  plays = await page
    .waitForFunction(() => /mystery-machine/.test(window.__sdpJukeboxUrl || ''), null, {
      timeout: 6000,
    })
    .then(
      () => true,
      () => false,
    );
  if (!plays) bad('tapes: the cassette track did not start playing');

  // Pause menu: Pockets shows it, the Tapes counter ticks, and the radio is now
  // unlocked (the ◀/▶ flip buttons appear).
  await page.keyboard.press('Escape');
  const pockets = await page
    .waitForSelector('.hud-pause__invlist li', { timeout: 4000 })
    .catch(() => null);
  inPockets = /Mystery Machine/i.test(pockets ? ((await pockets.textContent()) ?? '') : '');
  if (!inPockets) bad('tapes: Pockets missing the cassette');
  const prog2 = await page.$$eval('.hud-pause__progress span', (els) =>
    els.map((e) => e.textContent || '').join(' | '),
  );
  // Assert the counter against the LIVE total (the 4 original lost tapes + the 3
  // Basement Sessions master reels = 7 today), read from the app's own CASSETTE_IDS
  // via the __sdpCassetteIds hook — so adding a `track` item can't leave a frozen
  // count stale here.
  const totalTapes = await page.evaluate(() => (window.__sdpCassetteIds || []).length);
  if (totalTapes < 1) bad('tapes: __sdpCassetteIds hook missing — cannot derive the live total');
  tapesCount = new RegExp(`Tapes\\s*1/${totalTapes}`).test(prog2);
  if (!tapesCount) bad(`tapes: Tapes counter not 1/${totalTapes} (saw ${JSON.stringify(prog2)})`);
  radioFlip = !!(await page.$('button[aria-label="next song"]'));
  if (!radioFlip) bad('tapes: radio flip controls not shown after unlock');
  await page.screenshot({ path: '.shots/tapes.png' });
}

console.log(
  `tapes -> pocketed=${pocketed} radio=${radioUnlocked} plays=${plays} pockets=${inPockets} count=${tapesCount} flip=${radioFlip} errors=${failures()}`,
);

await ctx.close();
await finish('\ntapes checks passed.', `\n${failures()} tapes check(s) FAILED`);
