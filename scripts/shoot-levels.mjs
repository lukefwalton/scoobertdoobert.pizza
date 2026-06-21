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
import { tapLoaderCta } from './lib/smoke.mjs';

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
// Drive the descent into the liminal via the gated transition hook — a real
// pendingRoom → wipe → waterfall → loader transition, exactly like a door. The
// in-world way down (break the Möbius corridor) is exercised by shoot-mobius;
// this smoke is about the LOADER + waterfall, so we trigger the transition
// directly from the pool rather than walking the deep graph each round-trip.
const descendToLiminal = (page) =>
  page.evaluate(() => window.__sdpGoToRoom?.('liminal', 'fromPool'));

// ── happy path: pool → liminal (via the loader) → pool ───────────────────────
let inPool = false;
let loaderShown = false;
let frozenUnderLoader = false;
let loaderReady = false;
let waterfallOnDescent = false;
let noWaterfallOnAscent = false;
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

  // Warp into the pool (the underwater lobby). The surface → jukebox → pool walk
  // is covered by shoot-rooms; this smoke is about the LOADER + waterfall.
  await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'commit' });
  try {
    await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
  } catch (e) {
    fail(`world did not mount: ${e.message}`);
  }
  await page.waitForTimeout(1500);

  inPool = await roomIs(page, 'The Poolrooms');
  await page.screenshot({ path: '.shots/levels-pool.png' });

  // Fail fast if the gated transition hook isn't exposed (a gating regression),
  // so it surfaces here instead of as a later loader/room timeout.
  if (!(await page.evaluate(() => typeof window.__sdpGoToRoom === 'function')))
    fail('__sdpGoToRoom hook not exposed under ?room&debug (gating regression?)');

  // Descend into the liminal (a GLB level → raises the waterfall + loader).
  await descendToLiminal(page);

  // The descent rides a WATERFALL: the rushing-water overlay fires during the
  // wipe down into liminal (brief, before the loader covers it).
  waterfallOnDescent = await page
    .waitForSelector('.hud-waterfall--on', { timeout: 1500 })
    .then(() => true, () => false);
  if (!waterfallOnDescent) fail('waterfall did not play on the descent into liminal');

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
    // button, else Enter — never throws uncaught (CI flake); fail keeps CTA coverage
    await tapLoaderCta(page, /TAP TO ENTER/i, { fail, label: 'liminal' });
    inLiminal = await roomIs(page, 'Liminal Space');
    // The overlay must actually go away on enter (not just the room label flip).
    overlayGoneOnEnter = await page
      .waitForFunction(() => document.querySelector('[data-level-loader]') === null, null, { timeout: 4000 })
      .then(() => true, () => false);
    if (!overlayGoneOnEnter) fail('loader overlay did not disappear after TAP TO ENTER');
    await page.waitForTimeout(600);
    await page.screenshot({ path: '.shots/levels-liminal.png' });
  }

  // After entering, input is live again: walk back to the +Z door → up to the
  // pool. The waterfall is descent-ONLY, so leaving liminal must NOT play it.
  if (inLiminal) {
    await page.keyboard.down('s'); // exit door behind us (+Z)
    const exitPrompt = await page
      .waitForSelector('.hud-prompt--door', { timeout: 3500 })
      .then(() => true, () => false);
    await page.keyboard.up('s');
    if (!exitPrompt) fail('liminal exit door prompt never appeared (ascent not exercised)');
    await page.keyboard.press('e');
    // Poll across the ascent transition: the waterfall must never turn on.
    let sawWaterfall = false;
    for (let i = 0; i < 12; i++) {
      if (await page.$('.hud-waterfall--on')) {
        sawWaterfall = true;
        break;
      }
      await page.waitForTimeout(40);
    }
    noWaterfallOnAscent = !sawWaterfall;
    if (sawWaterfall) fail('waterfall played while LEAVING liminal (should be descent-only)');
    backToPool = await roomIs(page, 'The Poolrooms');
  }

  // ── cached RE-ENTRY: pool → liminal AGAIN. On a revisit useGLTF resolves
  //    synchronously, so GlbRoom mounts in the same commit the room changes.
  //    Regression for the ready/reset race: the loader must STILL reach the
  //    ready state (not get stranded at ready=false) and let us back in.
  if (backToPool) {
    // Re-enter the liminal (cached useGLTF) via the same transition hook.
    await descendToLiminal(page); // → liminal again (cached)
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
      await tapLoaderCta(page, /TAP TO ENTER/i, { fail, label: 'liminal (cached)' });
      reEnter = await roomIs(page, 'Liminal Space');
    }
  }
  await ctx.close();
}

// ── failure path: GLB 404 → error boundary → loader TURN BACK → bounce out ───
let errLoader = false;
let bouncedBack = false;
let overlayGoneOnAbort = false;
let retryRecovered = false;
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  // The forced 404 logs a console error (expected) — don't count it as a failure.
  page.on('pageerror', (e) => fail(`error-path pageerror: ${e.message}`));
  await page.route('**/models/liminal-other-space.glb', (route) =>
    route.fulfill({ status: 404, body: 'not found' }),
  );
  await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'commit' });
  try {
    await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
    await page.waitForTimeout(1500);
    await roomIs(page, 'The Poolrooms');
    await descendToLiminal(page); // → liminal (the GLB 404s)

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
      // Enter triggers onAbort in the error state too; fail asserts the control is present
      await tapLoaderCta(page, /TURN BACK/i, { fail, label: 'liminal (error)' });
      bouncedBack = await roomIs(page, 'The Poolrooms');
      if (!bouncedBack) fail('TURN BACK did not bounce the player out of the failed level');
      // The overlay must clear once we're back in a non-GLB room.
      overlayGoneOnAbort = await page
        .waitForFunction(() => document.querySelector('[data-level-loader]') === null, null, { timeout: 4000 })
        .then(() => true, () => false);
      if (!overlayGoneOnAbort) fail('loader overlay did not disappear after TURN BACK');

      // ── in-session RETRY after a TRANSIENT failure. The error path cleared the
      //    poisoned useGLTF cache, so once the asset is reachable again, re-entering
      //    the room in the SAME tab should now load (no page reload required).
      await page.unroute('**/models/liminal-other-space.glb'); // the hiccup passes
      await descendToLiminal(page); // → liminal, retry
      retryRecovered = await page
        .waitForFunction(
          () =>
            document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') === 'ready',
          null,
          { timeout: 12000 },
        )
        .then(() => true, () => false);
      if (!retryRecovered)
        fail('a transient GLB failure stayed poisoned — re-entry did not recover in-session');
    }
  } catch (e) {
    fail(`error-path check failed: ${e.message}`);
  }
  await ctx.close();
}

await browser.close();
console.log(
  `levels: pool=${inPool} loaderShown=${loaderShown} frozen=${frozenUnderLoader} ` +
    `ready=${loaderReady} waterfallDown=${waterfallOnDescent} noWaterfallUp=${noWaterfallOnAscent} ` +
    `liminal=${inLiminal} overlayGoneOnEnter=${overlayGoneOnEnter} backToPool=${backToPool} ` +
    `reReady=${reReady} reEnter=${reEnter} errLoader=${errLoader} bouncedBack=${bouncedBack} ` +
    `overlayGoneOnAbort=${overlayGoneOnAbort} retryRecovered=${retryRecovered} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
