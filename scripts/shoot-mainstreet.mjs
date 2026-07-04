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

// 3) Back out onto the street (the +X return door is behind the arrival spawn).
//    (The direct Main St → North Park door is graph-validated in rooms.test; the
//    natural return loop is via the diner's kitchen — see that smoke.)
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 10000 })))
  bad('return prompt never appeared backing out of the diner');
await page.keyboard.press('e');
const backMain = await roomIs('Main Street');

console.log(
  `mainstreet -> np=${startStreet} main=${inMain} diner=${inDiner} ` +
    `backMain=${backMain} errors=${failures()}`,
);

await ctx.close();
await finish('\nmainstreet checks passed.', `\n${failures()} mainstreet check(s) FAILED`);
