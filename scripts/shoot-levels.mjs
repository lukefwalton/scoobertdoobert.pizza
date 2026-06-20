// Phase 6 level smoke: the levels BELOW the shop — the procedural poolrooms and
// the GLB-backed Liminal Space behind the loader minigame. Tours
// shop → poolrooms → (loader) → liminal → poolrooms, and separately drives the
// FAILURE path (GLB 404) to prove the error boundary + loader recovery bounce
// you back out instead of trapping you on a loader that never turns ready.
//
// Asserts on the quiet `.hud-room` label + the loader's data-loader-state, not on
// animation timing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};

const roomIs = (page, name, timeout = 8000) =>
  page
    .waitForFunction(
      (n) => document.querySelector('.hud-room')?.textContent?.includes(n) ?? false,
      name,
      { timeout },
    )
    .then(
      () => true,
      () => (fail(`room never became "${name}"`), false),
    );
const walk = async (page, key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};
const toDoor = async (page, key) => {
  // Walk in `key` until a door prompt shows, then E. Returns whether it prompted.
  await page.keyboard.down(key);
  let ok = false;
  try {
    await page.waitForSelector('.hud-prompt--door', { timeout: 3500 });
    ok = true;
  } catch {
    /* asserted by the caller */
  }
  await page.keyboard.up(key);
  if (ok) await page.keyboard.press('e');
  return ok;
};

// ── happy path: shop → poolrooms → liminal (via the loader) → poolrooms ──────
let startShop = false;
let inPool = false;
let loaderShown = false;
let frozenUnderLoader = false;
let loaderReady = false;
let inLiminal = false;
let overlayGoneOnEnter = false;
let backToPool = false;
let reReady = false;
let reEnter = false;
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') fail(`console: ${m.text()}`);
  });

  await page.goto(base + '/?world=1', { waitUntil: 'commit' });
  try {
    await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
  } catch (e) {
    fail(`world did not mount: ${e.message}`);
  }
  await page.waitForTimeout(1500);

  startShop = await roomIs(page, 'Beach Pizza Shop');

  // Shop spawn faces the window (-Z); the pool door is in the +X wall → strafe D.
  const pooled = await toDoor(page, 'd');
  if (!pooled) fail('pool door prompt never appeared (strafing +X to the stairwell)');
  inPool = await roomIs(page, 'The Poolrooms');
  await page.screenshot({ path: '.shots/levels-pool.png' });

  // Pool spawn faces -Z; the "go deeper" door is in the far (-Z) wall → walk W.
  // This door's target is a GLB level, so stepping through raises the loader.
  await page.keyboard.down('w');
  let deepPrompt = false;
  try {
    await page.waitForSelector('.hud-prompt--door', { timeout: 3500 });
    deepPrompt = true;
  } catch {
    fail('"go deeper" door prompt never appeared');
  }
  await page.keyboard.up('w');
  if (deepPrompt) await page.keyboard.press('e');

  // The loader minigame should appear (DOM overlay over the suspended canvas).
  try {
    await page.waitForSelector('[data-level-loader]', { timeout: 6000 });
    loaderShown = true;
  } catch {
    fail('the level loader minigame never appeared for the GLB level');
  }
  await page.screenshot({ path: '.shots/levels-loader.png' });

  // Input must be FROZEN under the loader: pressing W cannot drift the camera.
  if (loaderShown) {
    const z0 = (await page.evaluate(() => window.__sdpCam?.z)) ?? 0;
    await walk(page, 'w', 500);
    const z1 = (await page.evaluate(() => window.__sdpCam?.z)) ?? 0;
    frozenUnderLoader = Math.abs(z1 - z0) < 0.05;
    if (!frozenUnderLoader)
      fail(`camera moved under the loader overlay (z ${z0.toFixed(2)} -> ${z1.toFixed(2)})`);
  }

  // GlbRoom mounts post-load and flips ready → the loader offers TAP TO ENTER.
  loaderReady = await page
    .waitForFunction(
      () => document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') === 'ready',
      null,
      { timeout: 15000 },
    )
    .then(() => true, () => false);
  if (!loaderReady) fail('the GLB never loaded — loader never reached the ready/TAP-TO-ENTER state');

  if (loaderReady) {
    await page.getByRole('button', { name: /TAP TO ENTER/i }).click({ timeout: 4000 });
    inLiminal = await roomIs(page, 'Liminal Space');
    // The overlay must actually go away on enter (not just the room label flip).
    overlayGoneOnEnter = await page
      .waitForFunction(() => document.querySelector('[data-level-loader]') === null, null, { timeout: 4000 })
      .then(() => true, () => false);
    if (!overlayGoneOnEnter) fail('loader overlay did not disappear after TAP TO ENTER');
    await page.waitForTimeout(600);
    await page.screenshot({ path: '.shots/levels-liminal.png' });
  }

  // After entering, input is live again: walk back to the +Z door → up to the pool.
  if (inLiminal) {
    const backed = await toDoor(page, 's'); // door behind us (+Z) → press S
    if (!backed) fail('liminal exit door prompt never appeared');
    backToPool = await roomIs(page, 'The Poolrooms');
  }

  // ── cached RE-ENTRY: pool → liminal AGAIN. On a revisit useGLTF resolves
  //    synchronously, so GlbRoom mounts in the same commit the room changes.
  //    Regression for the ready/reset race: the loader must STILL reach the
  //    ready state (not get stranded at ready=false) and let us back in.
  if (backToPool) {
    // Arrived via the 'fromLiminal' spawn (z=-5, facing +Z), so the deep door is
    // now BEHIND us at -Z → walk S to reach it again.
    await page.keyboard.down('s');
    await page.waitForSelector('.hud-prompt--door', { timeout: 3500 }).catch(() => {});
    await page.keyboard.up('s');
    await page.keyboard.press('e'); // → liminal again (cached)
    reReady = await page
      .waitForFunction(
        () =>
          document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') === 'ready',
        null,
        { timeout: 10000 },
      )
      .then(() => true, () => false);
    if (!reReady) fail('cached re-entry left the loader stranded (ready never flipped on revisit)');
    if (reReady) {
      await page.getByRole('button', { name: /TAP TO ENTER/i }).click({ timeout: 4000 });
      reEnter = await roomIs(page, 'Liminal Space');
    }
  }
  await ctx.close();
}

