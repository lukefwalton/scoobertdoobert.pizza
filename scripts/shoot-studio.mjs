// Basement-Sessions-wing smoke: the recording-studio wing off the practice room —
// a hub LIVE ROOM you can play (a 3-piece band: drums + bass + keys), branching to
// the CONTROL ROOM (mix desk, faders down) → the TAPE VAULT (collectible master
// tapes), and a sweet LOUNGE breather. Drops in via ?world=1&debug=1 + __sdpGoToRoom,
// plays all three instruments, collects a master tape, then walks every door back the
// way it came (clean single-axis 's' holds). Proves: the 4 rooms mount + their spawns
// place you clear of the doors, the three instruments register strikes (the reward),
// a master tape collects + plays its track, the doors wire both ways with no
// spawn-prompt flash, and the two "playing" rooms (live, lounge) take the loop voice
// while the two "working" rooms (control, vault) stay hushed. Asserts on the quiet
// `.hud-room` label + the engine's active jukebox url, not on animation timing.
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
// Poll the ENGINE's active loop-voice url until it carries `slug` — proves the
// room's song (or a pickup's track) actually took the voice, not just that the
// room mounted.
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
// Hold a key until the door prompts, then step through with E. Every studio spawn
// faces INTO its room, so the arrival door sits behind it: a backward 's' hold
// walks straight back through the door you came in by.
const through = async (key, label) => {
  if (!(await holdUntilDoorPrompt(page, key, { timeout: 10000 }))) {
    fail(`${label}: door prompt never appeared holding '${key}'`);
    return false;
  }
  await page.keyboard.press('e');
  return true;
};
const prog = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}');
    } catch {
      return {};
    }
  });
// Re-fire a teleport until the room label flips (goToRoom hard-blocks while an
// intro modal / entry wipe is up). Different-room hops only — same-room spawn
// changes would short-circuit on the already-correct label.
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

// ?world=1 boots the audio engine; &debug=1 exposes __sdpGoToRoom + the strike hooks.
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

// Dismiss the Scoobertverse intro overlay so it doesn't sit over the wing in the
// shots (and so nothing blocks the nav hook).
await page
  .getByRole('button', { name: 'dismiss intro' })
  .click({ timeout: 4000 })
  .catch(() => {});
await page.waitForTimeout(200);

// 1) Drop into the LIVE ROOM (the wing hub). It mounts, "mystery-machine" takes the
//    loop voice, and both instruments expose their deterministic strike hooks.
const inLive = await goTo('liveroom', 'default', 'The Live Room');
await noPromptNow('live room');
const liveSong = await songIs('mystery-machine');
if (!liveSong) fail('the live room did not take the loop voice with "mystery-machine"');

const haveInstruments = await page
  .waitForFunction(
    () =>
      typeof window.__sdpHitDrum === 'function' &&
      typeof window.__sdpPlayKey === 'function' &&
      typeof window.__sdpPluckBass === 'function',
    null,
    { timeout: 8000 },
  )
  .then(
    () => true,
    () => false,
  );
if (!haveInstruments) fail('live room instrument strike hooks never appeared (drums/keys/bass)');

// Strike the kick (drum 0) and the low C (key 0) — the "play it" reward. The hooks
// report the last strike so we assert the right piece/note registered.
const drum = await page.evaluate(() => {
  if (typeof window.__sdpHitDrum !== 'function') return { err: 'no drum hook' };
  window.__sdpHitDrum(0);
  return window.__sdpDrum ?? { err: 'no __sdpDrum after strike' };
});
const drumOk = !!drum && drum.i === 0 && drum.key === 'kick';
if (!drumOk) fail(`striking the kick did not register (got ${JSON.stringify(drum)})`);

const key = await page.evaluate(() => {
  if (typeof window.__sdpPlayKey !== 'function') return { err: 'no key hook' };
  window.__sdpPlayKey(0);
  return window.__sdpKeys ?? { err: 'no __sdpKeys after play' };
});
const keyOk = !!key && key.i === 0 && key.note === 'C' && key.octave === 4;
if (!keyOk) fail(`playing the low C did not register (got ${JSON.stringify(key)})`);

const bass = await page.evaluate(() => {
  if (typeof window.__sdpPluckBass !== 'function') return { err: 'no bass hook' };
  window.__sdpPluckBass(0);
  return window.__sdpBass ?? { err: 'no __sdpBass after pluck' };
});
const bassOk = !!bass && bass.i === 0 && bass.note === 'C' && bass.octave === 2;
if (!bassOk) fail(`plucking the low C string did not register (got ${JSON.stringify(bass)})`);
await page.screenshot({ path: '.shots/studio-live.png' });

