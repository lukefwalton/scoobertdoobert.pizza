// The Kids Menu ball pit (2000 floor easter egg). Descends storefront → 1999 →
// 2000, opens the Kids Menu, splashes the balls, and backs out. Fails non-zero
// on any page error (the canvas physics loop must not throw).
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { page, fail, finish, failures } = await startSmoke({
  viewport: { width: 1100, height: 850 },
});
watchPageErrors(page, fail);

await page.goto(base + '/', { waitUntil: 'networkidle' });

// Descend to the 2000 floor via the order form + a floor door.
await page.click('#order-form button[type="submit"]');
await page.waitForSelector('[data-floor="y1999"]', { timeout: 8000 });
await page.click('.floor-door--down');
await page.waitForSelector('[data-floor="y2000"]', { timeout: 8000 });

// Open the Kids Menu → the ball pit.
await page.click('.tl__gate .tl__btn:nth-child(1)');
let appeared = false;
try {
  await page.waitForSelector('.ballpit', { timeout: 5000 });
  await page.waitForSelector('.ballpit__canvas', { timeout: 2000 });
  appeared = true;
} catch {
  fail('ball pit did not open from the Kids Menu');
}
await page.waitForTimeout(900); // let the balls drop + settle a bit
await page.screenshot({ path: '.shots/ballpit-1.png' });

// Splash: a few clicks/taps on the canvas must disturb the balls (and not throw).
const boxBp = await page.locator('.ballpit__canvas').boundingBox();
if (boxBp) {
  await page.mouse.click(boxBp.x + boxBp.width * 0.5, boxBp.y + boxBp.height * 0.72);
  await page.mouse.click(boxBp.x + boxBp.width * 0.38, boxBp.y + boxBp.height * 0.6);
  await page.mouse.click(boxBp.x + boxBp.width * 0.64, boxBp.y + boxBp.height * 0.66);
}
await page.waitForTimeout(700);
await page.screenshot({ path: '.shots/ballpit-2.png' });

// Back button returns to the 2000 floor.
await page.click('.ballpit__back');
await page.waitForTimeout(200);
const gone = (await page.$('.ballpit')) === null;
const backOnFloor = (await page.$('[data-floor="y2000"]')) !== null;
if (!gone) fail('back button did not close the ball pit');
if (!backOnFloor) fail('did not return to the 2000 floor after the ball pit');

console.log(
  `ballpit: appeared=${appeared} backClosed=${gone} backOnFloor=${backOnFloor} | errors=${failures()}`,
);
await finish();
