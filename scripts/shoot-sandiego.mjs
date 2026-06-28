// San-Diego-wing smoke: the San Diego Zoo (low-poly flamingo flock) off the Balboa
// Park overlook, and the North Park dusk street under the NORTH PARK sign with its
// drinkable beers. Jumps into the zoo (?world=1&debug=1 + __sdpGoToRoom), dismisses
// the intro for clean shots, then tours zoo → northpark → back → up to california.
// Proves the rooms mount, the flamingos + sign + beers load without crashing the
// scene, the doors wire both ways with no spawn-prompt flash, each room takes its
// song (Room.song), AND the "too many beers → blurry" gag fires (via __sdpDrinkBeer
// / __sdpTipsy debug hooks).
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

await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const bootReady = await page
  .waitForFunction(() => window.__sdpAudio && window.__sdpAudio.ready === true, null, {
    timeout: 12000,
  })
  .then(
    () => true,
    () => false,
  );
if (!bootReady) fail('boot ambience never decoded — engine not ready');

// Jump to the zoo.
const inZoo = await page
  .waitForFunction(
    () => {
      const go = window.__sdpGoToRoom;
      if (typeof go !== 'function') return false;
      if (document.querySelector('.hud-room')?.textContent?.includes('San Diego Zoo')) return true;
      go('zoo', 'default');
      return false;
    },
    null,
    { timeout: 15000, polling: 500 },
  )
  .then(
    () => true,
    () => {
      fail('could not reach the zoo via the test nav hook');
      return false;
    },
  );

// 1) The zoo: it mounts, the flamingo flock loads without crashing, and
//    "my-friend-scoobert" takes the loop voice.
await noPromptNow('zoo');
const zooSong = await songIs('my-friend-scoobert');
if (!zooSong) fail('the zoo did not take over the loop voice with "my-friend-scoobert"');
// dismiss the intro for a clean flock shot
const close = await page.$('.hud-welcome__close');
if (close) await close.click();
await page.waitForTimeout(900);
await page.screenshot({ path: '.shots/sd-zoo.png' });

// 2) Out the gate into North Park (-Z, forward from the -Z-facing spawn).
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  fail('North Park door prompt never appeared walking -Z out of the zoo');
await page.keyboard.press('e');
const inNP = await roomIs('North Park');
await noPromptNow('north park');
const npSong = await songIs('velma-what-a-night');
if (!npSong) fail('North Park did not take over the loop voice with "velma-what-a-night"');
await page.screenshot({ path: '.shots/sd-northpark.png' });

// 3) The beer gag: force three drinks via the debug hook; the screen should go
//    blurry (tipsyStore.blurry === true, mirrored to __sdpTipsy).
const beersOk = await page
  .evaluate(() => typeof window.__sdpDrinkBeer === 'function')
  .catch(() => false);
if (!beersOk) fail('__sdpDrinkBeer hook missing in North Park');
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => window.__sdpDrinkBeer && window.__sdpDrinkBeer());
  await page.waitForTimeout(120);
}
const gotTipsy = await page
  .waitForFunction(() => window.__sdpTipsy === true, null, { timeout: 3000 })
  .then(
    () => true,
    () => false,
  );
if (!gotTipsy) fail('drinking 3 beers did not trigger the blurry "tipsy" state');
await page.waitForTimeout(400);
await page.screenshot({ path: '.shots/sd-tipsy.png' });

// 4) Back to the zoo (+Z) — "my-friend-scoobert" must resume (override is temporary).
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 10000 })))
  fail('return-to-zoo prompt never appeared walking +Z');
await page.keyboard.press('e');
const backZoo = await roomIs('The San Diego Zoo');
const zooResumes = await songIs('my-friend-scoobert');
if (!zooResumes) fail('the zoo song did not resume on returning from North Park');
// leaving North Park should have sobered us up (per-visit reset) — but the hook is
// gone with the room, so just assert the room flip happened above.

// 5) Up to the California overlook (+Z, forward from the +Z-facing fromNorthPark
//    spawn) — exercises the real graph edge to the rest of the surface.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  fail('overlook door prompt never appeared walking +Z out of the zoo');
await page.keyboard.press('e');
const backCal = await roomIs('I Live in California');

await ctx.close();
console.log(
  `sandiego: bootReady=${bootReady} zoo=${inZoo} zooSong=${zooSong} northpark=${inNP} ` +
    `npSong=${npSong} tipsy=${gotTipsy} backZoo=${backZoo} zooResumes=${zooResumes} ` +
    `backCal=${backCal} | errors=${failures()}`,
);
await finish();
