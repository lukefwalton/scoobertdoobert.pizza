// Capture the 3D world (entered via the ?world debug trigger). Logs page
// console errors + exceptions so shader/WebGL failures surface here.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, ctx, page, fail, finish, failures } = await startSmoke({ deviceScaleFactor: 1 });
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

// The first-run control hint (how to move/look) shows on entry — the FTUE teach the
// welcome card (pure tone) omits. It must clear the instant you move (checked below).
const hintUp = await page.waitForSelector('.hud-controlhint', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (!hintUp) fail('CONTROL HINT MISSING: no move/look legend on world entry');

await page.waitForTimeout(3000); // WebGL warmup + frames
await page.screenshot({ path: '.shots/world.png' });
await page.waitForTimeout(1600);
await page.screenshot({ path: '.shots/world2.png' });

// Walk forward to the window hotspot, interact, then open the pause menu.
await page.keyboard.down('w');
await page.waitForTimeout(2000);
await page.keyboard.up('w');
await page.waitForTimeout(400);
// Moving above should have faded the control hint out — prove it cleared.
const hintGone = await page
  .waitForSelector('.hud-controlhint', { state: 'detached', timeout: 2000 })
  .then(
    () => true,
    () => false,
  );
if (hintUp && !hintGone) fail('CONTROL HINT STUCK: legend did not clear after moving');
else if (hintUp) console.log('control hint shows on entry, clears on move');
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

// DURABLE FIRST-RUN: moving earlier persisted "taught", so re-entering the world (a
// reload) must NOT show the control hint again — it's first-run, not per-entry.
if (hintUp && hintGone) {
  await page.reload({ waitUntil: 'commit' });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 }).catch(() => {});
  await page
    .getByRole('button', { name: /dismiss intro/i })
    .click({ timeout: 3000 })
    .catch(() => {});
  // Watch a settled WINDOW rather than a single post-sleep snapshot: the hint must
  // not reappear at ANY point in this interval, so a late HUD settle on a slow CI
  // runner can't slip a durable-flag regression past a one-shot check. waitForSelector
  // resolving = it came back (regression); timing out = it stayed gone (pass).
  const reappeared = await page.waitForSelector('.hud-controlhint', { timeout: 2500 }).then(
    () => true,
    () => false,
  );
  if (reappeared) fail('CONTROL HINT NOT DURABLE: showed again after moving + reloading');
  else console.log('control hint stays taught across a reload');
}

// NON-DURABLE DISMISS — the OTHER half of the FTUE contract. The move→reload path
// above pins the durable side (moved → taught → stays gone). Closing with the × (or
// letting the ~10s backstop fire) instead only hides the hint THIS visit; it must
// NOT mark the controls "taught", so a fresh visit shows it AGAIN. A regression that
// made × / timeout start persisting would slip right past the durable test, so pin
// it here. A FRESH context = clean localStorage (no "seen" flag from the walk above).
{
  const freshCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await freshCtx.addInitScript(() => {
    try {
      sessionStorage.setItem('sdp_booted', '1');
    } catch {
      /* ignore */
    }
  });
  const p2 = await freshCtx.newPage();
  watchPageErrors(p2, fail);
  await p2.goto(base + '/?world=1', { waitUntil: 'commit' });
  await p2.waitForSelector('.hud-menu-btn', { timeout: 12000 }).catch(() => {});
  // Clear the welcome card first so it can't intercept the click on the hint's ×.
  await p2
    .getByRole('button', { name: /dismiss intro/i })
    .click({ timeout: 3000 })
    .catch(() => {});
  const hint2 = await p2.waitForSelector('.hud-controlhint', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!hint2) {
    fail('CONTROL HINT MISSING (fresh ctx): no legend to test the non-durable dismiss path');
  } else {
    // Close with × (no move / no look) — hides this visit, must NOT teach.
    await p2.getByRole('button', { name: /dismiss controls hint/i }).click({ timeout: 3000 });
    await p2
      .waitForSelector('.hud-controlhint', { state: 'detached', timeout: 2000 })
      .catch(() => {});
    // Reload → because × did not teach, the hint must RETURN.
    await p2.reload({ waitUntil: 'commit' });
    await p2.waitForSelector('.hud-menu-btn', { timeout: 12000 }).catch(() => {});
    await p2
      .getByRole('button', { name: /dismiss intro/i })
      .click({ timeout: 3000 })
      .catch(() => {});
    const returned = await p2.waitForSelector('.hud-controlhint', { timeout: 4000 }).then(
      () => true,
      () => false,
    );
    if (!returned) fail('CONTROL HINT WRONGLY PERSISTED: closing with × (no move) must not teach');
    else
      console.log('control hint returns after × + reload (× hides for the visit, never teaches)');
  }
  await freshCtx.close();
}

await finish(
  'world shots done (no failures).',
  `world shots done with ${failures()} failure(s) — failing.`,
);
