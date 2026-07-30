// Verifies THE GALLERIA — the fake-sky indoor mall that bridges Main Street's
// two times of day. Walks the REAL door edges (mainstreetday→galleria→mainstreet
// night, and back in), so the surface.ts graph wiring is what's exercised, and
// screenshots the painted-sky promenade.
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

await page.goto(base + '/?room=mainstreetday&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page
  .waitForFunction(() => window.__sdpRoom === 'mainstreetday', { timeout: 15000 })
  .catch(() => bad('world controls never came live on the day street'));
await roomIs('Main Street');
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});

// A wide ceiling, not a sleep — holds release the instant the prompt shows
// (see shoot-mainstreet.mjs for why walk budgets are generous on CI).
const WALK = 45000;

// 1) Day street → the galleria: spawn faces +X into the street; the mall
//    entrance is on the +X wall at z=5 (forward + strafe right, which is +Z
//    when facing +X — the same d+w the northpark→mainstreet hop uses).
if (!(await holdUntilDoorPrompt(page, ['w', 'd'], { timeout: WALK })))
  bad('galleria prompt never appeared heading +X off the day street');
await page.keyboard.press('e');
await roomIs('The Galleria');
await page.waitForTimeout(1200); // the golden hour settles
await page.screenshot({ path: '.shots/galleria.png' });

// 2) Down the promenade to the -Z night door: arriving from day faces -Z
//    already and the door is dead ahead — straight forward the length of the
//    hall (props don't collide, so the fountain isn't an obstacle).
if (!(await holdUntilDoorPrompt(page, ['w'], { timeout: WALK })))
  bad('night-door prompt never appeared down the promenade');
await page.keyboard.press('e');
await roomIs('Main Street');
// Both street variants are titled "Main Street" — prove the far door landed in
// the NIGHT room specifically (the whole point of the bridge).
const isNight = await page
  .waitForFunction(() => window.__sdpRoom === 'mainstreet', { timeout: 4000 })
  .then(
    () => true,
    () => false,
  );
if (!isNight) bad('the galleria night door did not land in mainstreet (the night variant)');
await page.waitForTimeout(900);
await page.screenshot({ path: '.shots/galleria-night-exit.png' });

// 3) …and the night street can walk back IN (the same building at this hour):
//    the fromGalleria spawn faces -X into the street with the entrance straight
//    behind it, so back up into the doorway.
if (!(await holdUntilDoorPrompt(page, ['s'], { timeout: WALK })))
  bad('galleria prompt never re-appeared from the night street');
await page.keyboard.press('e');
await roomIs('The Galleria');

console.log(`galleria -> day-entry + night-exit + night-re-entry, errors=${failures()}`);
await ctx.close();
await finish('\ngalleria checks passed.', `\n${failures()} galleria check(s) FAILED`);
