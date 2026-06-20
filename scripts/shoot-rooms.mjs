// Phase 3 room-graph smoke: the world is a graph of rooms joined by 3D doors.
// Tour: beach shop → back hall → jukebox room, via the doors. Covers the
// negative spawn check (no door prompt until you approach), keyboard entry, the
// long-corridor traversal, the new jukebox room, the held-E no-bounce guard, and
// click-to-enter. Asserts on the quiet `.hud-room` label + door prompts, not on
// animation timing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') fail(`console: ${m.text()}`);
});

const roomIs = (name, timeout = 8000) =>
  page
    .waitForFunction(
      (n) => document.querySelector('.hud-room')?.textContent?.includes(n) ?? false,
      name,
      { timeout },
    )
    .then(
      () => true,
      () => (fail(`room never became "${name}"`), false),
    );
const labelHas = (name) =>
  page.evaluate(
    (n) => document.querySelector('.hud-room')?.textContent?.includes(n) ?? false,
    name,
  );
const walk = async (key, ms) => {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
};

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
// First-frame check (before any warmup): no door prompt should flash on load —
// the camera boots AT the spawn, not a pose that briefly sits inside a door
// radius. This catches a first-frame regression the post-warmup check misses.
const noFirstFramePrompt = (await page.$('.hud-prompt--door')) === null;
if (!noFirstFramePrompt) fail('a door prompt flashed on load (camera booted inside a door radius)');
await page.waitForTimeout(1500); // WebGL warmup + a few frames

// 1) Start in the shop — and the back-hall door must NOT prompt at spawn (you
//    discover it by turning around, not instantly on load).
const startShop = await roomIs('Beach Pizza Shop');
const noSpawnPrompt = (await page.$('.hud-prompt--door')) === null;
if (!noSpawnPrompt) fail('back-hall door prompt was visible at spawn (should require approach)');
await page.screenshot({ path: '.shots/rooms-shop.png' });

// 2) Back up to the rear wall → keyboard E → the hall.
await walk('s', 900);
let doorPrompt = false;
try {
  await page.waitForSelector('.hud-prompt--door', { timeout: 3000 });
  doorPrompt = true;
} catch {
  fail('back-hall door prompt never appeared');
}
// Pause/unpause while standing in the door radius: pause opens, resume restores
// the prompt, and the door still activates after (nearDoor + modal gating).
await page.keyboard.press('Escape'); // pause while near the door
const pausedNearDoor = (await page.$('.hud-pause')) !== null;
if (!pausedNearDoor) fail('pause did not open while standing near a door');
await page.getByRole('button', { name: 'Resume' }).click({ timeout: 3000 });
await page.waitForTimeout(250);
const promptAfterResume = (await page.$('.hud-prompt--door')) !== null;
if (!promptAfterResume) fail('door prompt did not return after unpausing near the door');
const pauseResumeNearDoor = pausedNearDoor && promptAfterResume;
await page.keyboard.press('e'); // start the wipe
// The wipe is modal for its whole length: an Escape mid-wipe must NOT open pause.
await page.waitForTimeout(110);
await page.keyboard.press('Escape');
await page.waitForTimeout(140);
const noPauseMidWipe = (await page.$('.hud-pause')) === null;
if (!noPauseMidWipe) fail('Escape opened the pause menu mid-wipe (transition not modal)');
const inHall = await roomIs('Back Hall');
await page.screenshot({ path: '.shots/rooms-hall.png' }); // the rat leads down the hall

// 3) Down the corridor. The rat breaks off, knocks a blank panel in the wall,
//    and a hidden CLASSIFIED door clicks open. Slip into it.
await page.keyboard.down('w');
await page.waitForTimeout(2400); // past the welcome + the rat's knock trigger
await page.keyboard.up('w');
await walk('d', 700); // veer to the -X wall panel (facing -Z, 'd' strafes that way)
await page.screenshot({ path: '.shots/rooms-secret.png' }); // the rat at the panel
let secretOpened = false;
try {
  await page.waitForFunction(
    () =>
      document.querySelector('.hud-prompt--door')?.textContent?.includes('slip through the gap') ??
      false,
    { timeout: 4000 },
  );
  secretOpened = true;
} catch {
  fail('the rat never knocked the hidden classified door open');
}
await page.keyboard.press('e');
const inClassified = await roomIs('Classified');
await page.waitForTimeout(700);
await page.screenshot({ path: '.shots/rooms-classified.png' });

// Back out to the hall (arrive at the panel, facing on toward the music).
await walk('s', 750);
await page.waitForSelector('.hud-prompt--door', { timeout: 3000 }).catch(() => {});
await page.keyboard.press('e');
const backToHall = await roomIs('Back Hall');

// The rat already did his job — re-entering the hall must NOT reset him to
// 'lead' (HallwayRoom remounts, but his progression derives from secretRevealed).
await page.waitForTimeout(250);
const ratStaysDone = (await page.evaluate(() => window.__sdpRatPhase)) !== 'lead';
if (!ratStaysDone) fail('the rat reset to "lead" on hallway re-entry after the secret');