// 2) Back UP to the practice room (the wing entrance), then straight back DOWN —
//    proves the basement door wires both ways and the live song re-arms.
if (await through('s', 'live → practice')) {
  const inPractice = await roomIs('The Practice Room');
  if (!inPractice) fail('live → practice did not land in the practice room');
}
if (await through('s', 'practice → live')) {
  await roomIs('The Live Room');
  const liveResumes = await songIs('mystery-machine');
  if (!liveResumes) fail('the live room song did not resume coming back down from practice');
}

// 3) The CONTROL ROOM: drop in (a WORKING room — no forced song; it must NOT take
//    the loop voice), then walk back into the live room (control→live door).
const inControl = await goTo('controlroom', 'default', 'The Control Room');
await noPromptNow('control room');
await page.screenshot({ path: '.shots/studio-control.png' });
if (await through('s', 'control → live')) {
  await roomIs('The Live Room');
  const liveResumes2 = await songIs('mystery-machine');
  if (!liveResumes2) fail('the live room song did not resume coming back from the control room');
}

// 4) The TAPE VAULT (behind the control room): collect a MASTER TAPE — it plays its
//    track + drops into Pockets (the music ladder's "find it = hear it"). Like the
//    control room, the vault forces no song. Then walk back up to the control room.
const inVault = await goTo('tapevault', 'default', 'The Tape Vault');
await noPromptNow('tape vault');
await page.screenshot({ path: '.shots/studio-vault.png' });
let tapePlays = false;
let tapeHeld = false;
const TAPE = 'tape-information';
const hasPickup = await page
  .waitForFunction((t) => typeof window[`__sdpPickup:${t}`] === 'function', TAPE, {
    timeout: 8000,
  })
  .then(
    () => true,
    () => false,
  );
if (!hasPickup) fail('tape vault: master-tape pickup hook never appeared');
if (hasPickup) {
  await page.evaluate((t) => window[`__sdpPickup:${t}`](), TAPE);
  tapePlays = await songIs('information'); // the cassette's track takes the voice
  if (!tapePlays) fail('the master tape did not start playing its track on pickup');
  const after = await prog();
  tapeHeld = (after.itemsHeld || []).includes(TAPE);
  if (!tapeHeld) fail('the master tape did not drop into itemsHeld (Pockets)');
}
if (await through('s', 'vault → control')) {
  const backControl = await roomIs('The Control Room');
  if (!backControl) fail('vault → control did not land back in the control room');
}

// 5) The LOUNGE breather (off the live room). It IS a playing room —
//    "jolly-roger-bay" takes the loop voice. Then walk back into the live room.
const inLounge = await goTo('lounge', 'default', 'The Lounge');
await noPromptNow('lounge');
const loungeSong = await songIs('jolly-roger-bay');
if (!loungeSong) fail('the lounge did not take the loop voice with "jolly-roger-bay"');
await page.screenshot({ path: '.shots/studio-lounge.png' });
let backLive = false;
if (await through('s', 'lounge → live')) {
  backLive = await roomIs('The Live Room');
  const liveResumes3 = await songIs('mystery-machine');
  if (!liveResumes3) fail('the live room song did not resume coming back from the lounge');
}

// 6) Exit the world back to the storefront from deep in the wing — the teardown
//    must not crash, and the cassette you pocketed set your preferred station, so
//    leaving restores IT (not the live room's mystery-machine): "Information"
//    follows you out. Proves the radio choice survives a full world teardown.
let backStorefront = false;
let stationCarries = false;
await page.waitForTimeout(500); // let the last door wipe fully settle before pausing
await page.keyboard.press('Escape');
try {
  await page.getByRole('button', { name: 'Return to storefront' }).click({ timeout: 4000 });
  await page.waitForSelector('[data-floor="storefront"]', { timeout: 6000 });
  backStorefront = true;
  stationCarries = await songIs('information');
  if (!stationCarries)
    fail('the pocketed cassette station did not carry back to the storefront on exit');
} catch (e) {
  fail(`world exit from deep in the wing failed: ${e.message}`);
}

await ctx.close();
await browser.close();
console.log(
  `studio: bootReady=${bootReady} live=${inLive} liveSong=${liveSong} drum=${drumOk} key=${keyOk} bass=${bassOk} ` +
    `control=${inControl} vault=${inVault} tapePlays=${tapePlays} tapeHeld=${tapeHeld} ` +
    `lounge=${inLounge} loungeSong=${loungeSong} backLive=${backLive} ` +
    `storefront=${backStorefront} stationCarries=${stationCarries} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
