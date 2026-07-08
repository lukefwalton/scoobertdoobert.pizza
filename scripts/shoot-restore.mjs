// RESTORATION-BENCH smoke: the control room's reel-to-reel cleans a found song
// for good. Drops into the control room via ?world=1&debug=1 + __sdpGoToRoom and
// drives the bench through its four states:
//   1) NO TAPE — the boot loop is playing: the verb refuses, nothing banks.
//   2) UNDISCOVERED — an unfound room-song is playing: the deck refuses it too.
//   3) READY — a seed track plays; the smoke WALKS to the deck (the real
//      proximity prompt) and presses E (the real worldActions verb): the
//      ceremony runs (windup → sweep → handoff) and the engine's loop voice
//      lands on the HI-FI url; the rite persists to progressStore.
//   4) RESTORED — a second E is a flat no-op (no double-bank, voice unchanged).
// REAL-PATH SIBLINGS (the repo's real-entry rule): shoot:descent owns the
// storefront → install → world front door; shoot:studio WALKS the doors into
// this wing (practice → live → control → vault). This smoke teleports for the
// mechanics but still WALKS to the bench and presses the real E.
// Then RELOADS and enters the jukebox room cold: the dial's first track now
// plays straight off the hi-fi file (playbackUrlFor reads the durable rite) and
// the curdle insert reports rate 1 (no false pristine pitch-up on hi-fi).
import { mkdirSync } from 'node:fs';
import { roomIs as sharedRoomIs, startSmoke, watchPageErrors } from './lib/smoke.mjs';

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
const prog = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
    } catch {
      return {};
    }
  });
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
  // World interactive = the debug nav hook has mounted (concrete, not a timer).
  await page
    .waitForFunction(() => typeof window.__sdpGoToRoom === 'function', null, { timeout: 12000 })
    .catch(() => fail('the world never exposed its debug nav hook'));
  const ready = await page
    .waitForFunction(() => window.__sdpAudio && window.__sdpAudio.ready === true, null, {
      timeout: 12000,
    })
    .then(
      () => true,
      () => false,
    );
  if (!ready) fail('boot ambience never decoded — engine not ready');
  const dismiss = page.getByRole('button', { name: 'dismiss intro' });
  await dismiss.click({ timeout: 4000 }).catch(() => {});
  // …and gone (a concrete wait; absent-from-the-start resolves immediately).
  await dismiss.waitFor({ state: 'detached', timeout: 4000 }).catch(() => {});
};

await bootWorld();
await goTo('controlroom', 'default', 'The Control Room');