// 3b) Continue to the far door → the jukebox room.
await page.keyboard.down('w');
await page.waitForTimeout(2100);
await page.keyboard.up('w');
let jukePrompt = false;
try {
  await page.waitForSelector('.hud-prompt--door', { timeout: 3000 });
  jukePrompt = true;
} catch {
  fail('jukebox door prompt never appeared at the hall end');
}
await page.keyboard.press('e');
const inJuke = await roomIs('The Jukebox');
await page.waitForTimeout(900);
await page.screenshot({ path: '.shots/rooms-jukebox.png' });
// The jukebox room ducks the loop by proximity, so the gain should be < 1 here.
const duckedInJuke = (await page.evaluate(() => window.__sdpProximity ?? 1)) < 0.999;
if (!duckedInJuke) fail('jukebox room did not duck the loop by proximity');

// 4) At the jukebox exit door: a held-E (repeat) must NOT transition; then turn
//    to face the door and CLICK it (the mouse path) → back to the hall.
await walk('s', 800); // to the exit door (now behind us)
await page.waitForSelector('.hud-prompt--door', { timeout: 3000 }).catch(() => {});
await page.evaluate(() =>
  window.dispatchEvent(new KeyboardEvent('keydown', { key: 'e', repeat: true })),
);
await page.waitForTimeout(400);
const heldNoBounce = await labelHas('The Jukebox');
if (!heldNoBounce) fail('held E (repeat) bounced out of the jukebox');

const box = await page.locator('canvas').boundingBox();
const cy = box.y + box.height / 2;
await page.mouse.move(box.x + box.width * 0.78, cy);
await page.mouse.down();
await page.mouse.move(box.x + box.width * 0.29, cy, { steps: 12 }); // turn ~180° to face the door
await page.mouse.up();
await page.mouse.click(box.x + box.width / 2, cy); // click the door mesh
const clickEnter = await roomIs('Back Hall');

// Leaving the jukebox must restore full volume — no permanently-ducked loop.
await page.waitForTimeout(300);
const audioRestored = (await page.evaluate(() => window.__sdpProximity ?? 1)) > 0.999;
if (!audioRestored) fail('loop stayed ducked after leaving the jukebox');

// And exiting the WORLD from inside the jukebox (full teardown, not a room-to-
// room door) must reset the duck too — go back in, then leave via the pause menu.
let exitAudioReset = false;
await page.keyboard.down('s'); // back to the jukebox door (-Z, behind us)
await page.waitForTimeout(900);
await page.keyboard.up('s');
await page.waitForSelector('.hud-prompt--door', { timeout: 3000 }).catch(() => {});
await page.keyboard.press('e');
if (await roomIs('The Jukebox')) {
  await page.waitForTimeout(500); // let it duck again
  await page.keyboard.press('Escape'); // pause
  try {
    await page.getByRole('button', { name: 'Return to storefront' }).click({ timeout: 4000 });
    await page.waitForSelector('[data-floor="storefront"]', { timeout: 6000 });
    await page.waitForTimeout(200);
    exitAudioReset = (await page.evaluate(() => window.__sdpProximity ?? 1)) > 0.999;
    if (!exitAudioReset) fail('loop stayed ducked after exiting the world from the jukebox');
  } catch (e) {
    fail(`world exit from the jukebox failed: ${e.message}`);
  }
}
await ctx.close();

// Reduced-motion uses a distinct, near-instant commit (fade=0) path. The world
// is skipped on the real low-power entrance, but a mid-session toggle can still
// reach it — so confirm a door still transitions cleanly with reduced motion.
let rmDoor = false;
{
  const rmCtx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const rm = await rmCtx.newPage();
  rm.on('pageerror', (e) => fail(`reduced-motion pageerror: ${e.message}`));
  await rm.goto(base + '/?world=1', { waitUntil: 'commit' });
  try {
    await rm.waitForSelector('.hud-menu-btn', { timeout: 12000 });
    await rm.waitForTimeout(1200);
    await rm.keyboard.down('s');
    await rm.waitForTimeout(900);
    await rm.keyboard.up('s');
    await rm.keyboard.press('e');
    await rm.waitForFunction(
      () => document.querySelector('.hud-room')?.textContent?.includes('Back Hall') ?? false,
      { timeout: 5000 },
    );
    rmDoor = true;
  } catch (e) {
    fail(`reduced-motion door transition failed: ${e.message}`);
  }
  await rmCtx.close();
}

await browser.close();
console.log(
  `rooms: shop=${startShop} noFirstFrame=${noFirstFramePrompt} noSpawnPrompt=${noSpawnPrompt} doorPrompt=${doorPrompt} ` +
    `noPauseMidWipe=${noPauseMidWipe} hall=${inHall} secret=${secretOpened} ` +
    `classified=${inClassified} backToHall=${backToHall} ratStaysDone=${ratStaysDone} jukePrompt=${jukePrompt} ` +
    `jukebox=${inJuke} ducked=${duckedInJuke} heldNoBounce=${heldNoBounce} ` +
    `clickEnter=${clickEnter} pauseResume=${pauseResumeNearDoor} audioRestored=${audioRestored} ` +
    `exitAudioReset=${exitAudioReset} rmDoor=${rmDoor} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