// ── failure path: GLB 404 → error boundary → loader TURN BACK → bounce out ───
let errLoader = false;
let bouncedBack = false;
let overlayGoneOnAbort = false;
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  // The forced 404 logs a console error (expected) — don't count it as a failure.
  page.on('pageerror', (e) => fail(`error-path pageerror: ${e.message}`));
  await page.route('**/models/liminal-other-space.glb', (route) =>
    route.fulfill({ status: 404, body: 'not found' }),
  );
  await page.goto(base + '/?world=1', { waitUntil: 'commit' });
  try {
    await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
    await page.waitForTimeout(1500);
    await roomIs(page, 'Beach Pizza Shop');
    await toDoor(page, 'd'); // → poolrooms
    await roomIs(page, 'The Poolrooms');
    await page.keyboard.down('w');
    await page.waitForSelector('.hud-prompt--door', { timeout: 3500 }).catch(() => {});
    await page.keyboard.up('w');
    await page.keyboard.press('e'); // → liminal (the GLB 404s)

    // The loader should flip to the error state and offer TURN BACK.
    errLoader = await page
      .waitForFunction(
        () =>
          document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') === 'error',
        null,
        { timeout: 12000 },
      )
      .then(() => true, () => false);
    if (!errLoader) fail('a failed GLB load did not surface the loader error/TURN BACK state');
    await page.screenshot({ path: '.shots/levels-loader-error.png' });

    if (errLoader) {
      await page.getByRole('button', { name: /TURN BACK/i }).click({ timeout: 4000 });
      bouncedBack = await roomIs(page, 'The Poolrooms');
      if (!bouncedBack) fail('TURN BACK did not bounce the player out of the failed level');
      // The overlay must clear once we're back in a non-GLB room.
      overlayGoneOnAbort = await page
        .waitForFunction(() => document.querySelector('[data-level-loader]') === null, null, { timeout: 4000 })
        .then(() => true, () => false);
      if (!overlayGoneOnAbort) fail('loader overlay did not disappear after TURN BACK');
    }
  } catch (e) {
    fail(`error-path check failed: ${e.message}`);
  }
  await ctx.close();
}

await browser.close();
console.log(
  `levels: shop=${startShop} pool=${inPool} loaderShown=${loaderShown} frozen=${frozenUnderLoader} ` +
    `ready=${loaderReady} liminal=${inLiminal} overlayGoneOnEnter=${overlayGoneOnEnter} backToPool=${backToPool} ` +
    `reReady=${reReady} reEnter=${reEnter} errLoader=${errLoader} bouncedBack=${bouncedBack} ` +
    `overlayGoneOnAbort=${overlayGoneOnAbort} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
