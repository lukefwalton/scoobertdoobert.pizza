// Phase 6 TV smoke: the in-world CRT is keyboard-operable now, not just clickable.
// Drops into the frutiger room (Aqua Hill — it owns the Moonlight Beach TV), walks
// up to the set, and proves the proximity E-prompt → E opens the video modal → Esc
// closes it. Mirrors how doors/hotspots are reached, so a keyboard-only player can
// switch the TV on. (The video content is also in the pause-menu videos dialog; this
// is the in-world affordance.)
import { mkdirSync } from 'node:fs';
import { roomIs as sharedRoomIs, startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { page, fail, finish, failures } = await startSmoke();
watchPageErrors(page, fail);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail, timeout });
const has = (sel) => page.$(sel).then((el) => !!el);

await page.goto(base + '/?room=frutiger&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

const inFrutiger = await roomIs('Aqua Hill');

// At spawn the camera is across the hill from the set — the prompt must NOT show yet.
const noPromptAtSpawn = !(await has('.hud-prompt--tv'));
if (!noPromptAtSpawn) fail('TV prompt showed at spawn (proximity radius too wide?)');

// Walk to the set: from the +Z spawn facing -Z, holding W+D moves diagonally toward
// the TV at [5.5,5]. Poll for the prompt, release the instant it shows.
let prompted = false;
await page.keyboard.down('w');
await page.keyboard.down('d');
for (let i = 0; i < 60; i++) {
  if (await has('.hud-prompt--tv')) {
    prompted = true;
    break;
  }
  await page.waitForTimeout(80);
}
await page.keyboard.up('w');
await page.keyboard.up('d');
if (!prompted) fail('walking up to the TV never raised the E-prompt (proximity regression)');
await page.screenshot({ path: '.shots/tv-prompt.png' });

// E switches it on — the modal video player appears, branded to the album.
let modalOpen = false;
let titledForAlbum = false;
if (prompted) {
  await page.keyboard.press('e');
  modalOpen = await page.waitForSelector('.hud-dialog--tv', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!modalOpen) fail('E did not open the TV video modal');
  if (modalOpen) {
    titledForAlbum = await page
      .evaluate(() => document.querySelector('.hud-dialog--tv')?.textContent ?? '')
      .then((t) => /MOONLIGHT BEACH/i.test(t));
    if (!titledForAlbum) fail('TV modal did not show the album-branded video (Moonlight Beach)');
    await page.screenshot({ path: '.shots/tv-modal.png' });
  }
}

// The video has its own audio, so the RADIO (the user's music) must DUCK while it
// plays — the WorldHud sound-maker effect → audio.suppressMusic(true). (Exposed via
// __sdpMusicSuppressed under the ?debug entrance.)
let duckedForVideo = false;
if (modalOpen) {
  duckedForVideo = await page
    .waitForFunction(() => window.__sdpMusicSuppressed === true, null, { timeout: 2000 })
    .then(
      () => true,
      () => false,
    );
  if (!duckedForVideo) fail('the radio did not duck while the TV video played (suppressMusic)');
}

// Esc closes the TV first (before the pause menu) — the modal must dismiss.
let closed = false;
if (modalOpen) {
  await page.keyboard.press('Escape');
  closed = await page
    .waitForFunction(() => !document.querySelector('.hud-dialog--tv'), null, { timeout: 4000 })
    .then(
      () => true,
      () => false,
    );
  if (!closed) fail('Esc did not close the TV modal');
}

// …and the radio RESTORES the moment the video closes (suppress lifted).
let musicRestored = false;
if (closed) {
  musicRestored = await page
    .waitForFunction(() => window.__sdpMusicSuppressed === false, null, { timeout: 2000 })
    .then(
      () => true,
      () => false,
    );
  if (!musicRestored) fail('the radio did not restore after the TV video closed');
}

// GLOBAL-MUTE contract (the constitution audit): the click-to-load iframe must
// honor the site mute — enablejsapi=1 always (so later toggles can postMessage
// through), and mute=1 baked into the src when the site is muted at click time.
// Muting is a persisted store read (localStorage 'sdp_muted'), so a reload with
// the flag set IS the muted-user case; the walk re-runs deterministically.
async function openTvAndPressPlay() {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
  await page.waitForTimeout(1500);
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  for (let i = 0; i < 60; i++) {
    if (await has('.hud-prompt--tv')) break;
    await page.waitForTimeout(80);
  }
  await page.keyboard.up('w');
  await page.keyboard.up('d');
  await page.keyboard.press('e');
  await page.waitForSelector('.hud-dialog--tv', { timeout: 4000 });
  await page.click('.hud-dialog--tv .tv__play');
  await page.waitForSelector('.hud-dialog--tv .tv__iframe', { timeout: 4000 });
  return page.$eval('.hud-dialog--tv .tv__iframe', (el) => el.getAttribute('src') ?? '');
}

let mutedSrcOk = false;
let unmutedSrcOk = false;
try {
  await page.evaluate(() => localStorage.setItem('sdp_muted', '1'));
  await page.goto(base + '/?room=frutiger&debug=1', { waitUntil: 'commit' });
  const mutedSrc = await openTvAndPressPlay();
  mutedSrcOk = mutedSrc.includes('enablejsapi=1') && mutedSrc.includes('mute=1');
  if (!mutedSrcOk) fail(`muted-at-click iframe src lacks enablejsapi/mute params: ${mutedSrc}`);

  await page.evaluate(() => localStorage.setItem('sdp_muted', '0'));
  await page.goto(base + '/?room=frutiger&debug=1', { waitUntil: 'commit' });
  const unmutedSrc = await openTvAndPressPlay();
  unmutedSrcOk = unmutedSrc.includes('enablejsapi=1') && !unmutedSrc.includes('mute=1');
  if (!unmutedSrcOk) fail(`unmuted iframe src wrong (want enablejsapi, no mute=1): ${unmutedSrc}`);
} catch (e) {
  fail(`mute-contract pass broke: ${e.message}`);
}

// POST-LOAD toggles too, not just click time: with the iframe already playing,
// flip the global mute through the REAL store path (__sdpSetMuted → audioStore →
// the facade's subscriber) and assert a YT API command was actually posted to the
// iframe (__sdpTvMuteSent counts sends). Both directions.
let postLoadMuteOk = false;
try {
  const sentAfter = async (flip) => {
    const before = (await page.evaluate(() => window.__sdpTvMuteSent)) ?? 0;
    await page.evaluate((m) => window.__sdpSetMuted?.(m), flip);
    return page
      .waitForFunction((n) => (window.__sdpTvMuteSent ?? 0) > n, before, { timeout: 4000 })
      .then(
        () => true,
        () => false,
      );
  };
  const mutedSent = await sentAfter(true);
  const unmutedSent = await sentAfter(false);
  postLoadMuteOk = mutedSent && unmutedSent;
  if (!postLoadMuteOk)
    fail(
      `post-load mute toggle did not reach the iframe (mute=${mutedSent} unmute=${unmutedSent})`,
    );
} catch (e) {
  fail(`post-load mute pass broke: ${e.message}`);
}

console.log(
  `tv: frutiger=${inFrutiger} noPromptAtSpawn=${noPromptAtSpawn} prompted=${prompted} ` +
    `modalOpen=${modalOpen} albumTitled=${titledForAlbum} escClosed=${closed} ` +
    `ducked=${duckedForVideo} restored=${musicRestored} mutedSrc=${mutedSrcOk} ` +
    `unmutedSrc=${unmutedSrcOk} postLoadMute=${postLoadMuteOk} | errors=${failures()}`,
);
await finish();
