// Song-switcher smoke: a user can shift the world's loop track from anywhere via
// the pause menu. Enters the world, opens the pause menu, steps the switcher
// forward (boot → a catalog track) and back, asserting the engine's loop voice
// actually follows — read off the gated __sdpJukebox* test globals.
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
await page.waitForSelector('.hud-menu-btn', { timeout: 12000 }).catch(() => bad('world never mounted'));

// Open the pause menu and wait until the switcher buttons enable (boot decoded).
await page.keyboard.press('Escape');
const paused = await page.waitForSelector('.hud-pause', { timeout: 6000 }).then(() => true, () => false);
if (!paused) bad('pause menu did not open');

const ready = await page
  .waitForFunction(
    () => {
      const b = [...document.querySelectorAll('button')].find((b) => b.getAttribute('aria-label') === 'next song');
      return !!b && !b.disabled;
    },
    null,
    { timeout: 12000 },
  )
  .then(() => true, () => false);
if (!ready) bad('song switcher never enabled (boot audio not ready)');

let titleBefore = '',
  titleAfter = '',
  url = '',
  playing = false,
  backToBoot = false;
if (ready) {
  titleBefore = (await page.textContent('.hud-pause__songtitle'))?.trim() ?? '';
  await page.getByRole('button', { name: 'next song' }).click();
  // the loop voice should become a jukebox track
  playing = await page
    .waitForFunction(() => window.__sdpJukeboxActive === true, null, { timeout: 12000 })
    .then(() => true, () => false);
  url = (await page.evaluate(() => window.__sdpJukeboxUrl)) || '';
  titleAfter = (await page.textContent('.hud-pause__songtitle'))?.trim() ?? '';

  // step back to the boot loop
  await page.getByRole('button', { name: 'previous song' }).click();
  backToBoot = await page
    .waitForFunction(() => window.__sdpJukeboxActive === false, null, { timeout: 8000 })
    .then(() => true, () => false);
}

if (!playing) bad('stepping the switcher forward did not start a catalog track');
if (!/\/audio\/jukebox\/.+\.mp3$/.test(url)) bad(`switcher track url looks wrong: ${JSON.stringify(url)}`);
if (titleAfter === titleBefore) bad(`readout did not change (${JSON.stringify(titleBefore)})`);
if (!backToBoot) bad('stepping back did not restore the boot loop');
if (errors.length) bad(`page error(s): ${errors.slice(0, 2).join(' | ')}`);

await browser.close();
console.log(
  `music -> before=${JSON.stringify(titleBefore)} after=${JSON.stringify(titleAfter)} url=${url.split('/').pop()} backToBoot=${backToBoot} errors=${errors.length}`,
);
console.log(fail ? `\n${fail} music check(s) FAILED` : '\nmusic checks passed.');
process.exit(fail ? 1 : 0);
