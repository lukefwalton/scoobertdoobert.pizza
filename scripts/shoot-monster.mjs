// Phase 6 dice-monster smoke: the back room off the poolrooms. Navigate
// shop → pool → the back room, then ROLL the d20 against the monster repeatedly.
// Each loss grows it; enough losses and it's TOO BIG TO MOVE (maxed) — a
// room-filling lump, never a fail state. Asserts the grow→cap path via the
// `__sdpMonster` hook (losses climb, scale caps, maxed flips), not on visuals.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { roomIs as sharedRoomIs, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};
watchPageErrors(page, fail);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail, timeout });
const toDoor = async (key) => {
  await page.keyboard.down(key);
  await page.waitForSelector('.hud-prompt--door', { timeout: 5000 }).catch(() => {});
  await page.keyboard.up(key);
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
};
const monster = () => page.evaluate(() => window.__sdpMonster ?? null);

await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const startShop = await roomIs('Beach Pizza Shop');
// Fail fast if the gated transition hook isn't exposed (a gating regression), so
// it surfaces here with a targeted message instead of a later room timeout.
if (!(await page.evaluate(() => typeof window.__sdpGoToRoom === 'function')))
  fail('__sdpGoToRoom hook not exposed under ?world&debug (gating regression?)');
// Jump straight to the back room via the gated transition hook — the
// surface → pool → back-room walk is shoot-rooms'; this smoke is the dice monster.
await page.evaluate(() => window.__sdpGoToRoom?.('dicepit', 'fromPool'));
const inPit = await roomIs('The Back Room');
await page.screenshot({ path: '.shots/monster-start.png' });

// The monster starts small.
const m0 = await monster();
const startedSmall = !!m0 && m0.losses === 0 && m0.scale === 1 && m0.maxed === false;
if (!startedSmall) fail(`monster didn't start small (got ${JSON.stringify(m0)})`);

// Roll the bone (low-centre on the table) until it's TOO BIG TO MOVE *and* we've
// landed at least one win (so the win→secret→greeting path is exercised too).
// P(loss)≈0.525, P(win)≈0.475 per roll, so ~30 rolls reliably gives both.
const box = await page.locator('canvas').boundingBox();
let grew = false;
let maxed = false;
let won = false;
let monotonic = true;
let prevLosses = 0;
if (inPit) {
  for (let i = 0; i < 30; i++) {
    await page.mouse.click(box.x + box.width * 0.49, box.y + box.height * 0.9);
    await page.waitForTimeout(1450); // let the tumble settle + resolve
    const m = await monster();
    if (!m) {
      fail('monster hook went missing mid-roll');
      break;
    }
    if (m.losses < prevLosses) monotonic = false; // losses never go DOWN
    prevLosses = m.losses;
    if (m.losses > 0) grew = true;
    if (m.wins > 0) won = true;
    if (m.maxed) maxed = true;
    if (maxed && won) break; // both contracts hit
  }
}
const mEnd = await monster();
if (!won) fail('never won a single bout in 30 rolls (improbable — clicks missing the die?)');
if (!grew)
  fail('the monster never grew after many rolls (no losses registered — clicks missing the die?)');
if (!maxed) fail(`the monster never reached TOO BIG TO MOVE (ended ${JSON.stringify(mEnd)})`);
if (!monotonic) fail('monster losses went DOWN at some point (should be monotonic)');
// Capped: at maxed, scale must equal monsterScale(CAP) ≈ 3.8 and not exceed it.
const cappedScale = !!mEnd && Math.abs(mEnd.scale - 3.8) < 0.001;
if (!cappedScale) fail(`monster scale not capped at 3.8 when maxed (got ${mEnd?.scale})`);
await page.screenshot({ path: '.shots/monster-maxed.png' });

// Too big to move ≠ trapped: you can still walk back out to the pool. The exit
// door is behind the spawn (+Z) — we never moved (rolls are mouse-only) — so
// walk S to reach it.
await toDoor('s');
const left = await roomIs('The Poolrooms', 6000);
if (!left) fail('could not leave the back room past the maxed monster');

// Cross-room integration: a win recorded the 'dice-monster' secret in
// localStorage, and the storefront's rat greeting now clocks it. (Persistence
// survives the in-tab nav back to "/".)
const secretSaved = await page.evaluate(() => {
  try {
    return (
      JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || []
    ).includes('dice-monster');
  } catch {
    return false;
  }
});
if (!secretSaved) fail('winning a bout did not record the dice-monster secret');

await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 15000 });
await page.waitForSelector('.store', { timeout: 8000 });
await page.waitForTimeout(400);
const greeting = await page.evaluate(
  () => document.querySelector('.news-returning')?.textContent?.toLowerCase() ?? '',
);
const ratClocks = greeting.includes('dice');
if (!ratClocks) fail(`rat greeting didn't clock the dice-monster win (got: ${greeting})`);

await browser.close();
console.log(
  `monster: shop=${startShop} pit=${inPit} startedSmall=${startedSmall} grew=${grew} ` +
    `won=${won} maxed=${maxed} monotonic=${monotonic} capped=${cappedScale} left=${left} ` +
    `secret=${secretSaved} ratClocks=${ratClocks} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
