// Phase 6 dice-music smoke: the d20 beside the jukebox is the CHAOS track selector.
// Drop straight into the jukebox via the deterministic ?room= entrance (the shop →
// hall → jukebox corridor walk is covered by shoot:rooms; THIS smoke is about the
// DICE, and a fixed entry avoids the slow-CI walk-timing flake). Click the die and
// assert it rolled (1..20) + the jukebox jumped, and force the nat 1 / nat 20 crits
// through the ?debug hook.
import { mkdirSync } from 'node:fs';
import { launchSmoke, roomIs as sharedRoomIs, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail, finish, failures } = await launchSmoke();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
watchPageErrors(page, fail);

// Drop straight into the jukebox via ?room=ID (WorldMount enters that room directly).
// `debug` adds &debug=1 to also expose the ?debug-only roll hook. Deterministic — no
// corridor walk, so no slow-CI timing flake. Returns whether we reached the jukebox.
async function enterJukebox(p, { debug }) {
  const roomIs = (name, timeout) => sharedRoomIs(p, name, { fail, timeout });
  await p.goto(base + '/?room=jukebox' + (debug ? '&debug=1' : ''), { waitUntil: 'commit' });
  await p
    .waitForSelector('.hud-menu-btn', { timeout: 12000 })
    .catch((e) => fail(`world did not mount: ${e.message}`));
  await p.waitForTimeout(1000); // let the room settle + its mount effect run
  return roomIs('The Jukebox');
}

const inJuke = await enterJukebox(page, { debug: true });
await page.screenshot({ path: '.shots/dice-before.png' });

