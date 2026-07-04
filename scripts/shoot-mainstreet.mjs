// Verifies the MAIN STREET wing off North Park — the liminal small-town street
// and the all-night diner with the watching animal heads. Walks the REAL door
// edges (northpark→mainstreet→diner and back out), so the graph wiring in
// surface.ts is what's exercised, and screenshots both rooms.
import { mkdirSync } from 'node:fs';
import {
  holdUntilDoorPrompt,
  roomIs as sharedRoomIs,
  startSmoke,
  watchPageErrors,
} from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);
const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail: bad, timeout });

await page.goto(base + '/?room=northpark&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);
const startStreet = await roomIs('North Park');

// 1) North Park → Main Street: the +X edge at z≈-2 (forward + strafe right).
if (!(await holdUntilDoorPrompt(page, ['d', 'w'], { timeout: 10000 })))
  bad('main-street prompt never appeared heading +X off North Park');
await page.keyboard.press('e');
const inMain = await roomIs('Main Street');
await page.waitForTimeout(1600); // the night settles, the caution light blinks
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/mainstreet.png' });

// 2) Main Street → the diner: the -X doorway (the only lit thing), forward-left.
if (!(await holdUntilDoorPrompt(page, ['a', 'w'], { timeout: 10000 })))
  bad('diner prompt never appeared heading -X down Main Street');
await page.keyboard.press('e');
const inDiner = await roomIs('The All-Night Diner');
await page.waitForTimeout(1600); // the heads settle into their watch
await page.screenshot({ path: '.shots/diner.png' });

// 3) THE LIMINAL LOOP: through the diner's -Z swing door into the kitchen…
if (!(await holdUntilDoorPrompt(page, ['w', 'd'], { timeout: 10000 })))
  bad('kitchen prompt never appeared heading -X/-Z behind the counter');
await page.keyboard.press('e');
const inKitchen = await roomIs('The Kitchen');

// 4) …and OUT the kitchen's back door (-Z), which lets out onto Main Street in
//    BROAD DAYLIGHT — the day/night flip (same title, but the day variant; a
//    fresh screenshot proves the palette shifted). Graph-validated in rooms.test
//    as targeting `mainstreetday` specifically.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  bad('back-door prompt never appeared walking -Z across the kitchen');
await page.keyboard.press('e');
const inDay = await roomIs('Main Street');
// Both variants are titled "Main Street" — prove it's the DAY room specifically
// (not that the back door accidentally looped to the night street).
const isDayRoom = await page
  .waitForFunction(() => window.__sdpRoom === 'mainstreetday', { timeout: 4000 })
  .then(
    () => true,
    () => false,
  );
if (!isDayRoom) bad('kitchen back door did not land in mainstreetday (the day variant)');
await page.waitForTimeout(1600); // the noon haze settles
await page.screenshot({ path: '.shots/mainstreet-day.png' });

console.log(
  `mainstreet -> np=${startStreet} main=${inMain} diner=${inDiner} ` +
    `kitchen=${inKitchen} dayFlip=${inDay && isDayRoom} errors=${failures()}`,
);

await ctx.close();
await finish('\nmainstreet checks passed.', `\n${failures()} mainstreet check(s) FAILED`);
