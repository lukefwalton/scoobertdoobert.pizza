// Verifies the music ladder (cassette tapes): pocketing a tape plays its track
// (the reward IS sound), unlocks the radio (an exploration path to the upgrade),
// drops it in Pockets + the Tapes counter, and tips luck. The full "collect all →
// quest done → finale" path is covered by shoot:finale; this is one tape's loop.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

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
  tapesCount = /Tapes\s*1\/4/.test(prog2);
  if (!tapesCount) bad(`tapes: Tapes counter not 1/4 (saw ${JSON.stringify(prog2)})`);
  radioFlip = !!(await page.$('button[aria-label="next song"]'));
  if (!radioFlip) bad('tapes: radio flip controls not shown after unlock');
  await page.screenshot({ path: '.shots/tapes.png' });
}

if (errors.length) bad(`tapes: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `tapes -> pocketed=${pocketed} radio=${radioUnlocked} plays=${plays} pockets=${inPockets} count=${tapesCount} flip=${radioFlip} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} tapes check(s) FAILED` : '\ntapes checks passed.');
process.exit(fail ? 1 : 0);
