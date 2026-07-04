// Verifies THE JUMPING TURTLE — the defunct all-ages venue off North Park.
// Walks the REAL northpark→turtle edge, proves the left-behind drum kit still
// plays (the reused DrumKit's strike hook only exists once the kit mounted),
// pokes the BROKEN CRT (buzz + one soft flicker, never a picture), walks up to
// the mic where the stage was (the ghost-cheer memory beat + its durable
// objective), and walks back out — both directions of the edge.
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

await page.goto(base + '/?room=northpark&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);
const startStreet = await roomIs('North Park');

// 0) THE GATE (the gag): jump is LOCKED until you enter the Jumping Turtle. In
//    North Park, before ever setting foot in the venue, Space must do NOTHING.
const streetY = await page.evaluate(() => window.__sdpCam?.y ?? 0);
await page.keyboard.down(' ');
const hoppedLocked = await page
  .waitForFunction((y0) => (window.__sdpCam?.y ?? 0) > y0 + 0.25, streetY, { timeout: 1200 })
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up(' ');
const gateHeld = !hoppedLocked;
if (!gateHeld) bad('jump worked BEFORE the Jumping Turtle — the unlock gate is open');

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

// 3b) THE PAYOFF: now that you've entered the Turtle, jump is UNLOCKED — Space
//     must hop the camera (the same key that did nothing on the street).
const venueY = await page.evaluate(() => window.__sdpCam?.y ?? 0);
await page.keyboard.down(' ');
const hoppedUnlocked = await page
  .waitForFunction((y0) => (window.__sdpCam?.y ?? 0) > y0 + 0.25, venueY, { timeout: 2000 })
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up(' ');
if (!hoppedUnlocked) bad('jump did not work AFTER entering the Jumping Turtle (unlock failed)');
// settle back down before the walk to the mic
await page
  .waitForFunction((y0) => Math.abs((window.__sdpCam?.y ?? 0) - y0) < 0.05, venueY, {
    timeout: 2500,
  })
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
  `turtle -> street=${startStreet} jumpGate=${gateHeld} venue=${inVenue} ` +
    `jumpUnlocked=${hoppedUnlocked} drums=${drumOk} crt=${crt !== null} ` +
    `cheer=${cheered} back=${backOut} errors=${failures()}`,
);

await ctx.close();
await finish('\nturtle checks passed.', `\n${failures()} turtle check(s) FAILED`);
