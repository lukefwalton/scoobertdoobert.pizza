// Verifies THE JUMPING TURTLE — the defunct all-ages venue off North Park.
// Walks the REAL northpark→turtle edge, proves the left-behind drum kit still
// plays (the reused DrumKit's strike hook only exists once the kit mounted),
// pokes the BROKEN CRT (buzz + one soft flicker, never a picture), LEARNS THE
// DOUBLE-JUMP upgrade off the stage orb and proves it reaches higher than a
// single hop, walks up to the mic (the ghost-cheer memory beat), and walks back
// out — both directions of the edge.
//
// Jump itself is learned in the SHOP (see shoot-skills), so we seed jump-unlocked
// here (you'd arrive already able to hop) and let the venue grant the upgrade.
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

// Poll the live camera Y for `ms` and return the highest it reached — the peak of
// whatever jump we drove. (Date.now is fine here; this is a node smoke, not the app.)
const samplePeak = async (ms) => {
  const end = Date.now() + ms;
  let peak = 0;
  while (Date.now() < end) {
    const y = await page.evaluate(() => window.__sdpCam?.y ?? 0);
    if (y > peak) peak = y;
    await page.waitForTimeout(30);
  }
  return peak;
};

// Arrive already able to jump (the shop teaches that); the venue grants DOUBLE jump.
await page.addInitScript(() => {
  localStorage.setItem(
    'sdp_progress_v1',
    JSON.stringify({ everEnteredWorld: true, secretsFound: ['jump-unlocked'] }),
  );
});

await page.goto(base + '/?room=northpark&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);
const startStreet = await roomIs('North Park');

// 1) The REAL edge in: strafe -X down the block to the dark doorway.
if (!(await holdUntilDoorPrompt(page, 'a', { timeout: 10000 })))
  bad('venue door prompt never appeared strafing -X up the block');
await page.keyboard.press('e');
const inVenue = await roomIs('The Jumping Turtle');
await page.waitForTimeout(1800); // the dark settles, the sign reads
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/turtle.png' });

// 2) The kit on the stage still plays — the strike hook only exists once the
//    reused DrumKit actually mounted in THIS room.
const drum = await page.evaluate(() => {
  if (typeof window.__sdpHitDrum !== 'function') return { err: 'no drum hook (kit not mounted?)' };
  window.__sdpHitDrum(0);
  return window.__sdpDrum ?? { err: 'no __sdpDrum after hit' };
});
const drumOk = !!drum && typeof drum.label === 'string' && !drum.err;
if (!drumOk) bad(`the stage drum kit did not play (got ${JSON.stringify(drum)})`);

// 3) The broken CRT: poke it — it buzzes + flickers but must NEVER open the
//    TV modal (this is the one set that doesn't play).
const crt = await page.evaluate(() => {
  if (typeof window.__sdpPokeCrt !== 'function') return null;
  window.__sdpPokeCrt();
  return window.__sdpCrtPokes ?? null;
});
if (crt === null) bad('no broken-CRT hook (the set did not mount?)');
await page.waitForTimeout(600); // let the flicker pulse run
if ((await page.$('.tv-modal, .hud-tv')) !== null)
  bad('the BROKEN CRT opened a TV modal — it must never play');

// 3b) THE UPGRADE: single-hop peak first (double not learned yet), then LEARN the
//     double-jump off the stage orb and prove a mid-air second press goes HIGHER.
await page.keyboard.down(' '); // a ground hop (bunny-hops while held)
const singlePeak = await samplePeak(850);
await page.keyboard.up(' ');
await page
  .waitForFunction(() => (window.__sdpCam?.y ?? 0) < 2.5, { timeout: 2500 })
  .catch(() => {}); // settle

const learnedDouble = await page.evaluate(() => {
  const fn = window['__sdpLearn:doublejump'];
  if (typeof fn !== 'function') return false;
  fn();
  try {
    return (
      JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || []
    ).includes('doublejump-unlocked');
  } catch {
    return false;
  }
});
if (!learnedDouble) bad('did not learn DOUBLE JUMP off the stage orb');

// Sample across the WHOLE double-jump sequence (both apexes). Use held down/up
// with an 80ms hold so a frame reliably sees Space (a bare press() can fire
// down+up between frames and never register); a gap between them resets the
// rising-edge latch so the second press counts as the mid-air double.
const dblPromise = samplePeak(1200);
await page.keyboard.down(' ');
await page.waitForTimeout(80);
await page.keyboard.up(' '); // ground jump
await page.waitForTimeout(230); // rise toward apex, airborne
await page.keyboard.down(' ');
await page.waitForTimeout(80);
await page.keyboard.up(' '); // the mid-air second hop → the double
const doublePeak = await dblPromise;
const doubleHigher = doublePeak > singlePeak + 0.25;
if (!doubleHigher)
  bad(
    `double jump did not clear the single hop (single ${singlePeak.toFixed(2)} / double ${doublePeak.toFixed(2)})`,
  );
await page
  .waitForFunction(() => (window.__sdpCam?.y ?? 0) < 2.5, { timeout: 2500 })
  .catch(() => {});

// 4) Step up to the mic where the stage was: walking forward from the entry
//    spawn runs straight down the hall into the memory trigger.
await page.keyboard.down('w');
const cheered = await page
  .waitForFunction(() => window.__sdpTurtle?.cheered === true, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up('w');
if (!cheered) bad('walking to the mic never triggered the ghost cheer');
await page.screenshot({ path: '.shots/turtle-stage.png' });

// 5) Back out to the street (the return edge is behind you from the stage).
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 12000 })))
  bad('street door prompt never appeared backing out of the venue');
await page.keyboard.press('e');
const backOut = await roomIs('North Park');

console.log(
  `turtle -> street=${startStreet} venue=${inVenue} drums=${drumOk} crt=${crt !== null} ` +
    `double=${learnedDouble}/${doubleHigher} (s${singlePeak.toFixed(2)}/d${doublePeak.toFixed(2)}) ` +
    `cheer=${cheered} back=${backOut} errors=${failures()}`,
);

await ctx.close();
await finish('\nturtle checks passed.', `\n${failures()} turtle check(s) FAILED`);
