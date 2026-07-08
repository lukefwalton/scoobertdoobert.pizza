// LISTENING-ROOM smoke: the museum wing off the Tape Vault. One exhibit per
// catalog track; the collection mirrors discovery/restoration:
//   1) An UNFOUND room-song hangs as an empty ??? frame — clicking it toasts and
//      must NOT touch the loop voice.
//   2) A SEED track (always discovered) is a playable exhibit — clicking plays
//      its lo-fi file and makes it the station.
//   3) Seeded progress (a discovered room-song + a restored seed) flips the same
//      exhibits: the discovered one plays lo-fi, the restored one plays HI-FI.
//   4) The vault ⇄ listening doors WALK both ways (the real prompt + E).
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
const songIs = (needle) =>
  page
    .waitForFunction((s) => (window.__sdpJukeboxUrl ?? '').includes(s), needle, { timeout: 10000 })
    .then(
      () => true,
      () => false,
    );
const goTo = (id, spawn, name) =>
  page
    .waitForFunction(
      (args) => {
        const go = window.__sdpGoToRoom;
        if (typeof go !== 'function') return false;
        if (document.querySelector('.hud-room')?.textContent?.includes(args.name)) return true;
        go(args.id, args.spawn);
        return false;
      },
      { id, spawn, name },
      { timeout: 15000, polling: 500 },
    )
    .then(
      () => true,
      () => {
        fail(`could not reach ${name} via the test nav hook`);
        return false;
      },
    );
const bootWorld = async () => {
  await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
  try {
    await page.waitForSelector('canvas', { timeout: 12000 });
    await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
  } catch (e) {
    fail(`world did not mount: ${e.message}`);
  }
  await page.waitForTimeout(1500);
  await page
    .waitForFunction(() => window.__sdpAudio && window.__sdpAudio.ready === true, null, {
      timeout: 12000,
    })
    .catch(() => fail('boot ambience never decoded — engine not ready'));
  await page
    .getByRole('button', { name: 'dismiss intro' })
    .click({ timeout: 4000 })
    .catch(() => {});
  await page.waitForTimeout(200);
};
const exhibit = (slug) =>
  page.waitForFunction(
    (s) =>
      typeof window[`__sdpExhibit:${s}`] === 'function' && (window[`__sdpExhibit:${s}`](), true),
    slug,
    { timeout: 8000 },
  );

// ── COLD pass ────────────────────────────────────────────────────────────────
await bootWorld();
await goTo('listening', 'default', 'The Listening Room');
await page.screenshot({ path: '.shots/listening-1-cold.png' });

// 1) an unfound room-song's exhibit is an empty frame: click must not play it.
const clickedEmpty = await exhibit('boardwalk').then(
  () => true,
  () => false,
);
if (!clickedEmpty) fail('the boardwalk exhibit hook never mounted');
// concrete wait: the empty-frame toast IS the completion signal for the no-op
const emptyToast = await page
  .waitForFunction(
    () => /empty frame/i.test(document.querySelector('.hud-toast')?.textContent ?? ''),
    null,
    { timeout: 5000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!emptyToast) fail('clicking the ??? frame never toasted');
{
  const active = await page.evaluate(() => window.__sdpJukeboxActive === true);
  if (active) fail('clicking an EMPTY ??? frame seized the loop voice');
}

// 2) a seed exhibit is playable: it takes the voice with its lo-fi file.
await exhibit('information').catch(() => fail('the information exhibit hook never mounted'));
if (!(await songIs('/audio/jukebox/information.mp3')))
  fail('clicking a discovered (seed) exhibit did not play its lo-fi file');
await page.screenshot({ path: '.shots/listening-2-played.png' });

// ── SEEDED pass: a discovered room-song + a restored seed ───────────────────
await page.evaluate(() =>
  localStorage.setItem(
    'sdp_progress_v1',
    JSON.stringify({ discoveredSongs: ['boardwalk'], restoredSongs: ['information'] }),
  ),
);
await bootWorld();
await goTo('listening', 'default', 'The Listening Room');

// the once-empty frame is now a playable exhibit (lo-fi — found, not restored)
await exhibit('boardwalk').catch(() => fail('the discovered boardwalk exhibit hook is missing'));
if (!(await songIs('/audio/jukebox/boardwalk.mp3')))
  fail('a DISCOVERED room-song exhibit did not play its lo-fi file');

// the restored seed plays its HI-FI file (and wears the chip — visual only)
await exhibit('information').catch(() => fail('the restored information exhibit hook is missing'));
if (!(await songIs('/audio/jukebox/hifi/information.mp3')))
  fail('a RESTORED exhibit did not play its hi-fi file');
await page.screenshot({ path: '.shots/listening-3-seeded.png' });

// ── 4) the doors, walked both ways ──────────────────────────────────────────
await goTo('tapevault', 'default', 'The Tape Vault');
// vault spawn faces -Z; the listening door is on the -X wall → strafe left ('a').
if (await holdUntilDoorPrompt(page, 'a', { timeout: 10000 })) {
  await page.keyboard.press('e');
  await roomIs('The Listening Room');
} else fail('walking -X in the vault never prompted the listening-room door');
// listening spawn faces +Z, the vault door is behind → back up ('s').
if (await holdUntilDoorPrompt(page, 's', { timeout: 10000 })) {
  await page.keyboard.press('e');
  await roomIs('The Tape Vault');
} else fail('backing up in the listening room never prompted the vault door');
await page.screenshot({ path: '.shots/listening-4-doors.png' });

console.log(`listening: errors=${failures()}`);
await ctx.close();
await finish(
  'shoot-listening: the museum wing curates the catalog',
  'shoot-listening: FAILED — see FAIL lines above',
);
