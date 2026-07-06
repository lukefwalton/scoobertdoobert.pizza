// Verifies The Void (虚空) THROUGH ITS REAL ENTRY PATH (repo standard: walk the real
// door edge, not just a ?room= mount). Enters the theremin (The Aerial), walks the
// real theremin-to-void door past the aerial (E → the arrival spawn), renders the
// cosmic screensaver (rippling void floor, drifting ringed planets, starfield)
// without throwing, then walks the one real way back to the aerial. Any shader/
// geometry throw is caught by watchPageErrors. A screenshot is captured for review.
import { mkdirSync } from 'node:fs';
import { roomIs as sharedRoomIs, startSmoke, walkToDoor, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail: bad, timeout });
const toDoor = (key, label, opts) => walkToDoor(page, bad, key, label, opts);

await page.goto(base + '/?room=theremin&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1200);

let inVoid = false;
let backInAerial = false;

// Short-circuit on the first broken hop for a clean, contextual failure.
const inAerial = await roomIs('The Aerial');
if (inAerial) {
  // aerial → void: walk 'w' past the central aerial (no prop collision) to the -Z
  // door. Generous timeout for the walk across the room.
  if (
    (await toDoor('w', 'the door out into the void', { timeout: 12000 })) &&
    (inVoid = await roomIs('The Void'))
  ) {
    await page.waitForTimeout(1800); // shader compiles + the planets settle
    // Dismiss the welcome card robustly (it types over a few seconds on the first
    // world entry) so the establishing shot is clean.
    await page
      .getByRole('button', { name: /dismiss intro/i })
      .click({ timeout: 2000 })
      .catch(() => {});
    await page.click('.hud-welcome__close', { timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(700);
    await page.screenshot({ path: '.shots/void.png' });
    // void → aerial: the one real way back (+Z). 's' backpedals from the spawn.
    if (await toDoor('s', 'the way back to the aerial', { timeout: 8000 })) {
      backInAerial = await roomIs('The Aerial');
    }
  }
}

console.log(
  `void -> aerial=${inAerial} void=${inVoid} backInAerial=${backInAerial} errors=${failures()}`,
);
await finish('\nvoid checks passed.', `\n${failures()} void check(s) FAILED`);
