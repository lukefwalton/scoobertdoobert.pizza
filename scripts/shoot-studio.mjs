// Basement-Sessions-wing smoke: the recording-studio wing off the practice room —
// a hub LIVE ROOM you can play (a 3-piece band: drums + bass + keys), branching to
// the CONTROL ROOM (mix desk, faders down) → the TAPE VAULT (collectible master
// tapes), and a sweet LOUNGE breather. Drops in via ?world=1&debug=1 + __sdpGoToRoom,
// plays all three instruments, collects a master tape, tucks in the rat (a secret),
// and WALKS every internal door — each at least once, with the three deeper edges
// (live→lounge, live→control, control→vault) traversed FORWARD, not teleported past.
// Proves: the 4 rooms mount + their spawns place you clear of the doors, the three
// instruments register strikes (the reward), a master tape collects + plays its
// track, every door's prompt/radius fires both ways, the two "playing" rooms (live,
// lounge) take the loop voice while the two "working" rooms (control, vault) stay
// hushed yet preserve a pocketed station. Asserts on the quiet `.hud-room` label +
// the engine's active jukebox url, not on animation timing.
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
// The negative audio contract: a WORKING room (control / vault) forces NO song — it
// must NOT seize the loop voice with a jukebox track (you monitor what you carried
// in; with nothing pocketed yet that's the boot loop, so __sdpJukeboxActive is false).
// Guards against a stray Room.song creeping onto a working room unnoticed.
const noForcedSong = async (where) => {
  const hushed = await page
    .waitForFunction(() => window.__sdpJukeboxActive === false, null, { timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  if (!hushed) fail(`${where} seized the loop voice with a song (a working room must stay hushed)`);
  return hushed;
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

// Every studio spawn faces INTO its room, so the arrival door is BEHIND it — a
// backward 's' walks back out the way you came. To WALK a door in its FORWARD
// (deeper) direction, you have to arrive at a spawn whose facing points AT a
// *different* wall's door, then 'w' forward into it. The tour below chains rooms so
// every internal door is traversed by a real player walk (prompt + radius), incl.
// the three forward edges a teleport would otherwise skip.

// 2) Both directions of the basement door, WALKED. live → practice (the door is
//    behind the -Z-facing spawn → 's'), then practice → live ('s' again, fromStudio
//    faces +X so the basement door is behind it). The live song re-arms on return.
if (await through('s', 'live → practice')) {
  const inPractice = await roomIs('The Practice Room');
  if (!inPractice) fail('live → practice did not land in the practice room');
}
if (await through('s', 'practice → live')) {
  await roomIs('The Live Room');
  const liveResumes = await songIs('mystery-machine');
  if (!liveResumes) fail('the live room song did not resume coming back down from practice');
}

// 3) Teleport into the CONTROL ROOM once (no spawn lets us WALK here from the live
//    default), assert it's hushed, then WALK control → live — which lands us at the
//    live room's fromControl spawn (facing +X), set up to forward-walk the lounge.
const inControl = await goTo('controlroom', 'default', 'The Control Room');
await noPromptNow('control room');
const controlHushed = await noForcedSong('the control room'); // a working room: no forced song
await page.screenshot({ path: '.shots/studio-control.png' });
if (await through('s', 'control → live')) {
  await roomIs('The Live Room');
  const liveResumes2 = await songIs('mystery-machine');
  if (!liveResumes2) fail('the live room song did not resume coming back from the control room');
}

// 4) FORWARD-walk live → lounge: at fromControl (facing +X), 'w' crosses the room to
//    the +X lounge door. The lounge IS a playing room ("jolly-roger-bay") and hides
//    the rat secret — the wing's "discover" rung.
let forwardLounge = false;
let loungeSong = false;
let ratSecret = false;
let ratLuck = false;
if (await through('w', 'live → lounge (forward)')) {
  forwardLounge = await roomIs('The Lounge');
  if (!forwardLounge) fail('live → lounge (forward) did not land in the lounge');
  await noPromptNow('lounge');
  loungeSong = await songIs('jolly-roger-bay');
  if (!loungeSong) fail('the lounge did not take the loop voice with "jolly-roger-bay"');
  await page.screenshot({ path: '.shots/studio-lounge.png' });
  const hasPet = await page
    .waitForFunction(() => typeof window.__sdpPetRat === 'function', null, { timeout: 5000 })
    .then(
      () => true,
      () => false,
    );
  if (!hasPet) fail('lounge: the pet-the-rat hook never appeared');
  if (hasPet) {
    const luckBefore = (await prog()).luckEarned || 0; // measured here: tapes (also +luck) come later
    await page.evaluate(() => window.__sdpPetRat());
    const afterPet = await prog();
    ratSecret = (afterPet.secretsFound || []).includes('lounge-rat');
    if (!ratSecret) fail('tucking in the sleeping rat did not record the lounge-rat secret');
    ratLuck = (afterPet.luckEarned || 0) === luckBefore + 1;
    if (!ratLuck)
      fail(
        `the rat secret did not tip +1 luck (before ${luckBefore}, after ${afterPet.luckEarned})`,
      );
  }
}

// 5) WALK lounge → live (lands at fromLounge, facing -X), then FORWARD-walk
//    live → control: 'w' crosses to the -X control door. Song re-arms between.
if (await through('s', 'lounge → live')) {
  await roomIs('The Live Room');
  const liveResumes3 = await songIs('mystery-machine');
  if (!liveResumes3) fail('the live room song did not resume coming back from the lounge');
}
let forwardControl = false;
if (await through('w', 'live → control (forward)')) {
  forwardControl = await roomIs('The Control Room');
  if (!forwardControl) fail('live → control (forward) did not land in the control room');
}

// 6) Teleport into the TAPE VAULT (no -Z-facing control spawn to walk from), assert
//    it's hushed, collect a MASTER TAPE (plays + Pockets), then WALK both vault↔control
//    doors — including the FORWARD control → vault, the last internal edge.
const inVault = await goTo('tapevault', 'default', 'The Tape Vault');
await noPromptNow('tape vault');
const vaultHushed = await noForcedSong('the tape vault'); // hushed BEFORE we pocket a tape
await page.screenshot({ path: '.shots/studio-vault.png' });
// Collect ALL THREE master tapes — each must play its OWN track + land in Pockets,
// so every new item/track path is exercised end to end (not just one). Picked in an
// order that leaves "information" LAST, so it's the preferred station we then trace
// through the control room and out to the storefront.
const TAPES = [
  { id: 'tape-1101', track: '1101' },
  { id: 'tape-jolly-roger-bay', track: 'jolly-roger-bay' },
  { id: 'tape-information', track: 'information' }, // last → the carried station
];
let tapesPlayed = 0;
let tapesHeld = 0;
for (const t of TAPES) {
  const hasPickup = await page
    .waitForFunction((id) => typeof window[`__sdpPickup:${id}`] === 'function', t.id, {
      timeout: 8000,
    })
    .then(
      () => true,
      () => false,
    );
  if (!hasPickup) {
    fail(`tape vault: pickup hook never appeared for ${t.id}`);
    continue;
  }
  await page.evaluate((id) => window[`__sdpPickup:${id}`](), t.id);
  if (await songIs(t.track)) tapesPlayed++;
  else fail(`${t.id} did not start playing its track "${t.track}" on pickup`);
  const held = (await prog()).itemsHeld || [];
  if (held.includes(t.id)) tapesHeld++;
  else fail(`${t.id} did not drop into itemsHeld (Pockets)`);
}

// WALK vault → control: now that a cassette is pocketed, the working room must
// PRESERVE the carried station ("information" keeps playing) — the positive half of
// the hushed contract ("monitor what you carried in"), not a reset to silence.
let stationThruControl = false;
if (await through('s', 'vault → control')) {
  const backControl = await roomIs('The Control Room');
  if (!backControl) fail('vault → control did not land back in the control room');
  stationThruControl = await songIs('information');
  if (!stationThruControl)
    fail('the control room dropped the pocketed station (it should monitor what you carried in)');
}
// FORWARD-walk control → vault (the -Z door is behind the +Z-facing fromVault spawn
// → 's' into it). The final internal edge, walked toward the vault.
let forwardVault = false;
if (await through('s', 'control → vault (forward)')) {
  forwardVault = await roomIs('The Tape Vault');
  if (!forwardVault) fail('control → vault (forward) did not land in the tape vault');
}

// 7) Exit the world back to the storefront from deep in the wing — the teardown
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
    `control=${inControl} controlHushed=${controlHushed} fwdLounge=${forwardLounge} loungeSong=${loungeSong} ratSecret=${ratSecret} ratLuck=${ratLuck} ` +
    `fwdControl=${forwardControl} vault=${inVault} vaultHushed=${vaultHushed} tapes=${tapesPlayed}/${TAPES.length}play,${tapesHeld}/${TAPES.length}held ` +
    `stationThruControl=${stationThruControl} fwdVault=${forwardVault} ` +
    `storefront=${backStorefront} stationCarries=${stationCarries} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
