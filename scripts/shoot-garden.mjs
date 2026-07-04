// Verifies the GARDEN WING — the botanical garden off the park path, its grotto
// cave, and the bamboo grove past the lion moon-gate — plus the two game-feel
// beats that live there: the JUMP (Space hops the camera) and the TUBE-SLIDE
// RIDE (walk-in mouth → scripted camera ride → points). Walks the REAL door
// edges (balboa→garden, garden⇄grotto, bamboo→garden) so the graph wiring in
// surface.ts is what's exercised, not a debug shortcut; the one hop INTO the
// bamboo grove uses the debug teleport (the edge back is walked for real).
import { mkdirSync } from 'node:fs';
import {
  holdUntilDoorPrompt,
  roomIs as sharedRoomIs,
  startSmoke,
  watchPageErrors,
} from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);
const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail: bad, timeout });

// Jump is LEARNED in the shop (see shoot-skills for the earn-it-cold path); here
// we test the jump MECHANIC, so seed the unlock so Space hops in the park.
await page.addInitScript(() => {
  localStorage.setItem(
    'sdp_progress_v1',
    JSON.stringify({ everEnteredWorld: true, secretsFound: ['jump-unlocked'] }),
  );
});
// Straight into the Park Path (the garden's hub) with the debug hooks on.
await page.goto(base + '/?room=balboa&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500); // WebGL warmup
const startPark = await roomIs('Park Path');

// 1) JUMP (game feel): Space must hop the camera off the eye line and land it
//    back. Real keyboard path — a regression in Controls' hop arc fails here.
const eyeY = await page.evaluate(() => window.__sdpCam?.y ?? 0);
await page.keyboard.down(' ');
const rose = await page
  .waitForFunction((y0) => (window.__sdpCam?.y ?? 0) > y0 + 0.25, eyeY, { timeout: 2000 })
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up(' ');
if (!rose) bad('Space did not hop the camera (jump regression)');
const landed = await page
  .waitForFunction((y0) => Math.abs((window.__sdpCam?.y ?? 0) - y0) < 0.05, eyeY, {
    timeout: 2500,
  })
  .then(
    () => true,
    () => false,
  );
if (!landed) bad('the jump never landed back on the eye line');

// 1b) Space must NOT steal focus from UI: with a HUD control focused, a Space
//     press activates the control (or does nothing) — it must never arm a world
//     hop (the review-flagged edge case). Focus the menu button, press Space,
//     assert the camera did not rise, then close any menu it opened.
await page.evaluate(() => document.querySelector('.hud-menu-btn')?.focus());
const eyeYf = await page.evaluate(() => window.__sdpCam?.y ?? 0);
await page.keyboard.press(' ');
await page.waitForTimeout(400);
const hoppedFromUi = await page.evaluate((y0) => (window.__sdpCam?.y ?? 0) > y0 + 0.25, eyeYf);
if (hoppedFromUi) bad('Space on a focused HUD control armed a world jump (UI Space leaked)');
await page.keyboard.press('Escape').catch(() => {}); // close the pause menu if Space opened it
await page.waitForTimeout(200);
await page.evaluate(() => document.querySelector('canvas')?.focus());

// 2) The REAL balboa→garden edge: strafe straight left into the -X hedge gate
//    (it sits level with the spawn row, like the boardwalk's side gates).
if (!(await holdUntilDoorPrompt(page, 'a', { timeout: 10000 })))
  bad('garden gate prompt never appeared strafing -X from the park path');
await page.keyboard.press('e');
const inGarden = await roomIs('The Botanical Garden');
await page.waitForTimeout(1800); // scene + palms settle
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
await page.waitForTimeout(600);
await page.screenshot({ path: '.shots/garden.png' });

// 3) The frog statue ribbits (deterministic hook; the d20 face proves the roll
//    ran). The hook only exists once the statue actually mounted.
const frog = await page.evaluate(() => {
  if (typeof window.__sdpRibbit !== 'function') return { err: 'no ribbit hook' };
  window.__sdpRibbit();
  return window.__sdpFrog ?? { err: 'no __sdpFrog after ribbit' };
});
const frogOk = !!frog && frog.face >= 1 && frog.face <= 20;
if (!frogOk) bad(`the frog did not ribbit a d20 (got ${JSON.stringify(frog)})`);

// 4) The grotto, through the gap in the north hedge (the REAL edge): strafe -Z
//    along the east path.
if (!(await holdUntilDoorPrompt(page, 'd', { timeout: 10000 })))
  bad('grotto prompt never appeared strafing -Z toward the hedge gap');
await page.keyboard.press('e');
const inGrotto = await roomIs('The Grotto');
await page.waitForTimeout(1600); // the mouth glow + waterfall settle
await page.screenshot({ path: '.shots/grotto.png' });

// …and back out (the return edge: the way out is behind the arrival spawn).
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 10000 })))
  bad('return prompt never appeared backing out of the grotto');
