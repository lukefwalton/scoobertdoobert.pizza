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

// 5) THE SLIDE RIDE (deterministic hook — the walk-in trigger is the same
//    startRide the hook calls). The ride must take over, run its course, and
//    end with the ride counted; input is frozen while riding. The hook is
//    (re)registered in TubeSlide's mount effect, which flushes AFTER the room
//    label flips on the way back from the grotto — wait for it, don't race it.
const hookReady = await page
  .waitForFunction(() => typeof window.__sdpRideSlide === 'function', { timeout: 5000 })
  .then(
    () => true,
    () => false,
  );
const rideStarted =
  hookReady &&
  (await page.evaluate(() => {
    window.__sdpRideSlide();
    return window.__sdpSlide?.riding === true;
  }));
if (!rideStarted) bad('the tube slide ride did not start (no hook / not riding)');
const rideDone = await page
  .waitForFunction(
    () => window.__sdpSlide && window.__sdpSlide.riding === false && window.__sdpSlide.rides >= 1,
    {
      timeout: 9000,
    },
  )
  .then(
    () => true,
    () => false,
  );
if (!rideDone) bad('the tube slide ride never finished (rides did not count)');
await page.screenshot({ path: '.shots/garden-slide.png' });

// 6) The bamboo grove past the lion gate. IN via the debug teleport (one hop),
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
  `garden -> park=${startPark} jump=${rose && landed} garden=${inGarden} frog=${frogOk} ` +
    `grotto=${inGrotto}/${backFromGrotto} slide=${rideDone} bamboo=${inBamboo}/${backFromBamboo} ` +
    `errors=${failures()}`,
);

await ctx.close();
await finish('\ngarden checks passed.', `\n${failures()} garden check(s) FAILED`);
