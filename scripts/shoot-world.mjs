// Capture the 3D world (entered via the ?world debug trigger). Logs page
// console errors + exceptions so shader/WebGL failures surface here.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
  } catch {
    /* ignore */
  }
});
const page = await ctx.newPage();
let errors = 0;
page.on('console', (m) => {
  if (m.type() === 'error') {
    errors++;
    console.log('PAGE ERR:', m.text());
  }
});
page.on('pageerror', (e) => {
  errors++;
  console.log('PAGE EXC:', e.message);
});

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
// Positive assertion: the world actually mounted (don't trust a quiet page).
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  errors++;
  console.log('WORLD DID NOT MOUNT:', e.message);
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
  errors++;
  console.log('PAUSE NOT MODAL: camera moved while paused', camBefore, camAfter);
} else {
  console.log('pause is modal (camera frozen while paused)');
}

await browser.close();
if (errors) {
  console.error(`world shots done with ${errors} page error(s) — failing.`);
  process.exit(1);
}
console.log('world shots done (no page errors).');