// Roll the die: it sits to the right of the cabinet (world ~[2.7,1,-3.4]); from the
// default jukebox spawn it projects to roughly the lower-right of center. Click it
// and confirm a face (1..20) landed and the jukebox jumped to the rolled track.
let rolled = false;
let trackJumped = false;
if (inJuke) {
  const before = await page.evaluate(() => window.__sdpJukebox?.index);
  // Clear the hook FIRST so "roll registered" is edge-triggered: if the click misses
  // the die (e.g. a camera/layout tweak shifted its projection), the wait below fails
  // loudly instead of passing on a stale face value.
  await page.evaluate(() => {
    window.__sdpDice = undefined;
  });
  const box = await page.locator('canvas').boundingBox();
  await page.mouse.click(box.x + box.width * 0.663, box.y + box.height * 0.62);
  rolled = await page
    .waitForFunction(
      () => typeof window.__sdpDice === 'number' && window.__sdpDice >= 1 && window.__sdpDice <= 20,
      null,
      { timeout: 4000 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!rolled)
    fail('clicking the d20 did not register a roll (1..20) — the click may have missed the die');
  if (rolled) {
    const face = await page.evaluate(() => window.__sdpDice);
    // The d20 rolls over the VISIBLE dial (seed + discovered songs — "hidden until
    // found"), so derive the modulus from the live visible-track count. We've
    // discovered nothing entering straight into the jukebox, so visible = the seed.
    const visibleLen = (await page.evaluate(() => window.__sdpJukeboxVisible?.length)) || 1;
    const expected = (face - 1) % visibleLen;
    trackJumped = await page
      .waitForFunction((idx) => window.__sdpJukebox?.index === idx, expected, { timeout: 4000 })
      .then(
        () => true,
        () => false,
      );
    if (!trackJumped) {
      const after = await page.evaluate(() => window.__sdpJukebox?.index);
      fail(
        `roll ${face} did not set the jukebox to the mapped track (expected index ${expected}, before ${before}, after ${after})`,
      );
    }
    await page.waitForTimeout(1300); // let the tumble settle for the shot
    await page.screenshot({ path: '.shots/dice-after.png' });
  }
}

// The CRIT payoffs (DESIGN: "I rolled a 1 and got the cursed one"). The real die is
// random, so drive the nat 20 / nat 1 FACES through the ?debug force-roll hook and
// assert the matching crit is reported (the toast + dice SFX ride along; we assert on
// the deterministic __sdpDiceCrit, not on audio/animation timing).
let critPristine = false;
let critCursed = false;
let noCritOnPlain = false;
let junkIgnored = false;
if (inJuke) {
  const forceFace = async (face, want) => {
    await page.evaluate(() => {
      window.__sdpDiceCrit = undefined;
    });
    const fired = await page.evaluate((f) => {
      if (typeof window.__sdpRollDice !== 'function') return false;
      window.__sdpRollDice(f);
      return true;
    }, face);
    if (!fired) {
      fail(`__sdpRollDice missing — cannot drive the ${want} crit (is this a ?debug run?)`);
      return false;
    }
    return page
      .waitForFunction((w) => window.__sdpDiceCrit === w, want, { timeout: 3000 })
      .then(
        () => true,
        () => false,
      );
  };
  critPristine = await forceFace(20, 'nat20');
  if (!critPristine) fail('forcing a 20 did not land the nat20 (pristine pressing) crit');
  critCursed = await forceFace(1, 'nat1');
  if (!critCursed) fail('forcing a 1 did not land the nat1 (cursed pressing) crit');

  // The other half of the crit contract: a plain face (10) is a real roll but NOT a
  // crit, so it must report __sdpDiceCrit === null (no pristine/cursed flavor fires).
  noCritOnPlain = await forceFace(10, null);
  if (!noCritOnPlain) fail('a non-crit face (10) should report __sdpDiceCrit === null');

  // Negative guard — lock in __sdpRollDice's input validation: a junk "face" (0, >20,
  // a float, a negative) must be IGNORED, never driving a roll. Park a sentinel on the
  // crit signal, fire the junk faces, and assert it survives — a leaked roll would
  // overwrite it (face 21 → a valid index) or throw on tracks[-1].slug (watchPageErrors
  // catches that). So an unchanged sentinel proves every junk face was a no-op.
  await page.evaluate(() => {
    window.__sdpDiceCrit = 'sentinel';
  });
  await page.evaluate(() => [0, 21, 3.5, -1].forEach((f) => window.__sdpRollDice?.(f)));
  await page.waitForTimeout(150);
  const afterJunk = await page.evaluate(() => window.__sdpDiceCrit);
  junkIgnored = afterJunk === 'sentinel';
  if (!junkIgnored)
    fail(`a junk d20 face was not ignored (__sdpDiceCrit=${JSON.stringify(afterJunk)})`);

  await page.screenshot({ path: '.shots/dice-crit.png' });
}

// The crit is REAL AUDIO now (the "per-track curdle variant"): the engine's live
// curdle insert mirrors itself to __sdpCurdle whenever it re-scores. Force each
// outcome and assert the insert actually follows — cursed engages the warble
// (wet > 0.3 once that exact track is the live voice), pristine locks it OFF and
// rate-corrects the baked tape slow-down (rate > 1), a plain roll clears it, and
// LEAVING THE ROOM clears it through the real unmount cleanup (__sdpGoToRoom).
let curdleCursed = false;
let curdlePristine = false;
let curdlePlainClear = false;
let curdleExitClear = false;
if (inJuke) {
  const curdleIs = (pred, label) =>
    page.waitForFunction(pred, null, { timeout: 6000 }).then(
      () => true,
      async () => {
        const s = await page.evaluate(() => JSON.stringify(window.__sdpCurdle));
        fail(`${label} (curdle=${s})`);
        return false;
      },
    );

  await page.evaluate(() => window.__sdpRollDice?.(1));
  curdleCursed = await curdleIs(
    () => window.__sdpCurdle?.pressing === 'cursed' && window.__sdpCurdle.wet > 0.3,
    'nat 1 did not engage the CURSED curdle on the live voice',
  );

  await page.evaluate(() => window.__sdpRollDice?.(20));
  curdlePristine = await curdleIs(
    () =>
      window.__sdpCurdle?.pressing === 'pristine' &&
      window.__sdpCurdle.wet === 0 &&
      window.__sdpCurdle.rate > 1,
    'nat 20 did not lock the curdle off + rate-correct (PRISTINE)',
  );

  await page.evaluate(() => window.__sdpRollDice?.(10));
  curdlePlainClear = await curdleIs(
    () => window.__sdpCurdle?.pressing === null && window.__sdpCurdle.wet === 0,
    'a plain roll did not clear the pressing',
  );

  // Re-arm cursed, then walk out the REAL way (the debug room-jump drives the same
  // unmount cleanup a door does): the pressing must not follow the player out.
  await page.evaluate(() => window.__sdpRollDice?.(1));
  const rearmed = await curdleIs(
    () => window.__sdpCurdle?.pressing === 'cursed',
    'could not re-arm cursed before the exit check',
  );
  if (rearmed) {
    await page.evaluate(() => window.__sdpGoToRoom?.('hallway'));
    curdleExitClear = await curdleIs(
      () => window.__sdpCurdle?.pressing === null,
      'leaving the jukebox room did not clear the cursed pressing',
    );
  }
}

// Containment, end-to-end and FLAKE-FREE: the ?debug roll hook must never leak into
// a real, non-debug session — even with the jukebox fully MOUNTED. Enter the SAME
// room the deterministic ?room= way but WITHOUT &debug=1, confirm via the visible HUD
// label (not a test hook) that the jukebox is genuinely live, then assert every __sdp*
// hook is absent. __sdpRollDice is double-gated (isDebugEntrance + exposeTestGlobal)
// and the read hooks ride exposeTestGlobal (isTestEntrance); ?room is neither, so ALL
// must be undefined. This re-proves at RUNTIME — not only via the isDebugEntrance unit
// — that a room mount can't attach the action hook in production. It's the determin-
// istic replacement for the old corridor-walk containment (that WALK, not the
// assertion, was the CI flake); ?room entry makes the check cheap and stable.
let contained = false;
{
  const cleanCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const clean = await cleanCtx.newPage();
  watchPageErrors(clean, fail);
  await clean.goto(base + '/?room=jukebox', { waitUntil: 'commit' });
  await clean
    .waitForSelector('.hud-menu-btn', { timeout: 12000 })
    .catch((e) => fail(`non-debug world did not mount: ${e.message}`));
  const cleanJuke = await sharedRoomIs(clean, 'The Jukebox', { fail });
  if (cleanJuke) {
    // Assert ABSENCE with a bounded POLL, not one guessed delay: watch for any __sdp*
    // hook to appear for up to 1.5s. A future leak would attach a beat after the room
    // label (the ?world block proves that timing) — so polling catches a leak whenever
    // it surfaces in the window and FAILS FAST, while a clean window confirms
    // containment without being pinned to a single mount-delay guess.
    const leaked = await clean
      .waitForFunction(
        () =>
          typeof window.__sdpRollDice !== 'undefined' ||
          typeof window.__sdpDice !== 'undefined' ||
          typeof window.__sdpJukebox !== 'undefined',
        null,
        { timeout: 1500 },
      )
      .then(
        () => true,
        () => false,
      );
    contained = !leaked;
    if (leaked) {
      const types = await clean.evaluate(() => ({
        roll: typeof window.__sdpRollDice,
        dice: typeof window.__sdpDice,
        juke: typeof window.__sdpJukebox,
      }));
      fail(`__sdp* hooks leaked into a non-debug ?room=jukebox session: ${JSON.stringify(types)}`);
    }
  }
  await cleanCtx.close();
}

// The OTHER half of the gate, also deterministic: under a TEST entrance that is NOT
// debug (?room=jukebox&world=1 — isTestEntrance true, isDebugEntrance false), the
// READ hooks SHOULD appear (so a curious ?world visitor can inspect state) but the
// ACTION hook __sdpRollDice must STILL be absent (it's the stricter isDebugEntrance
// gate, like __sdpGoToRoom). This proves the action hook keys off debug, not merely
// any test entrance — the exact ?world=1 path the corridor walk used to cover, now
// without the walk. So a regression that widened the action gate to isTestEntrance
// would redden here even though the plain-?room check above stays green.
let worldGated = false;
{
  const wctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const wp = await wctx.newPage();
  watchPageErrors(wp, fail);
  await wp.goto(base + '/?room=jukebox&world=1', { waitUntil: 'commit' });
  await wp
    .waitForSelector('.hud-menu-btn', { timeout: 12000 })
    .catch((e) => fail(`?world jukebox did not mount: ${e.message}`));
  const wJuke = await sharedRoomIs(wp, 'The Jukebox', { fail });
  if (wJuke) {
    // WAIT for the read hook to appear — the jukebox exposes __sdpJukebox in its
    // play effect a tick AFTER the room label renders, so reading it immediately
    // races (the one-off flake). Once it's up, the test entrance is proven live.
    const readShown = await wp
      .waitForFunction(() => typeof window.__sdpJukebox === 'object', null, { timeout: 5000 })
      .then(
        () => true,
        () => false,
      );
    // The action hook is isDebugEntrance-gated, so under ?world it never mounts at
    // all (the effect returns early) — checking once, after the read hook is up, is
    // race-free: it can't appear later.
    const rollType = await wp.evaluate(() => typeof window.__sdpRollDice);
    worldGated = readShown && rollType === 'undefined';
    if (!worldGated)
      fail(`?world gate wrong (read hook present=${readShown}; action hook type=${rollType})`);
  }
  await wctx.close();
}

console.log(
  `dice: juke=${inJuke} rolled=${rolled} trackJumped=${trackJumped} pristine=${critPristine} cursed=${critCursed} plainNoCrit=${noCritOnPlain} junkIgnored=${junkIgnored} ` +
    `curdleCursed=${curdleCursed} curdlePristine=${curdlePristine} curdlePlainClear=${curdlePlainClear} curdleExitClear=${curdleExitClear} contained=${contained} worldGated=${worldGated} | errors=${failures()}`,
);
await finish();
