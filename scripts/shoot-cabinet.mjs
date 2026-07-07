// In-world playable-cabinet smoke: the Boardwalk cabinet is DEDICATED to Crusteroids
// (each cabinet is now one game, its marquee = what it plays; the one MYSTERY cabinet
// in North Park still rolls). Jump to the boardwalk, walk up until the "Press E to
// play" prompt shows, press E, and assert the modal opened with the cabinet's OWN game
// (crusteroids). Then Esc and assert it closed. Asserts on the prompt + modal +
// __sdpArcade hook, not on pixels. The mystery-vs-dedicated dispatch is unit-covered
// in src/lib/arcade.test.ts. (Distinct from shoot:arcade, which covers the 2D page.)
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { page, fail, finish, failures } = await startSmoke();
watchPageErrors(page, fail);

await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 12000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);

// Jump to the boardwalk (its cabinet sits at ~[2.9,0,0.5], ahead-right of spawn).
const reached = await page
  .waitForFunction(
    () => {
      const go = window.__sdpGoToRoom;
      if (typeof go !== 'function') return false;
      if (document.querySelector('.hud-room')?.textContent?.includes('The Boardwalk')) return true;
      go('boardwalk', 'default');
      return false;
    },
    null,
    { timeout: 15000, polling: 500 },
  )
  .then(
    () => true,
    () => false,
  );
if (!reached) fail('could not reach the boardwalk');
await page.waitForTimeout(700);
const close = await page.$('.hud-welcome__close');
if (close) await close.click();
await page.waitForTimeout(500);

// Walk up to the cabinet: strafe right (d) + forward (w) toward [2.9, 0.5], polling
// for the "Press E to play" prompt.
await page.keyboard.down('d');
await page.keyboard.down('w');
const prompted = await page.waitForSelector('.hud-prompt--arcade', { timeout: 6000 }).then(
  () => true,
  () => false,
);
await page.keyboard.up('d');
await page.keyboard.up('w');
if (!prompted) fail('never got the "Press E to play" prompt walking up to the cabinet');

// Fire it up — E should roll a random game and open the modal.
let opened = false;
let rolledOk = false;
let baselineQuiet = false;
let closed = false;
let duckedForGame = false;
let restoredAfterGame = false;
if (prompted) {
  // Baseline: nothing is making sound yet, so the radio must NOT be suppressed.
  // Asserting this BEFORE the game opens proves the full false→true→false
  // lifecycle (not just true→false), so the duck can't pass on a stuck-true.
  baselineQuiet = await page
    .waitForFunction(() => window.__sdpMusicSuppressed === false, null, { timeout: 2500 })
    .then(
      () => true,
      () => false,
    );
  if (!baselineQuiet) fail('the radio was already suppressed before the arcade game opened');

  await page.evaluate(() => {
    window.__sdpArcade = undefined;
  });
  await page.keyboard.press('e');
  opened = await page.waitForSelector('.hud-dialog--arcade', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!opened) fail('pressing E did not open the arcade game modal');
  const rolled = await page.evaluate(() => window.__sdpArcade);
  // The Boardwalk cabinet is DEDICATED to Crusteroids, so it must open ITS game — not
  // a random roll. (The mystery cabinet's roll is unit-covered in arcade.test.ts.)
  rolledOk = rolled === 'crusteroids';
  if (!rolledOk) fail(`dedicated Boardwalk cabinet opened "${rolled}", expected "crusteroids"`);
  await page.screenshot({ path: '.shots/cabinet-playable.png' });

  // The arcade game makes its own sound — so the RADIO must DUCK while it's open.
  // This is the second end-to-end example of the shared soundMakerActive union
  // (besides the TV path in shoot:tv), proving the arcade lifecycle toggles it too.
  duckedForGame = await page
    .waitForFunction(() => window.__sdpMusicSuppressed === true, null, { timeout: 2000 })
    .then(
      () => true,
      () => false,
    );
  if (!duckedForGame) fail('the radio did not duck while the arcade game was open');

  // Esc closes it.
  await page.keyboard.press('Escape');
  closed = await page
    .waitForFunction(() => !document.querySelector('.hud-dialog--arcade'), null, { timeout: 4000 })
    .then(
      () => true,
      () => false,
    );
  if (!closed) fail('Escape did not close the arcade modal');

  // …and the radio RESTORES the moment the game closes.
  if (closed) {
    restoredAfterGame = await page
      .waitForFunction(() => window.__sdpMusicSuppressed === false, null, { timeout: 2000 })
      .then(
        () => true,
        () => false,
      );
    if (!restoredAfterGame) fail('the radio did not restore after the arcade game closed');
  }
}

console.log(
  `cabinet: reached=${reached} prompted=${prompted} opened=${opened} rolledOk=${rolledOk} ` +
    `baseline=${baselineQuiet} ducked=${duckedForGame} restored=${restoredAfterGame} closed=${closed} | errors=${failures()}`,
);
await finish();