await page.keyboard.press('e');
const backFromGrotto = await roomIs('The Botanical Garden');

// THE SLIDE RIDE is a coin flip: ~half the time it WARPS you into the hidden
// tube warren, the rest it loops you back out with a "care to ride again?" nudge.
// A debug hook forces the outcome so we can drive both branches deterministically.
// Ride the slide, forcing `warp`, and return the run's `warped` flag once it ends.
const rideSlide = async (warp) => {
  await page.waitForFunction(() => typeof window.__sdpRideSlide === 'function', { timeout: 5000 });
  await page.evaluate((w) => window.__sdpForceSlideWarp(w), warp);
  const started = await page.evaluate(() => {
    window.__sdpRideSlide();
    return window.__sdpSlide?.riding === true;
  });
  if (!started) return { started: false, warped: null };
  const h = await page.waitForFunction(
    () =>
      window.__sdpSlide && window.__sdpSlide.riding === false
        ? { w: window.__sdpSlide.warped }
        : null,
    { timeout: 9000 },
  );
  return { started: true, warped: (await h.jsonValue()).w };
};

// 5) LOOP-BACK branch: force no-warp — the ride runs but leaves you in the garden
//    with the "ride again?" toast (not the tubes).
const loop = await rideSlide(false);
if (!loop.started) bad('the tube slide ride did not start (loop-back)');
if (loop.warped !== false) bad('forced loop-back still warped away');
const stillGarden = await roomIs('The Botanical Garden');
if (!stillGarden) bad('loop-back ride left the garden');
const rideAgainToast = await page
  .waitForFunction(
    () => /ride again/i.test(document.querySelector('.hud-toast')?.textContent || ''),
    { timeout: 3000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!rideAgainToast) bad('no "care to ride again?" nudge on the loop-back');
await page.screenshot({ path: '.shots/garden-slide.png' });

// 6) WARP branch: force warp — the ride DROPS you into the hidden tube warren.
const warp = await rideSlide(true);
if (warp.warped !== true) bad('forced warp did not warp');
const inTubes = await roomIs('The Tubes');
await page.waitForTimeout(1500); // the warren + ball pit settle
await page.screenshot({ path: '.shots/tubes.png' });
// crawl back out to the garden (the +Z tube mouth is straight ahead of the spawn).
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  bad('tube-mouth prompt never appeared crawling out of the tubes');
await page.keyboard.press('e');
const backFromTubes = await roomIs('The Botanical Garden');

// 6b) Enter the slide WHILE MID-HOP (the review-flagged edge), forcing loop-back
//     so we stay in the garden to check it: the frozen hop arc must NOT resume
//     and fling the camera (the hop-clear-on-handoff fix).
await page.waitForFunction(() => typeof window.__sdpRideSlide === 'function', { timeout: 5000 });
await page.keyboard.press(' '); // launch a hop
await page.waitForTimeout(120); // now airborne, mid-arc
const midRide = await rideSlide(false);
if (!midRide.started) bad('the mid-hop slide ride did not start');
await page.waitForTimeout(300);
const exitY = await page.evaluate(() => window.__sdpCam?.y ?? 0);
if (exitY > 3.4)
  bad(`camera flung high after a mid-hop ride (y=${exitY.toFixed(2)}) — stale hop arc resumed`);

// 7) The bamboo grove past the lion gate. IN via the debug teleport (one hop),
//    BACK by walking the real bamboo→garden edge.
await page.evaluate(() => window.__sdpGoToRoom?.('bamboo', 'fromGarden'));
const inBamboo = await roomIs('The Bamboo Grove');
await page.waitForTimeout(1600); // culms + the shishi-odoshi settle (klok ~3s in)
await page.screenshot({ path: '.shots/bamboo.png' });
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 10000 })))
  bad('lion-gate prompt never appeared backing out of the bamboo grove');
await page.keyboard.press('e');
const backFromBamboo = await roomIs('The Botanical Garden');

console.log(
  `garden -> park=${startPark} jump=${rose && landed} uiSpace=${!hoppedFromUi} ` +
    `garden=${inGarden} frog=${frogOk} grotto=${inGrotto}/${backFromGrotto} ` +
    `slideLoop=${loop.warped === false && stillGarden && rideAgainToast} ` +
    `slideWarp=${warp.warped === true && inTubes} tubesBack=${backFromTubes} ` +
    `midHopRide=${midRide.started} bamboo=${inBamboo}/${backFromBamboo} errors=${failures()}`,
);

await ctx.close();
await finish('\ngarden checks passed.', `\n${failures()} garden check(s) FAILED`);
