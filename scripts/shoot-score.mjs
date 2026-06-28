// Score smoke: the loot collectathon end-to-end. Enters a stocked room, grabs loot
// through the debug hook, and asserts the run math + HUD + durable best:
//   • a chained combo MULTIPLIES (the 2nd grab is worth more than the 1st);
//   • collecting grows you taller (scoreStore.tallness > 0);
//   • the score + combo chips render on the HUD;
//   • a re-grab is idempotent (no double-collect);
//   • the best persists to the progress spine (localStorage).
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

const score = () => page.evaluate(() => window.__sdpScore?.() ?? null);

await page.goto(base + '/?room=shop&debug=1', { waitUntil: 'commit' });
await page.evaluate(() => localStorage.clear());
await page.goto(base + '/?room=shop&debug=1', { waitUntil: 'networkidle' });
await page
  .waitForSelector('canvas', { timeout: 15000 })
  .catch(() => bad('world canvas never mounted'));

// Hooks present?
const hooksReady = await page
  .waitForFunction(
    () => typeof window.__sdpLootIds === 'function' && typeof window.__sdpGrabLoot === 'function',
    null,
    { timeout: 8000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!hooksReady) bad('score: __sdpLootIds / __sdpGrabLoot hooks never appeared');

let ids = [];
let comboOk = false;
let multiplied = false;
let grew = false;
let hudPts = false;
let hudCombo = false;
let idempotent = false;
let persisted = false;

if (hooksReady) {
  ids = await page.evaluate(() => window.__sdpLootIds());
  if (ids.length < 2) bad(`score: room not stocked with loot (got ${ids.length})`);

  if (ids.length >= 2) {
    const before = await score();
    await page.evaluate((id) => window.__sdpGrabLoot(id), ids[0]);
    const s1 = await score();
    await page.evaluate((id) => window.__sdpGrabLoot(id), ids[1]);
    const s2 = await score();

    comboOk = s2.combo === 2;
    if (!comboOk) bad(`score: two quick grabs did not chain a ×2 combo (combo=${s2.combo})`);

    const d1 = s1.score - before.score;
    const d2 = s2.score - s1.score;
    multiplied = d2 > d1 && d1 > 0;
    if (!multiplied) bad(`score: combo did not multiply (d1=${d1} d2=${d2})`);

    grew = s2.tallness > 0;
    if (!grew) bad('score: collecting loot did not grow tallness');

    // HUD chips
    hudPts = await page
      .waitForFunction(
        () => /\d/.test(document.querySelector('.hud-score__pts')?.textContent || ''),
        null,
        {
          timeout: 4000,
        },
      )
      .then(
        () => true,
        () => false,
      );
    if (!hudPts) bad('score: the HUD score chip did not show the points');
    hudCombo = await page.$('.hud-score__combo').then((e) => !!e);
    if (!hudCombo) bad('score: the HUD combo chip did not show during a streak');

    // Idempotent re-grab
    const beforeRe = (await score()).score;
    await page.evaluate((id) => window.__sdpGrabLoot(id), ids[0]);
    const afterRe = (await score()).score;
    idempotent = afterRe === beforeRe;
    if (!idempotent) bad('score: re-grabbing an already-taken drop changed the score');

    // Durable best persisted
    persisted = await page.evaluate((s) => {
      try {
        return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').pizzaPointsBest >= s;
      } catch {
        return false;
      }
    }, s2.score);
    if (!persisted) bad('score: the run best did not persist to the progress spine');

    await page.screenshot({ path: '.shots/score.png' });
  }
}

if (errors.length) bad(`score: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `score -> hooks=${hooksReady} loot=${ids.length} combo=${comboOk} multiplied=${multiplied} ` +
    `grew=${grew} hudPts=${hudPts} hudCombo=${hudCombo} idempotent=${idempotent} persisted=${persisted} ` +
    `errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} score check(s) FAILED` : '\nscore checks passed.');
process.exit(fail ? 1 : 0);
