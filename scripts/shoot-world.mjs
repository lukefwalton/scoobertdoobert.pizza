// Capture the 3D world (entered via the ?world debug trigger). Logs page
// console errors + exceptions so shader/WebGL failures surface here.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail, finish, failures } = await startSmoke({ deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
  } catch {
    /* ignore */
  }
});
watchPageErrors(page, fail);

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
// Positive assertion: the world actually mounted (don't trust a quiet page).
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`WORLD DID NOT MOUNT: ${e.message}`);
}

// The intro "×" dismiss path (it otherwise only auto-clears, so a broken close
// could slip through). Click it BEFORE the ~1.9s auto-dismiss kicks in and prove
// the welcome card actually leaves (the click → 600ms → unmount).
const welcomeUp = await page.waitForSelector('.hud-welcome', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (welcomeUp) {
  await page.getByRole('button', { name: /dismiss intro/i }).click({ timeout: 3000 });
  const dismissed = await page
    .waitForSelector('.hud-welcome', { state: 'detached', timeout: 2000 })
    .then(
      () => true,
      () => false,
    );
  if (!dismissed) {
    fail('INTRO × DID NOT DISMISS: welcome card stayed after clicking close');
  } else {
    console.log('intro × dismisses the welcome card');
  }
}

await page.waitForTimeout(3000); // WebGL warmup + frames
await page.screenshot({ path: '.shots/world.png' });
await page.waitForTimeout(1600);
await page.screenshot({ path: '.shots/world2.png' });

// Walk forward to the window hotspot, interact, then open the pause menu.
await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
await page.waitForTimeout(400);
await page.screenshot({ path: '.shots/world-hotspot.png' });
await page.keyboard.press('e');
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/world-dialog.png' });
await page.keyboard.press('Escape'); // close dialog
await page.waitForTimeout(200);
await page.keyboard.press('Escape'); // open pause menu
await page.waitForTimeout(400);
await page.screenshot({ path: '.shots/world-pause.png' });

// Assert the pause menu is truly modal: movement keys must not move the camera.
const camBefore = await page.evaluate(() => window.__sdpCam);
await page.keyboard.down('w');
await page.waitForTimeout(800);
await page.keyboard.up('w');
const camAfter = await page.evaluate(() => window.__sdpCam);
if (
  camBefore &&
  camAfter &&
  (Math.abs(camBefore.x - camAfter.x) > 0.02 || Math.abs(camBefore.z - camAfter.z) > 0.02)
) {
  fail(
    `PAUSE NOT MODAL: camera moved while paused ${JSON.stringify(camBefore)} ${JSON.stringify(camAfter)}`,
  );
} else {
  console.log('pause is modal (camera frozen while paused)');
}

await finish(
  'world shots done (no page errors).',
  `world shots done with ${failures()} page error(s) — failing.`,
);
