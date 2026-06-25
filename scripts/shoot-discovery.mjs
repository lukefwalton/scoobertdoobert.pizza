// Song-discovery smoke: "exploration's reward is sound." A room-song is HIDDEN
// from the jukebox until you enter its room; finding the room unlocks it on the
// dial forever (persisted). This drives that end-to-end:
//   1) jukebox BEFORE — a seed (non-room) song is on the dial; a room-song is not
//   2) visit the boardwalk (a song-room) — its slug lands in persisted progress
//   3) jukebox AFTER — the boardwalk song is now on the dial
// Uses __sdpGoToRoom + __sdpJukeboxVisible (debug entrance) + the sdp_progress_v1
// localStorage blob.
import { chromium } from 'playwright';
import { watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
const ROOM_SONG = 'boardwalk'; // a room-song (boardwalk room owns it)
const SEED_SONG = 'information'; // a non-room seed song (always on the dial)
const UNVISITED_SONG = 'underwater'; // a room-song we never visit (stays hidden)

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

const goTo = async (id, label) => {
  const ok = await page
    .waitForFunction(
      (args) => {
        const go = window.__sdpGoToRoom;
        if (typeof go !== 'function') return false;
        if (document.querySelector('.hud-room')?.textContent?.includes(args.label)) return true;
        go(args.id, 'default');
        return false;
      },
      { id, label },
      { timeout: 15000, polling: 500 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!ok) fail(`could not reach ${id} (${label})`);
  await page.waitForTimeout(700);
  return ok;
};
const visibleDial = () => page.evaluate(() => window.__sdpJukeboxVisible ?? null);
const discovered = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').discoveredSongs || [];
    } catch {
      return [];
    }
  });

await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

// 1) Jukebox BEFORE discovering anything.
await goTo('jukebox', 'Jukebox');
const before = (await visibleDial()) || [];
const seedShown = before.includes(SEED_SONG);
const roomHiddenBefore = !before.includes(ROOM_SONG);
const unvisitedHidden = !before.includes(UNVISITED_SONG);
if (!seedShown) fail(`seed song "${SEED_SONG}" should always be on the dial`);
if (!roomHiddenBefore) fail(`room-song "${ROOM_SONG}" should be HIDDEN before visiting its room`);
if (!unvisitedHidden) fail(`unvisited room-song "${UNVISITED_SONG}" should be hidden`);

// 2) Visit the boardwalk — entering should discover (persist) its song.
await goTo('boardwalk', 'The Boardwalk');
const got = await discovered();
const persisted = got.includes(ROOM_SONG);
if (!persisted) fail(`visiting the boardwalk did not persist "${ROOM_SONG}" to discoveredSongs`);

// 3) Jukebox AFTER — the boardwalk song is now on the dial; the unvisited one isn't.
await goTo('jukebox', 'Jukebox');
const after = (await visibleDial()) || [];
const roomShownAfter = after.includes(ROOM_SONG);
const stillHidden = !after.includes(UNVISITED_SONG);
if (!roomShownAfter) fail(`"${ROOM_SONG}" should appear on the dial AFTER visiting its room`);
if (!stillHidden) fail(`"${UNVISITED_SONG}" should still be hidden (never visited)`);

await ctx.close();
await browser.close();
console.log(
  `discovery: seedShown=${seedShown} roomHiddenBefore=${roomHiddenBefore} ` +
    `persisted=${persisted} roomShownAfter=${roomShownAfter} stillHidden=${stillHidden} ` +
    `| before=${before.length} after=${after.length} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
