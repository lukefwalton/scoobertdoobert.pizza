// Moonlight-wing smoke: the moonlit dance plaza off the +X end of the boardwalk,
// and the bright "best day ever" morning past it. Jumps straight into the plaza
// (?world=1&debug=1 + the __sdpGoToRoom hook), then tours moonlight → bestday →
// back → out to the boardwalk. Proves the new rooms mount, their props load
// without crashing the scene, the doors wire both ways with no spawn-prompt flash,
// and each room takes over the loop voice with its own song (Room.song).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { holdUntilDoorPrompt, roomIs as sharedRoomIs, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};
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

// Jump to the moonlight plaza (the Doors test nav hook). goToRoom hard-blocks
// while an intro modal / entry wipe is up, so POLL: re-fire until the label flips.
const inMoonlight = await page
  .waitForFunction(
    () => {
      const go = window.__sdpGoToRoom;
      if (typeof go !== 'function') return false;
      if (document.querySelector('.hud-room')?.textContent?.includes('Moonlight Plaza'))
        return true;
      go('moonlight', 'default');
      return false;
    },
    null,
    { timeout: 15000, polling: 500 },
  )
  .then(
    () => true,
    () => {
      fail('could not reach the moonlight plaza via the test nav hook');
      return false;
    },
  );

// 1) The plaza: it mounts, its props load without crashing the scene, and
//    "dancing-in-the-moonlight" takes the loop voice.
await noPromptNow('moonlight plaza');
const moonSong = await songIs('dancing-in-the-moonlight');
if (!moonSong) fail('the plaza did not take over the loop voice with "dancing-in-the-moonlight"');
await page.waitForTimeout(600); // let props pop in for the shot
await page.screenshot({ path: '.shots/moonlight.png' });

// 2) Inland toward the morning (+Z, forward from the +Z-facing spawn) → bestday.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  fail('best-day door prompt never appeared walking +Z up the plaza');
await page.keyboard.press('e');
const inBestday = await roomIs('The Best Day Ever');
await noPromptNow('best day');
const bestSong = await songIs('best-day-ever');
if (!bestSong) fail('the best-day morning did not take over the loop voice with "best-day-ever"');
await page.screenshot({ path: '.shots/moonlight-bestday.png' });

// 3) Back into the night (+Z gate of bestday) — "dancing-in-the-moonlight" must
//    resume (override is temporary; the plaza is itself a song-room).
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 10000 })))
  fail('return-to-plaza prompt never appeared walking +Z');
await page.keyboard.press('e');
const backMoon = await roomIs('Moonlight Plaza');
const moonResumes = await songIs('dancing-in-the-moonlight');
if (!moonResumes) fail('the plaza song did not resume on returning from the morning');

// 4) Back out to the boardwalk (-Z gate, forward from the -Z-facing spawn) —
//    exercises the real graph edge to the rest of the surface wing.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 10000 })))
  fail('boardwalk door prompt never appeared walking -Z down the plaza');
await page.keyboard.press('e');
const backBoardwalk = await roomIs('The Boardwalk');

await ctx.close();
await browser.close();
console.log(
  `moonlight: bootReady=${bootReady} moonlight=${inMoonlight} moonSong=${moonSong} ` +
    `bestday=${inBestday} bestSong=${bestSong} backMoon=${backMoon} ` +
    `moonResumes=${moonResumes} backBoardwalk=${backBoardwalk} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
