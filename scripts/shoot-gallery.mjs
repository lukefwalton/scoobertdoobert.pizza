// Sunken-Gallery-wing smoke: the submerged greek-statuary hall off the poolrooms
// and the pastel daydream beyond it. Drops straight into the gallery (?room= test
// entrance), then tours gallery → daydream → back → up to the poolrooms, all on
// the Z axis (single-key holds). Proves the new rooms mount, the crunched greek
// props don't crash the scene, the doors wire both ways with no spawn-prompt
// flash, and each room takes over the loop voice with its own song (Room.song).
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

// Enter via ?world=1 (boots the audio engine — the ?room= entrance skips that
// preload) PLUS &debug=1 (the narrower gate that exposes the __sdpGoToRoom action
// hook). Then jump straight to the gallery rather than threading the descent.
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

// Jump to the gallery (the Doors test nav hook). goToRoom hard-blocks while the
// first-entry intro modal / an entry wipe is up, so POLL: re-fire the jump every
// ~500ms until the room label flips. (Re-firing is harmless once we've arrived.)
const inGallery = await page
  .waitForFunction(
    () => {
      const go = window.__sdpGoToRoom;
      if (typeof go !== 'function') return false;
      if (document.querySelector('.hud-room')?.textContent?.includes('Sunken Gallery')) return true;
      go('gallery', 'default');
      return false;
    },
    null,
    { timeout: 15000, polling: 500 },
  )
  .then(
    () => true,
    () => {
      fail('could not reach the gallery via the test nav hook');
      return false;
    },
  );

// 1) The gallery: it mounts, its statuary loads without crashing the scene
//    (watchPageErrors), and "underwater" takes the loop voice.
await noPromptNow('gallery');
const gallerySong = await songIs('underwater');
if (!gallerySong) fail('the gallery did not take over the loop voice with "underwater"');
await page.waitForTimeout(600); // let a few props pop in for the shot
await page.screenshot({ path: '.shots/gallery.png' });

// 2) Down the nave toward the light (-Z) → the pastel daydream.
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 8000 })))
  fail('daydream door prompt never appeared walking -Z down the nave');
await page.keyboard.press('e');
const inDaydream = await roomIs('Daydream');
await noPromptNow('daydream');
const daydreamSong = await songIs('watercolor-sky');
if (!daydreamSong) fail('the daydream did not take over the loop voice with "watercolor-sky"');
await page.screenshot({ path: '.shots/gallery-daydream.png' });

// 3) Back down into the gallery (+Z) — "underwater" must resume (override is
//    temporary; the gallery is itself a song-room so its track wins back).
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 8000 })))
  fail('return-to-gallery prompt never appeared walking +Z');
await page.keyboard.press('e');
const backGallery = await roomIs('The Sunken Gallery');
const galleryResumes = await songIs('underwater');
if (!galleryResumes) fail('the gallery song did not resume on returning from the daydream');

// 4) Wade back up to the poolrooms (+Z) — exercises the real graph edge to the
//    descent (gallery → poolrooms).
if (!(await holdUntilDoorPrompt(page, 'w', { timeout: 8000 })))
  fail('poolrooms door prompt never appeared walking +Z up the nave');
await page.keyboard.press('e');
const backPool = await roomIs('The Poolrooms');

await ctx.close();
await browser.close();
console.log(
  `gallery: bootReady=${bootReady} gallery=${inGallery} gallerySong=${gallerySong} ` +
    `daydream=${inDaydream} daydreamSong=${daydreamSong} backGallery=${backGallery} ` +
    `galleryResumes=${galleryResumes} backPool=${backPool} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
