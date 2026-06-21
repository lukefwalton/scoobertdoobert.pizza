// Phase 6 deep-pool smoke: the bitter bottom of the water descent — a HEAVY
// (52 MB → 5 MB) GLB level reached by a GLB → GLB hop from the liminal space,
// each masked by the loader minigame. Tours shop → pool → liminal → abandoned
// pool → liminal, asserting BOTH loaders reach ready and the deep room enters.
// (This is the load the minigame was built for.)
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import {
  makeLoaderHelpers,
  roomIs as sharedRoomIs,
  walkToDoor,
  watchPageErrors,
} from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};
watchPageErrors(page, fail);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail, timeout });
// Walk `key` until a door prompts, then E — shared, hold-and-poll with a
// CI-generous timeout (see lib/smoke.mjs). Fails with the hop's name if the
// prompt never appears, so a spawn/door drift points at the broken hop.
const toDoor = (key, label) => walkToDoor(page, fail, key, label);
// Wait out a GLB loader and tap in (shared, resilient: button → Enter fallback
// → confirm the loader dismissed; never throws uncaught). Generous timeout for
// the heavy deep level. See lib/smoke.mjs.
const { enterLoadedLevel } = makeLoaderHelpers(page, fail);
// Drive the descent into the liminal via the gated transition hook (a real
// pendingRoom → loader transition). The surface → pool walk is shoot-rooms'; the
// in-world way down (break the Möbius) is shoot-mobius'; THIS smoke is the heavy
// liminal → DEEP GLB→GLB hop, so we drop into the pool and get into the liminal
// directly rather than walking the whole descent.
const descendToLiminal = () => page.evaluate(() => window.__sdpGoToRoom?.('liminal', 'fromPool'));

await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

// One linear tour, SHORT-CIRCUITED: each step gates the next, so the first
// broken hop fails with its own context and we stop — no 15–25s of follow-on
// "loader never reached ready" noise after a nav regression upstream.
let inLiminal = false;
let deepReady = false;
let inDeep = false;
let backUp = false;

const inPool = await roomIs('The Poolrooms');
// Fail fast if the gated transition hook isn't exposed (a gating regression).
if (inPool && !(await page.evaluate(() => typeof window.__sdpGoToRoom === 'function')))
  fail('__sdpGoToRoom hook not exposed under ?room&debug (gating regression?)');
if (inPool) await descendToLiminal();
if (
  inPool &&
  // pool → liminal, through its loader.
  (await enterLoadedLevel('liminal')) &&
  (inLiminal = await roomIs('Liminal Space'))
) {
  await page.waitForTimeout(600);
  // liminal → DEEP: the -Z "go down to the deep end" door (GLB → GLB), heavy loader.
  if (
    (await toDoor('w', 'the deep-end door')) &&
    (deepReady = await enterLoadedLevel('abandoned pool')) &&
    (inDeep = await roomIs('The Abandoned Pool'))
  ) {
    await page.waitForTimeout(800);
    await page.screenshot({ path: '.shots/deeppool.png' });
    // climb back up to the liminal (deep → liminal; cached → quick).
    if (
      (await toDoor('s', 'the climb-back-up door')) &&
      (await enterLoadedLevel('liminal (return)', 15000))
    ) {
      backUp = await roomIs('Liminal Space');
    }
  }
}

await browser.close();
console.log(
  `deeppool: pool=${inPool} liminal=${inLiminal} deepReady=${deepReady} deep=${inDeep} ` +
    `backUp=${backUp} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
