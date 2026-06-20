// Phase 3 room-graph smoke: the world is no longer one room. Enter the beach
// shop, step through the back-hall DOOR into the hallway, then walk back through
// the return door to the shop — proving doors connect rooms, the camera
// re-spawns per room, and the fade/commit swap works. Asserts on the quiet
// `.hud-room` label (which reflects currentRoom) + door prompts, not on timing.
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

const roomIs = (name, timeout = 6000) =>
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

// Walk (hold a key) for a bit — used to snug up against a door.
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

// Start in the shop.
const startShop = await roomIs('Beach Pizza Shop');
await page.screenshot({ path: '.shots/rooms-shop.png' });

// Back up to the rear wall (the EMPLOYEES-ONLY back-hall door is behind spawn).
await walk('s', 700);
let doorPrompt = false;
try {
  await page.waitForSelector('.hud-prompt--door', { timeout: 3000 });
  doorPrompt = true;
} catch {
  fail('back-hall door prompt never appeared');
}
// Step through.
await page.keyboard.press('e');
const inHall = await roomIs('Back Hall');
await page.waitForTimeout(800);
await page.screenshot({ path: '.shots/rooms-hall.png' });

// Return: in the hallway we spawn facing down the corridor; the shop door is
// behind us, so back up again and step through.
await walk('s', 900);
let returnPrompt = false;
try {
  await page.waitForSelector('.hud-prompt--door', { timeout: 3000 });
  returnPrompt = true;
} catch {
  fail('return-to-shop door prompt never appeared');
}
await page.keyboard.press('e');
const backInShop = await roomIs('Beach Pizza Shop');
await page.screenshot({ path: '.shots/rooms-shop-return.png' });

// Click path: E and door-click are separate code, so cover click-to-enter too.
// Turn ~180° (drag) to face the back-hall door, step toward it, then CLICK the
// mesh (not E) — it should fade us back into the hall.
let clickEnter = false;
if (backInShop) {
  const box = await page.locator('canvas').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(box.x + box.width * 0.78, cy);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.29, cy, { steps: 12 });
  await page.mouse.up();
  await walk('w', 500); // approach so the door fills center-screen
  await page.screenshot({ path: '.shots/rooms-preclick.png' });
  await page.mouse.click(cx, cy); // click the door mesh
  clickEnter = await roomIs('Back Hall');
}

await browser.close();
console.log(
  `rooms: startShop=${startShop} doorPrompt=${doorPrompt} hall=${inHall} ` +
    `returnPrompt=${returnPrompt} backInShop=${backInShop} clickEnter=${clickEnter} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
