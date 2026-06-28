// Boardwalk-wing smoke: the sweet SoCal SURFACE branch off the shop. Tour:
// shop → out onto the boardwalk → down to the moonlit beach → back → up the park
// path. Proves the new rooms mount, the doors wire both ways (single-key holds,
// no spawn-prompt flash), and — the point of the wing — each room takes over the
// loop voice with its OWN Scoobert song (Room.song), restoring it on the hop to
// the next song-room. Asserts on the quiet `.hud-room` label + the engine's
// active jukebox url, not on animation timing.
import { mkdirSync } from 'node:fs';
import {
  holdUntilDoorPrompt,
  roomIs as sharedRoomIs,
  startSmoke,
  watchPageErrors,
} from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail, finish, failures } = await startSmoke({ deviceScaleFactor: 1 });
watchPageErrors(page, fail);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail, timeout });
// Poll the ENGINE's active loop-voice url (set post-decode by playJukeboxTrack)
// until it carries `slug` — proves the room's song actually took over, not just
// that the room mounted.
const songIs = (slug) =>
  page
    .waitForFunction((s) => (window.__sdpJukeboxUrl ?? '').includes(s), slug, { timeout: 8000 })
    .then(
      () => true,
      () => false,
    );
const noPromptNow = async (where) => {
  await page.waitForTimeout(250);
  if ((await page.$('.hud-prompt--door')) !== null)
    fail(`a door prompt flashed at the ${where} spawn (arrival sits in a door radius)`);
};

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500); // WebGL warmup

// The engine must be ready before a room song can decode + take the loop voice.
const bootReady = await page
  .waitForFunction(() => window.__sdpAudio && window.__sdpAudio.ready === true, null, {
    timeout: 12000,
  })
  .then(
    () => true,
    () => false,
  );
if (!bootReady) fail('boot ambience never decoded — engine not ready');

// 1) Start in the shop; the new boardwalk door is a +X side door, NOT prompting
//    at spawn (you find it by turning from the sea window).
const startShop = await roomIs('Beach Pizza Shop');
const noSpawnPrompt = (await page.$('.hud-prompt--door')) === null;
if (!noSpawnPrompt) fail('a door prompt was visible at the shop spawn');

// 2) Strafe right (+X, facing the window) to the screen door → step out onto the
//    boardwalk. Its namesake track should take over the loop voice.
if (!(await holdUntilDoorPrompt(page, 'd', { timeout: 8000 })))
  fail('boardwalk door prompt never appeared strafing +X');
await page.keyboard.press('e');
const inBoardwalk = await roomIs('The Boardwalk');
await noPromptNow('boardwalk');
const boardwalkSong = await songIs('boardwalk');
if (!boardwalkSong) fail('the boardwalk did not take over the loop voice with "boardwalk"');
await page.screenshot({ path: '.shots/boardwalk.png' });

// 3) Straight down the pier (-Z) to the beach steps → the moonlit beach.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 8000 })))
  fail('beach door prompt never appeared walking -Z');
await page.keyboard.press('e');
const inOcean = await roomIs('Moonlight Beach');
await noPromptNow('oceanview');
const oceanSong = await songIs('ocean-view');
if (!oceanSong) fail('the beach did not take over the loop voice with "ocean-view"');
await page.screenshot({ path: '.shots/boardwalk-ocean.png' });

// 4) Back up the steps (+Z) to the boardwalk — the boardwalk's song must RESUME
//    (the override is temporary; leaving a song-room hands the voice on, and the
//    boardwalk is itself a song-room so its track wins back).
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 8000 })))
  fail('return-to-boardwalk prompt never appeared walking +Z');
await page.keyboard.press('e');
const backBoardwalk = await roomIs('The Boardwalk');
const boardwalkResumes = await songIs('boardwalk');
if (!boardwalkResumes) fail('the boardwalk song did not resume on returning from the beach');

// 5) Strafe left (-X) to the park gate → the park path (its own song).
if (!(await holdUntilDoorPrompt(page, 'a', { timeout: 8000 })))
  fail('park door prompt never appeared strafing -X');
await page.keyboard.press('e');
const inBalboa = await roomIs('Park Path');
await noPromptNow('balboa');
const balboaSong = await songIs('walking-balboa');
if (!balboaSong) fail('the park path did not take over the loop voice with "walking-balboa"');
await page.screenshot({ path: '.shots/boardwalk-balboa.png' });

// 5b) The "play it" beat lives in the park: strike a pizza pan. Clicking a 3D pan
//     through Playwright is camera-fragile, so drive the deterministic strike hook
//     (exposed under ?world); __sdpPans carries the last strike's note.
const panStruck = await page.evaluate(() => {
  if (typeof window.__sdpStrikePan !== 'function') return { err: 'no strike hook' };
  window.__sdpStrikePan(2); // index 2 = the E4 pan
  return window.__sdpPans ?? { err: 'no __sdpPans after strike' };
});
const panOk = !!panStruck && panStruck.note === 'E' && panStruck.octave === 4;
if (!panOk)
  fail(`striking a pizza pan did not register the right note (got ${JSON.stringify(panStruck)})`);

// 6) Exit the world from a song-room (full teardown): leaving must hand the voice
//    back to the boot loop, not strand the park's track playing in the storefront.
let exitClean = false;
await page.keyboard.press('Escape');
try {
  await page.getByRole('button', { name: 'Return to storefront' }).click({ timeout: 4000 });
  await page.waitForSelector('[data-floor="storefront"]', { timeout: 6000 });
  await page.waitForTimeout(300);
  exitClean = (await page.evaluate(() => window.__sdpJukeboxActive)) === false;
  if (!exitClean) fail('a room song stayed playing after exiting the world to the storefront');
} catch (e) {
  fail(`world exit from a song-room failed: ${e.message}`);
}

await ctx.close();
console.log(
  `boardwalk: shop=${startShop} bootReady=${bootReady} noSpawnPrompt=${noSpawnPrompt} ` +
    `boardwalk=${inBoardwalk} boardwalkSong=${boardwalkSong} pan=${panOk} ocean=${inOcean} oceanSong=${oceanSong} ` +
    `backBoardwalk=${backBoardwalk} boardwalkResumes=${boardwalkResumes} balboa=${inBalboa} ` +
    `balboaSong=${balboaSong} exitClean=${exitClean} | errors=${failures()}`,
);
await finish();
