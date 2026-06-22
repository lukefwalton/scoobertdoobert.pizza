// Phase 6 level smoke: the levels BELOW the shop — the procedural poolrooms and
// the GLB-backed Liminal Space. The loader MINIGAME was removed (loads are fast
// enough that it broke flow), so GLB levels now AUTO-ENTER: a brief calm loading
// panel, then you're in. Tours shop → poolrooms → liminal (auto-enter) → poolrooms,
// and separately drives the FAILURE path (GLB 404) to prove the error boundary +
// the TURN BACK recovery bounce you back out instead of trapping you.
//
// Asserts on the quiet `.hud-room` label + the loader's data-loader-state, not on
// animation timing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { roomIs as sharedRoomIs, tapLoaderCta, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};

const roomIs = (page, name, timeout) => sharedRoomIs(page, name, { fail, timeout });
const overlayGone = (page, timeout = 15000) =>
  page
    .waitForFunction(() => document.querySelector('[data-level-loader]') === null, null, {
      timeout,
    })
    .then(
      () => true,
      () => false,
    );
// Drive the descent into the liminal via the gated transition hook — a real
// pendingRoom → wipe → waterfall → load transition, exactly like a door. The
// in-world way down (break the Möbius corridor) is exercised by shoot-mobius.
const descendToLiminal = (page) =>
  page.evaluate(() => window.__sdpGoToRoom?.('liminal', 'fromPool'));

// ── happy path: pool → liminal (auto-enter) → pool ───────────────────────────
let inPool;
let waterfallOnDescent;
let noWaterfallOnAscent = false;
// No `= false` init: both are assigned UNCONDITIONALLY below before any read, so
// an initializer would be a dead store (eslint no-useless-assignment). The vars
// above/below that keep `= false` are only reassigned inside `if` blocks.
let inLiminal;
let autoEntered;
let backToPool = false;
let reEnter = false;
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  watchPageErrors(page, fail);

  await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'commit' });
  try {
    await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
  } catch (e) {
    fail(`world did not mount: ${e.message}`);
  }
  await page.waitForTimeout(1500);

  inPool = await roomIs(page, 'The Poolrooms');
  await page.screenshot({ path: '.shots/levels-pool.png' });

  if (!(await page.evaluate(() => typeof window.__sdpGoToRoom === 'function')))
    fail('__sdpGoToRoom hook not exposed under ?room&debug (gating regression?)');

  // Descend into the liminal (a GLB level → raises the waterfall, then auto-enters).
  await descendToLiminal(page);

  // The descent rides a WATERFALL overlay during the wipe down.
  waterfallOnDescent = await page.waitForSelector('.hud-waterfall--on', { timeout: 1500 }).then(
    () => true,
    () => false,
  );
  if (!waterfallOnDescent) fail('waterfall did not play on the descent into liminal');

  // No minigame, no tap: the level should AUTO-ENTER — the loader overlay clears the
  // instant the GLB resolves, and we land in the Liminal Space.
  autoEntered = await overlayGone(page, 20000);
  if (!autoEntered) fail('the GLB level never auto-entered (loader overlay never cleared)');
  inLiminal = await roomIs(page, 'Liminal Space');
  await page.waitForTimeout(500);
  await page.screenshot({ path: '.shots/levels-liminal.png' });

  // Input is live (auto-entered): walk back to the +Z door → up to the pool. The
  // waterfall is descent-ONLY, so leaving liminal must NOT play it.
  if (inLiminal) {
    await page.keyboard.down('s');
    const exitPrompt = await page.waitForSelector('.hud-prompt--door', { timeout: 4000 }).then(
      () => true,
      () => false,
    );
    await page.keyboard.up('s');
    if (!exitPrompt) fail('liminal exit door prompt never appeared (ascent not exercised)');
    await page.keyboard.press('e');
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

  // ── cached RE-ENTRY: on a revisit useGLTF resolves synchronously, so GlbRoom
  //    mounts in the same commit — the level must STILL auto-enter (regression for
  //    the ready/reset race), not strand us on a loader that never clears.
  if (backToPool) {
    await descendToLiminal(page);
    if (!(await overlayGone(page, 12000)))
      fail('cached re-entry stranded the loader (never auto-entered on revisit)');
    reEnter = await roomIs(page, 'Liminal Space');
  }
  await ctx.close();
}

// ── failure path: GLB 404 → error boundary → TURN BACK → bounce out ──────────
let errLoader = false;
let errBtnFocused = false;
let bouncedBack = false;
let overlayGoneOnAbort = false;
let retryRecovered = false;
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
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

    // The loader should flip to the error state and offer TURN BACK (the one overlay
    // that survives — a broken asset must never trap the player).
    errLoader = await page
      .waitForFunction(
        () =>
          document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') ===
          'error',
        null,
        { timeout: 12000 },
      )
      .then(
        () => true,
        () => false,
      );
    if (!errLoader) fail('a failed GLB load did not surface the loader error/TURN BACK state');
    await page.screenshot({ path: '.shots/levels-loader-error.png' });

    if (errLoader) {
      // a11y: the recovery button must TAKE FOCUS when the error overlay shows, so a
      // broken load is escapable by keyboard alone (a focused native button activates
      // on Enter/Space) and a screen reader lands on the way out — not mouse-only.
      errBtnFocused = await page.evaluate(
        () => document.activeElement?.textContent?.includes('Turn back') ?? false,
      );
      if (!errBtnFocused)
        fail(
          'TURN BACK never took focus — keyboard-only recovery from a failed load would regress',
        );
      await tapLoaderCta(page, /TURN BACK/i, { fail, label: 'liminal (error)' });
      bouncedBack = await roomIs(page, 'The Poolrooms');
      if (!bouncedBack) fail('TURN BACK did not bounce the player out of the failed level');
      overlayGoneOnAbort = await overlayGone(page, 4000);
      if (!overlayGoneOnAbort) fail('loader overlay did not disappear after TURN BACK');

      // In-session RETRY after a TRANSIENT failure: the error path cleared the
      // poisoned useGLTF cache, so once the asset is reachable the room auto-enters.
      await page.unroute('**/models/liminal-other-space.glb');
      await descendToLiminal(page);
      retryRecovered = (await overlayGone(page, 15000)) && (await roomIs(page, 'Liminal Space'));
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
  `levels: pool=${inPool} waterfallDown=${waterfallOnDescent} autoEntered=${autoEntered} ` +
    `liminal=${inLiminal} noWaterfallUp=${noWaterfallOnAscent} backToPool=${backToPool} ` +
    `reEnter=${reEnter} errLoader=${errLoader} errBtnFocused=${errBtnFocused} bouncedBack=${bouncedBack} ` +
    `overlayGoneOnAbort=${overlayGoneOnAbort} retryRecovered=${retryRecovered} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
