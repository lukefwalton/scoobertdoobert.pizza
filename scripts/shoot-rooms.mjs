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
await walk('a', 700); // veer to the -X wall panel (facing -Z down the hall, A strafes left/-X)
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

// The jukebox plays the catalog: a track auto-selects on entry, and clicking the
// cabinet (dead ahead at spawn) cycles to the next one.
const jukeOpen = await page.evaluate(() => window.__sdpJukebox?.slug);
const jukeAutoPlay = jukeOpen === 'information';
if (!jukeAutoPlay) fail(`jukebox did not auto-play the opening track (got ${jukeOpen})`);
const jbBox = await page.locator('canvas').boundingBox();
await page.mouse.click(jbBox.x + jbBox.width / 2, jbBox.y + jbBox.height / 2); // click the cabinet
await page.waitForTimeout(350);
const jukeNext = await page.evaluate(() => window.__sdpJukebox?.slug);
const jukeCycles = !!jukeNext && jukeNext !== jukeOpen;
if (!jukeCycles) fail(`clicking the jukebox did not cycle the track (still ${jukeNext})`);

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

// Distance click: a door you can SEE is clickable from across the room, no
// walk-up required (the reported bug was "click the door, nothing happens").
// Turn to face the back-hall door from the spawn and click it without moving.
let distanceClick = false;
{
  const dcCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const dc = await dcCtx.newPage();
  dc.on('pageerror', (e) => fail(`distance-click pageerror: ${e.message}`));
  await dc.goto(base + '/?world=1', { waitUntil: 'commit' });
  try {
    await dc.waitForSelector('.hud-menu-btn', { timeout: 12000 });
    await dc.waitForTimeout(1500);
    const b = await dc.locator('canvas').boundingBox();
    const my = b.y + b.height / 2;
    // spawn faces the window (-Z); the back-hall door is behind (+Z). Turn ~180°.
    await dc.mouse.move(b.x + b.width * 0.78, my);
    await dc.mouse.down();
    await dc.mouse.move(b.x + b.width * 0.29, my, { steps: 12 });
    await dc.mouse.up();
    // Click WITHOUT walking up — must still travel.
    await dc.mouse.click(b.x + b.width / 2, my);
    await dc.waitForFunction(
      () => document.querySelector('.hud-room')?.textContent?.includes('Back Hall') ?? false,
      { timeout: 5000 },
    );
    distanceClick = true;
  } catch (e) {
    fail(`distance door-click did not travel: ${e.message}`);
  }
  await dcCtx.close();
}

// Controls: D strafes RIGHT (+X when facing the window), and Left/Right arrows
// turn. Regression for "left/right inverted" + "no way to turn around".
let strafeRight = false;
let turnWorks = false;
{
  const cCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const cp = await cCtx.newPage();
  cp.on('pageerror', (e) => fail(`controls pageerror: ${e.message}`));
  await cp.goto(base + '/?world=1', { waitUntil: 'commit' });
  try {
    await cp.waitForSelector('.hud-menu-btn', { timeout: 12000 });
    await cp.waitForTimeout(1200);
    // spawn faces the window (yaw π); D should move +X (the player's right).
    const x0 = (await cp.evaluate(() => window.__sdpCam?.x)) ?? 0;
    await cp.keyboard.down('d');
    await cp.waitForTimeout(450);
    await cp.keyboard.up('d');
    const x1 = (await cp.evaluate(() => window.__sdpCam?.x)) ?? 0;
    strafeRight = x1 > x0 + 0.3;
    if (!strafeRight) fail(`D did not strafe right / +X (x ${x0.toFixed(2)} -> ${x1.toFixed(2)})`);
    // right arrow turns right → yaw decreases.
    const yaw0 = (await cp.evaluate(() => window.__sdpCam?.yaw)) ?? 0;
    await cp.keyboard.down('ArrowRight');
    await cp.waitForTimeout(500);
    await cp.keyboard.up('ArrowRight');
    const yaw1 = (await cp.evaluate(() => window.__sdpCam?.yaw)) ?? 0;
    turnWorks = yaw1 < yaw0 - 0.25;
    if (!turnWorks) fail(`right arrow did not turn (yaw ${yaw0.toFixed(2)} -> ${yaw1.toFixed(2)})`);
  } catch (e) {
    fail(`controls check failed: ${e.message}`);
  }
  await cCtx.close();
}

await browser.close();
console.log(
  `rooms: shop=${startShop} noFirstFrame=${noFirstFramePrompt} noSpawnPrompt=${noSpawnPrompt} doorPrompt=${doorPrompt} ` +
    `noPauseMidWipe=${noPauseMidWipe} hall=${inHall} secret=${secretOpened} ` +
    `classified=${inClassified} backToHall=${backToHall} ratStaysDone=${ratStaysDone} jukePrompt=${jukePrompt} ` +
    `jukebox=${inJuke} ducked=${duckedInJuke} autoPlay=${jukeAutoPlay} cycles=${jukeCycles} heldNoBounce=${heldNoBounce} ` +
    `clickEnter=${clickEnter} pauseResume=${pauseResumeNearDoor} audioRestored=${audioRestored} ` +
    `exitAudioReset=${exitAudioReset} rmDoor=${rmDoor} distanceClick=${distanceClick} ` +
    `strafeRight=${strafeRight} turnWorks=${turnWorks} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
