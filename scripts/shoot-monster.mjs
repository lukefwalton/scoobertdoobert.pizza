// Phase 6 dice-monster smoke: the back room off the poolrooms. Navigate
// shop → pool → the back room, then ROLL the d20 against the monster repeatedly.
// Each loss grows it; enough losses and it's TOO BIG TO MOVE (maxed) — a
// room-filling lump, never a fail state. Asserts the grow→cap path via the
// `__sdpMonster` hook (losses climb, scale caps, maxed flips), not on visuals.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

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
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') fail(`console: ${m.text()}`);
});

const roomIs = (name, timeout = 8000) =>
  page
    .waitForFunction(
      (n) => document.querySelector('.hud-room')?.textContent?.includes(n) ?? false,
      name,
      { timeout },
    )
    .then(() => true, () => (fail(`room never became "${name}"`), false));
const toDoor = async (key) => {
  await page.keyboard.down(key);
  await page.waitForSelector('.hud-prompt--door', { timeout: 5000 }).catch(() => {});
  await page.keyboard.up(key);
  await page.keyboard.press('e');
  await page.waitForTimeout(700);
};
const monster = () => page.evaluate(() => window.__sdpMonster ?? null);

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const startShop = await roomIs('Beach Pizza Shop');
await toDoor('d'); // → poolrooms (+X stairwell)
const inPool = await roomIs('The Poolrooms');
await toDoor('a'); // → the back room (-X door)
const inPit = await roomIs('The Back Room');
await page.screenshot({ path: '.shots/monster-start.png' });

// The monster starts small.
const m0 = await monster();
const startedSmall = !!m0 && m0.losses === 0 && m0.scale === 1 && m0.maxed === false;
if (!startedSmall) fail(`monster didn't start small (got ${JSON.stringify(m0)})`);

// Roll the bone (low-centre on the table) until it's TOO BIG TO MOVE, or we run
// out of patience. P(loss) per roll ≈ 0.525, so ~24 rolls reliably hits the cap.
const box = await page.locator('canvas').boundingBox();
let grew = false;
let maxed = false;
let monotonic = true;
let prevLosses = 0;
if (inPit) {
  for (let i = 0; i < 26; i++) {
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
    if (m.maxed) {
      maxed = true;
      break;
    }
  }
}
const mEnd = await monster();
if (!grew) fail('the monster never grew after many rolls (no losses registered — clicks missing the die?)');
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

await browser.close();
console.log(
  `monster: shop=${startShop} pool=${inPool} pit=${inPit} startedSmall=${startedSmall} ` +
    `grew=${grew} maxed=${maxed} monotonic=${monotonic} capped=${cappedScale} left=${left} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
