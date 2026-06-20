// Phase 3 room-graph smoke: the world is a graph of rooms joined by 3D doors.
// Tour: beach shop → back hall → jukebox room, via the doors. Covers the
// negative spawn check (no door prompt until you approach), keyboard entry, the
// long-corridor traversal, the new jukebox room, the held-E no-bounce guard, and
// click-to-enter. Asserts on the quiet `.hud-room` label + door prompts, not on
// animation timing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
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
    .then(
      () => true,
      () => (fail(`room never became "${name}"`), false),
    );
const labelHas = (name) =>
  page.evaluate(
    (n) => document.querySelector('.hud-room')?.textContent?.includes(n) ?? false,
    name,
  );
const walk = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500); // WebGL warmup + a few frames

// 1) Start in the shop — and the back-hall door must NOT prompt at spawn (you
//    discover it by turning around, not instantly on load).
const startShop = await roomIs('Beach Pizza Shop');
const noSpawnPrompt = (await page.$('.hud-prompt--door')) === null;
if (!noSpawnPrompt) fail('back-hall door prompt was visible at spawn (should require approach)');
await page.screenshot({ path: '.shots/rooms-shop.png' });

// 2) Back up to the rear wall → keyboard E → the hall.
await walk('s', 900);
let doorPrompt = false;
try {
  await page.waitForSelector('.hud-prompt--door', { timeout: 3000 });
  doorPrompt = true;
} catch {
  fail('back-hall door prompt never appeared');
}
await page.keyboard.press('e');
const inHall = await roomIs('Back Hall');

// 3) Down the long corridor to the far door → the jukebox room.
await walk('w', 5500);
let jukePrompt = false;
try {
  await page.waitForSelector('.hud-prompt--door', { timeout: 3000 });
  jukePrompt = true;
} catch {
  fail('jukebox door prompt never appeared at the hall end');
}
await page.keyboard.press('e');
const inJuke = await roomIs('The Jukebox');
await page.waitForTimeout(900);
await page.screenshot({ path: '.shots/rooms-jukebox.png' });

// 4) At the jukebox exit door: a held-E (repeat) must NOT transition; then turn
//    to face the door and CLICK it (the mouse path) → back to the hall.
await walk('s', 800); // to the exit door (now behind us)
await page.waitForSelector('.hud-prompt--door', { timeout: 3000 }).catch(() => {});
await page.evaluate(() =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', repeat: true })),
);
await page.waitForTimeout(400);
const heldNoBounce = await labelHas('The Jukebox');
if (!heldNoBounce) fail('held E (repeat) bounced out of the jukebox');

const box = await page.locator('canvas').boundingBox();
const cy = box.y + box.height / 2;
await page.mouse.move(box.x + box.width * 0.78, cy);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.29, cy, { steps: 12 }); // turn ~180° to face the door
await page.mouse.up();
await page.mouse.click(box.x + box.width / 2, cy); // click the door mesh
const clickEnter = await roomIs('Back Hall');

await browser.close();
console.log(
  `rooms: shop=${startShop} noSpawnPrompt=${noSpawnPrompt} doorPrompt=${doorPrompt} ` +
    `hall=${inHall} jukePrompt=${jukePrompt} jukebox=${inJuke} heldNoBounce=${heldNoBounce} ` +
    `clickEnter=${clickEnter} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
