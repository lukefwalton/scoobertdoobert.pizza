// California-wing smoke: the golden-hour coast-road overlook (with the low-poly
// California Tower of Balboa Park) up the park path, and the hazy tidepool
// daydream below it. Jumps straight into the overlook (?world=1&debug=1 +
// __sdpGoToRoom), then tours california → tidepools → back → down to the park,
// all on the Z axis. Proves the new rooms mount, the procedural tower + palm props
// don't crash the scene, the doors wire both ways with no spawn-prompt flash, and
// each room takes over the loop voice with its own song (Room.song).
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

// Jump to the California overlook (the Doors test nav hook). goToRoom hard-blocks
// while an intro modal / entry wipe is up, so POLL: re-fire until the label flips.
const inCalifornia = await page
  .waitForFunction(
    () => {
      const go = window.__sdpGoToRoom;
      if (typeof go !== 'function') return false;
      if (document.querySelector('.hud-room')?.textContent?.includes('I Live in California'))
        return true;
      go('california', 'default');
      return false;
    },
    null,
    { timeout: 15000, polling: 500 },
  )
  .then(
    () => true,
    () => {
      fail('could not reach the California overlook via the test nav hook');
      return false;
    },
  );

// 1) The overlook: it mounts, the tower + palms load without crashing the scene,
//    and "i-live-in-california" takes the loop voice.
await noPromptNow('california');
const calSong = await songIs('i-live-in-california');
if (!calSong) fail('the overlook did not take over the loop voice with "i-live-in-california"');
await page.waitForTimeout(600); // let props pop in for the shot
await page.screenshot({ path: '.shots/california.png' });

// 2) Down to the tidepools (-Z, forward from the -Z-facing spawn).
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  fail('tidepools door prompt never appeared walking -Z down the road');
await page.keyboard.press('e');
const inTidepools = await roomIs('Daydreaming');
await noPromptNow('tidepools');
const tideSong = await songIs('daydreaming');
if (!tideSong) fail('the tidepools did not take over the loop voice with "daydreaming"');
await page.screenshot({ path: '.shots/california-tidepools.png' });

// 3) Back up the coast road (+Z gate of tidepools) — "i-live-in-california" must
//    resume (override is temporary; california is itself a song-room).
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 10000 })))
  fail('return-to-overlook prompt never appeared walking +Z');
await page.keyboard.press('e');
const backCal = await roomIs('I Live in California');
const calResumes = await songIs('i-live-in-california');
if (!calResumes) fail('the overlook song did not resume on returning from the tidepools');

// 4) Back down to the park (-Z gate, forward from the -Z-facing spawn) —
//    exercises the real graph edge to the rest of the surface wing.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  fail('park door prompt never appeared walking -Z up the road');
await page.keyboard.press('e');
const backBalboa = await roomIs('Park Path');

await ctx.close();
console.log(
  `california: bootReady=${bootReady} california=${inCalifornia} calSong=${calSong} ` +
    `tidepools=${inTidepools} tideSong=${tideSong} backCal=${backCal} ` +
    `calResumes=${calResumes} backBalboa=${backBalboa} | errors=${failures()}`,
);
await finish();
