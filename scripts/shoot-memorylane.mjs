// Memory-Lane-wing smoke: the CRT corridor of old-web fragments off the classified
// file room, and the dark server-void ("where the friends live") past it. Drops
// straight into memory lane (?world=1&debug=1 + the __sdpGoToRoom hook), then tours
// memorylane → internet → back → up to classified, all on the Z axis (single-key
// holds). Proves the new rooms mount, the CRT props don't crash the scene, the doors
// wire both ways with no spawn-prompt flash, and each room takes over the loop voice
// with its own song (Room.song).
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

// Enter via ?world=1 (boots the audio engine) + &debug=1 (exposes __sdpGoToRoom).
await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500); // WebGL warmup

const bootReady = await page
  .waitForFunction(() => window.__sdpAudio && window.__sdpAudio.ready === true, null, {
    timeout: 12000,
  })
  .then(
    () => true,
    () => false,
  );
if (!bootReady) fail('boot ambience never decoded — engine not ready');

// Jump to memory lane (the Doors test nav hook). goToRoom hard-blocks while an
// intro modal / entry wipe is up, so POLL: re-fire until the room label flips.
const inMemoryLane = await page
  .waitForFunction(
    () => {
      const go = window.__sdpGoToRoom;
      if (typeof go !== 'function') return false;
      if (document.querySelector('.hud-room')?.textContent?.includes('Memory Lane')) return true;
      go('memorylane', 'default');
      return false;
    },
    null,
    { timeout: 15000, polling: 500 },
  )
  .then(
    () => true,
    () => {
      fail('could not reach memory lane via the test nav hook');
      return false;
    },
  );

// 1) Memory lane: it mounts, its CRT props load without crashing the scene, and
//    "memory-lan" takes the loop voice.
await noPromptNow('memory lane');
const laneSong = await songIs('memory-lan');
if (!laneSong) fail('memory lane did not take over the loop voice with "memory-lan"');
await page.waitForTimeout(600); // let a few props pop in for the shot
await page.screenshot({ path: '.shots/memorylane.png' });

// 2) Follow the cables down the corridor (-Z, forward) → the server-void.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  fail('server-void door prompt never appeared walking -Z down the corridor');
await page.keyboard.press('e');
const inInternet = await roomIs('Where the Friends Live');
await noPromptNow('server-void');
const internetSong = await songIs('all-my-friends-live-on-the-internet');
if (!internetSong) fail('the server-void did not take over the loop voice with its song');
await page.screenshot({ path: '.shots/memorylane-internet.png' });

// 3) Back up the cables (+Z, backward) — "memory-lan" must resume (override is
//    temporary; memory lane is itself a song-room so its track wins back).
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 10000 })))
  fail('return-to-corridor prompt never appeared walking +Z');
await page.keyboard.press('e');
const backLane = await roomIs('Memory Lane');
const laneResumes = await songIs('memory-lan');
if (!laneResumes) fail('memory lane song did not resume on returning from the server-void');

// 4) Back through the hatch (+Z, forward from the -Z end) into the classified room —
//    exercises the real graph edge back to the descent side.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  fail('classified-hatch prompt never appeared walking +Z up the corridor');
await page.keyboard.press('e');
const backClassified = await roomIs('Classified');

await ctx.close();
console.log(
  `memorylane: bootReady=${bootReady} memorylane=${inMemoryLane} laneSong=${laneSong} ` +
    `internet=${inInternet} internetSong=${internetSong} backLane=${backLane} ` +
    `laneResumes=${laneResumes} backClassified=${backClassified} | errors=${failures()}`,
);
await finish();
