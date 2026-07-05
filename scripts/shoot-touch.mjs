// Touch-controls smoke: proves the 3D world — previously desktop-only — is
// actually WALKABLE on a phone. Enters via the ?world debug trigger in a small
// TOUCH viewport (so useTouchDevice() is true and TouchControls mounts), then:
//   1. the on-screen stick + context button render,
//   2. pushing the stick forward moves the camera (the whole point),
//   3. the ☰ menu button opens the pause menu (the always-reachable nav).
// Driven with page.mouse over the controls — they use React pointer events, which
// fire for a mouse pointer too, so the DOM→input bridge is exercised regardless.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail, finish, failures } = await startSmoke({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 1,
});
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
  } catch {
    /* ignore */
  }
});
watchPageErrors(page, fail);

await page.goto(base + '/?world=1', { waitUntil: 'commit' });

// The world + the touch HUD must both mount on a phone.
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`WORLD DID NOT MOUNT ON TOUCH: ${e.message}`);
}
const stick = await page.waitForSelector('.touch-stick', { timeout: 6000 }).then(
  () => true,
  () => false,
);
if (!stick) fail('TOUCH HUD MISSING: the on-screen stick did not render on a phone viewport');
const actionBtn = (await page.$('.touch-btn--action')) !== null;
if (!actionBtn) fail('TOUCH HUD MISSING: the context action button did not render');

// Clear the welcome card so nothing overlays the controls, then let WebGL warm up.
const welcomeUp = await page.waitForSelector('.hud-welcome', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (welcomeUp) {
  await page
    .getByRole('button', { name: /dismiss intro/i })
    .click({ timeout: 3000 })
    .catch(() => {});
}
await page.waitForTimeout(2500);
await page.screenshot({ path: '.shots/touch-world.png' });

// VIEWPORT: the touch HUD (fixed, inset:0, safe-area insets) must never push the
// page wider than the screen — a horizontal scrollbar on a phone is the classic
// mobile regression. Check portrait now, and landscape below.
const hOverflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const portraitOverflow = await hOverflow(page);
if (portraitOverflow > 1) {
  fail(`VIEWPORT: horizontal overflow with the touch HUD up (portrait, ${portraitOverflow}px)`);
}

// Push the stick FORWARD (up = negative screen-y) and hold — the camera should
// travel. __sdpCam is exposed under the ?world test entrance.
let walked = false;
if (stick) {
  const box = await page.$eval('.touch-stick', (el) => {
    const r = el.getBoundingClientRect();
    return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
  });
  const camBefore = await page.evaluate(() => window.__sdpCam);
  await page.mouse.move(box.cx, box.cy);
  await page.mouse.down();
  await page.mouse.move(box.cx, box.cy - 44, { steps: 6 }); // full-forward push
  await page.waitForTimeout(1400);
  const camMid = await page.evaluate(() => window.__sdpCam);
  await page.mouse.up();
  if (camBefore && camMid) {
    const moved = Math.hypot(camMid.x - camBefore.x, camMid.z - camBefore.z);
    walked = moved > 0.1;
    if (!walked)
      fail(
        `STICK DID NOT WALK: camera barely moved (${moved.toFixed(3)}) ${JSON.stringify(camBefore)} → ${JSON.stringify(camMid)}`,
      );
  } else {
    fail('STICK WALK: __sdpCam not exposed (test entrance regression?)');
  }
  // Releasing the stick must STOP the camera (the reset zeroed the vector). Let
  // the pointerup propagate first — reading the pose in the same tick as up()
  // can catch one last in-flight movement frame and flake the strict threshold.
  await page.waitForTimeout(350);
  const camA = await page.evaluate(() => window.__sdpCam);
  await page.waitForTimeout(600);
  const camB = await page.evaluate(() => window.__sdpCam);
  if (camA && camB && Math.hypot(camB.x - camA.x, camB.z - camA.z) > 0.05) {
    fail('STICK DID NOT STOP: camera kept drifting after the stick was released');
  }
  await page.screenshot({ path: '.shots/touch-world-walked.png' });
}

// VIEWPORT (landscape): rotate to a short, wide phone and confirm the HUD still
// fits with no horizontal overflow — the stick + action cluster must not spill.
await page.setViewportSize({ width: 844, height: 390 });
await page.waitForTimeout(400);
const landscapeOverflow = await hOverflow(page);
if (landscapeOverflow > 1) {
  fail(`VIEWPORT: horizontal overflow with the touch HUD up (landscape, ${landscapeOverflow}px)`);
}
const stickInLandscape = (await page.$('.touch-stick')) !== null;
if (!stickInLandscape) fail('VIEWPORT: the touch stick vanished in landscape');
await page.screenshot({ path: '.shots/touch-landscape.png' });
await page.setViewportSize({ width: 390, height: 844 }); // back to portrait for the pause check

// The ☰ menu button opens the pause menu — the always-reachable nav on a phone.
await page.click('.hud-menu-btn');
const paused = await page.waitForSelector('.hud-pause', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (!paused) fail('MENU BUTTON: tapping ☰ did not open the pause menu');
// The touch controls must hide while paused (they mean nothing under the menu).
const stickGone = (await page.$('.touch-stick')) === null;
if (!stickGone) fail('TOUCH HUD: the stick stayed visible under the pause menu');
await page.screenshot({ path: '.shots/touch-pause.png' });

console.log(
  `touch: stick=${stick} action=${actionBtn} walked=${walked} paused=${paused} ` +
    `stickHidesOnPause=${stickGone} overflow(portrait=${portraitOverflow},landscape=${landscapeOverflow}) | errors=${failures()}`,
);
await finish('touch controls smoke passed.', `touch controls smoke: ${failures()} failure(s).`);
