// Phase 6 dice-music smoke: the d20 beside the jukebox is the CHAOS track
// selector. Navigate shop → back hall → jukebox (the direct corridor route, no
// rat detour), then CLICK the die and assert it rolled (1..20) and the jukebox
// jumped to the rolled track. Asserts on the `__sdpDice` test hook + the jukebox
// selection, not on tumble timing.
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

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const startShop = await roomIs('Beach Pizza Shop');

// shop → back hall (back up to the rear door, E).
await page.keyboard.down('s');
await page.waitForTimeout(900);
await page.keyboard.up('s');
await page.keyboard.press('e');
const inHall = await roomIs('Back Hall');

// down the long corridor to the far jukebox door (no rat detour needed).
await page.keyboard.down('w');
await page.waitForTimeout(5200);
await page.keyboard.up('w');
await page.waitForSelector('.hud-prompt--door', { timeout: 4000 }).catch(() => {});
await page.keyboard.press('e');
const inJuke = await roomIs('The Jukebox');
await page.waitForTimeout(800);
await page.screenshot({ path: '.shots/dice-before.png' });

// Roll the die: it sits to the right of the cabinet (world ~[2.7,1,-3.4]); from
// the entry pose it projects to roughly the lower-right of center. Click it and
// confirm a face (1..20) landed and the jukebox jumped to the rolled track.
let rolled = false;
let trackJumped = false;
if (inJuke) {
  const before = await page.evaluate(() => window.__sdpJukebox?.index);
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.663, box.y + box.height * 0.62);
  rolled = await page
    .waitForFunction(() => typeof window.__sdpDice === 'number' && window.__sdpDice >= 1 && window.__sdpDice <= 20, null, {
      timeout: 4000,
    })
    .then(() => true, () => false);
  if (!rolled) fail('clicking the d20 did not register a roll (1..20)');
  if (rolled) {
    const face = await page.evaluate(() => window.__sdpDice);
    const expected = (face - 1) % 4; // 4-track catalog
    trackJumped = await page
      .waitForFunction((idx) => window.__sdpJukebox?.index === idx, expected, { timeout: 4000 })
      .then(() => true, () => false);
    if (!trackJumped)
      fail(`roll ${face} did not set the jukebox to the mapped track (expected index ${expected}, was ${before})`);
    await page.waitForTimeout(1300); // let the tumble settle for the shot
    await page.screenshot({ path: '.shots/dice-after.png' });
  }
}

await browser.close();
console.log(
  `dice: shop=${startShop} hall=${inHall} juke=${inJuke} rolled=${rolled} trackJumped=${trackJumped} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
