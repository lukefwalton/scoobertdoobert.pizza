// Verifies The Waiting Room (待合室) THROUGH ITS REAL ENTRY PATH (repo standard:
// walk the real door edge, not just a ?room= mount). Loads the deeppool GLB, walks
// the real deep-to-waiting maintenance door at the far deep end (E → the arrival
// spawn/orientation), renders the procedural lobby (chairs, reception window, dead
// CRT, signs, the flickering panel) without throwing, then walks the one real way
// back (waiting-to-deep, under the EXIT sign). Any shader/geometry throw is caught
// by watchPageErrors. A screenshot is captured for visual review.
import { mkdirSync } from 'node:fs';
import {
  makeLoaderHelpers,
  roomIs as sharedRoomIs,
  startSmoke,
  walkToDoor,
  watchPageErrors,
} from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail: bad, timeout });
const toDoor = (key, label, opts) => walkToDoor(page, bad, key, label, opts);
const { enterLoadedLevel } = makeLoaderHelpers(page, bad);

// Enter the drained deep end directly (its own GLB load), then take the REAL
// maintenance door into the waiting room — the standards-required real edge.
await page.goto(base + '/?room=deeppool&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}

let inDeep = false;
let inWaiting = false;
let backInDeep = false;

// Short-circuit on the first broken hop, so a nav/spawn regression fails with its
// own context instead of cascading "never reached" noise.
if ((await enterLoadedLevel('abandoned pool')) && (inDeep = await roomIs('The Abandoned Pool'))) {
  await page.waitForTimeout(700);
  // deep → waiting: walk 'w' (spawn faces -Z) to the -Z "待合室" door; procedural
  // target, no loader. Generous timeout for the long walk across the GLB basin.
  if (
    (await toDoor('w', 'the 待合室 maintenance door', { timeout: 12000 })) &&
    (inWaiting = await roomIs('The Waiting Room'))
  ) {
    await page.waitForTimeout(1800); // materials compile + the panel flicker starts
    await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
    await page.waitForTimeout(500);
    await page.screenshot({ path: '.shots/waitingroom.png' });
    // waiting → deep: the one real way back, under the EXIT sign (+Z). 's' backpedals
    // from the spawn to the door. The deeppool GLB reloads (cached → quick).
    if (
      (await toDoor('s', 'the EXIT door back to the deep end', { timeout: 8000 })) &&
      (await enterLoadedLevel('abandoned pool (return)', 15000))
    ) {
      backInDeep = await roomIs('The Abandoned Pool');
    }
  }
}

console.log(
  `waitingroom -> deep=${inDeep} waiting=${inWaiting} backInDeep=${backInDeep} errors=${failures()}`,
);
await finish('\nwaitingroom checks passed.', `\n${failures()} waitingroom check(s) FAILED`);
