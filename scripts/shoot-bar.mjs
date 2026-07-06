// Verifies Doobert's (the PS1 dive bar) THROUGH ITS REAL ENTRY PATH (repo standard:
// walk the real door edge, not just a ?room= mount). Enters Main Street, walks the
// real mainstreet-to-bar door at the dark far end (E → the arrival spawn), renders
// the procedural bar (bottle wall, dead mirror, neon, stools, string lights, the
// RAY TRACING book) without throwing, then walks the one real way back onto the
// street. Any shader/geometry throw is caught by watchPageErrors. Screenshot saved.
import { mkdirSync } from 'node:fs';
import { roomIs as sharedRoomIs, startSmoke, walkToDoor, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail: bad, timeout });
const toDoor = (key, label, opts) => walkToDoor(page, bad, key, label, opts);

await page.goto(base + '/?room=mainstreet&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1200);

let inBar = false;
let backInStreet = false;

// Short-circuit on the first broken hop for a clean failure with its own context.
const inStreet = await roomIs('Main Street');
if (inStreet) {
  // street → bar: walk 'w' the length of the dark street (spawn faces -Z) to the
  // -Z door at the far end. Generous timeout for the long straight walk.
  if (
    (await toDoor('w', 'the bar at the end of the street', { timeout: 14000 })) &&
    (inBar = await roomIs('Doobert'))
  ) {
    await page.waitForTimeout(1500); // materials compile
    await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.shots/bar.png' });
    // bar → street: the one real way back (+Z). 's' backpedals from the spawn.
    if (await toDoor('s', 'back out onto the street', { timeout: 8000 })) {
      backInStreet = await roomIs('Main Street');
    }
  }
}

console.log(
  `bar -> street=${inStreet} bar=${inBar} backInStreet=${backInStreet} errors=${failures()}`,
);
await finish('\nbar checks passed.', `\n${failures()} bar check(s) FAILED`);