// ── 1) NO TAPE: the boot loop is the voice — the bench refuses, banks nothing.
await page.waitForFunction(() => typeof window.__sdpRestore === 'function', null, {
  timeout: 8000,
});
await page.evaluate(() => window.__sdpRestore());
// concrete wait: the deck's refusal toast IS the completion signal for a no-op verb
const noTapeToast = await page
  .waitForFunction(
    () => /deck is empty/i.test(document.querySelector('.hud-toast')?.textContent ?? ''),
    null,
    { timeout: 5000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!noTapeToast) fail('the no-tape bench never toasted its refusal');
{
  const p = await prog();
  if ((p.restoredSongs ?? []).length !== 0)
    fail('the no-tape bench banked a restoration off the boot loop');
  const ceremony = await page.evaluate(() => window.__sdpCeremony);
  if (ceremony) fail(`the no-tape bench started a ceremony (__sdpCeremony=${ceremony})`);
}

// ── 2) UNDISCOVERED: an unfound room-song plays — the deck refuses it.
await page.evaluate(() => window.__sdpAudio.playJukeboxTrack('/audio/jukebox/boardwalk.mp3'));
if (!(await songIs('/audio/jukebox/boardwalk.mp3')))
  fail('could not put the undiscovered room-song on the voice');
await page.evaluate(() => window.__sdpRestore());
const refusedToast = await page
  .waitForFunction(
    () => /hasn’t found you/i.test(document.querySelector('.hud-toast')?.textContent ?? ''),
    null,
    { timeout: 5000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!refusedToast) fail('the undiscovered bench never toasted its refusal');
{
  const p = await prog();
  if ((p.restoredSongs ?? []).length !== 0)
    fail('the bench restored an UNDISCOVERED room-song (the deck must refuse it)');
  const url = await page.evaluate(() => window.__sdpJukeboxUrl);
  if (url !== '/audio/jukebox/boardwalk.mp3') fail(`the refused rite moved the voice (now ${url})`);
}

// ── 3) READY, driven the REAL way: a seed track on the deck, WALK to the bench
// (the proximity prompt), press E (the worldActions verb), the ceremony lands.
await page.evaluate(() => window.__sdpAudio.playJukeboxTrack('/audio/jukebox/information.mp3'));
if (!(await songIs('/audio/jukebox/information.mp3')))
  fail('could not put the seed track on the voice');
// Spawn faces -X at [2.5, eye, 0]; the bench sits at (-1.6, 4.6) — forward and to
// the LEFT (facing -X, left strafe is +Z).
await page.keyboard.down('w');
await page.keyboard.down('a');
const prompted = await page.waitForSelector('.hud-prompt--bench', { timeout: 12000 }).then(
  () => true,
  () => false,
);
await page.keyboard.up('w');
await page.keyboard.up('a');
if (!prompted) fail('walking to the reel-to-reel never raised the bench prompt');
else {
  const text = await page.$eval('.hud-prompt--bench', (el) => el.textContent ?? '');
  if (!/Press E to restore/i.test(text))
    fail(`bench prompt reads wrong for a ready track: "${text}"`);
}
await page.screenshot({ path: '.shots/restore-1-prompt.png' });
await page.keyboard.press('e');
// The rite announces itself…
const sawCeremony = await page
  .waitForFunction(() => ['windup', 'sweep'].includes(window.__sdpCeremony), null, {
    timeout: 4000,
  })
  .then(
    () => true,
    () => false,
  );
if (!sawCeremony) fail('pressing E at the bench never started the ceremony');
// …the HUD prompt flips to the RUNNING line (the benchBusy latch is the same
// source the verb reads, so the prompt can never invite an E that would no-op)…
const runningPrompt = await page
  .waitForFunction(
    () => /restoring/i.test(document.querySelector('.hud-prompt--bench')?.textContent ?? ''),
    null,
    { timeout: 3000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!runningPrompt) fail('the bench prompt did not show the running state mid-ceremony');
await page.screenshot({ path: '.shots/restore-2-ceremony.png' });
// …and lands on the hi-fi pressing.
if (!(await songIs('/audio/jukebox/hifi/information.mp3')))
  fail('the ceremony never handed the voice to the hi-fi file');
{
  const p = await prog();
  if (!(p.restoredSongs ?? []).includes('information'))
    fail('the completed rite did not persist to progressStore.restoredSongs');
}
await page.screenshot({ path: '.shots/restore-3-done.png' });

// ── 4) RESTORED: a second E is a flat no-op — no double-bank, voice unchanged.
await page.keyboard.press('e');
const cleanToast = await page
  .waitForFunction(
    () => /already clean/i.test(document.querySelector('.hud-toast')?.textContent ?? ''),
    null,
    { timeout: 5000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!cleanToast) fail('a second E never toasted the already-restored refusal');
{
  const p = await prog();
  if ((p.restoredSongs ?? []).length !== 1)
    fail('a second E at the bench double-banked the restoration');
  const url = await page.evaluate(() => window.__sdpJukeboxUrl);
  if (url !== '/audio/jukebox/hifi/information.mp3')
    fail(`a second E moved the voice (now ${url})`);
}

// ── 5) DURABILITY: reload cold; the jukebox dial's first track (the same seed)
// now plays straight off the hi-fi file, and the curdle reports rate 1 for it
// (nothing to un-slow on a hi-fi voice — the false pitch-up guard).
await bootWorld();
await goTo('jukebox', 'default', 'The Jukebox');
if (!(await songIs('/audio/jukebox/hifi/information.mp3')))
  fail('after reload the restored track did not open on its hi-fi file');
const curdleRate = await page
  .waitForFunction(() => window.__sdpCurdle && window.__sdpCurdle.rate === 1, null, {
    timeout: 5000,
  })
  .then(
    () => true,
    () => false,
  );
if (!curdleRate) fail('the curdle insert did not settle at rate 1 on the hi-fi voice');
await page.screenshot({ path: '.shots/restore-4-reload-hifi.png' });

console.log(`restore: errors=${failures()}`);
await ctx.close();
await finish(
  'shoot-restore: the bench restores a found song for good',
  'shoot-restore: FAILED — see FAIL lines above',
);
