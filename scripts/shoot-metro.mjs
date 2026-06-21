// Phase 6 metro-tunnel smoke: the deep end of the shrine's railway line — a
// (46 MB → 1.4 MB) GLB level reached by FOLLOWING THE TRACKS from the wayside
// shrine, masked by the loader minigame. Drops into the tunnel, asserts the
// loader reaches ready and the room enters, then round-trips the wiring:
// tunnel → shrine (return door) and shrine → tunnel (the new track door).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
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
    .then(() => true, () => (fail(`room never became "${name}"`), false));
// Walk `key` until a door prompts, then E.
const toDoor = async (key, label) => {
  await page.keyboard.down(key);
  const prompted = await page
    .waitForSelector('.hud-prompt--door', { timeout: 4000 })
    .then(() => true, () => false);
  await page.keyboard.up(key);
  if (!prompted) {
    fail(`no door prompt walking '${key}' toward ${label} — nav regression at this hop`);
    return false;
  }
  await page.keyboard.press('e');
  return true;
};
// Wait out a GLB loader and tap in. Tapping in has two equivalent paths in
// LoaderGame: the "TAP TO ENTER" button and the Enter key. We try the button,
// but fall back to Enter — the keyboard path can't be intercepted by an overlay
// or tripped by actionability/stability checks, which is what flaked this
// (heaviest) level's click under CI. Never let the click throw uncaught.
const enterLoadedLevel = async (label, timeout = 25000) => {
  const ready = await page
    .waitForFunction(
      () => document.querySelector('[data-level-loader]')?.getAttribute('data-loader-state') === 'ready',
      null,
      { timeout },
    )
    .then(() => true, () => false);
  if (!ready) {
    fail(`${label} loader never reached ready`);
    return false;
  }
  const clicked = await page
    .getByRole('button', { name: /TAP TO ENTER/i })
    .click({ timeout: 4000 })
    .then(() => true, () => false);
  if (!clicked) await page.keyboard.press('Enter'); // LoaderGame: Enter enters when ready
  // Confirm we actually left the loader, whichever path took.
  const gone = await page
    .waitForFunction(() => !document.querySelector('[data-level-loader]'), null, { timeout: 6000 })
    .then(() => true, () => false);
  if (!gone) {
    fail(`${label} loader never dismissed after entering`);
    return false;
  }
  return true;
};

// ?room=metro-tunnel drops straight at the tunnel (otherwise reached by following
// the shrine's tracks, itself behind the rat's secret torii).
await page.goto(base + '/?room=metro-tunnel', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}

let inTunnel = false;
let backAtShrine = false;
let inTunnelAgain = false;

if ((await enterLoadedLevel('metro tunnel')) && (inTunnel = await roomIs('Metro Tunnel'))) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: '.shots/metro.png' });
  // tunnel → shrine via the +Z return door (spawn faces -Z, so 's' walks +Z to it).
  // The shrine is procedural — no loader on the way back up.
  if ((await toDoor('s', 'the climb-back-up door')) && (backAtShrine = await roomIs('Wayside Shrine'))) {
    await page.waitForTimeout(500);
    // shrine → tunnel: arrived at fromTunnel (+X, facing -X), so 's' walks +X back
    // toward the new track door. Re-enters the tunnel (cached loader → quick).
    if ((await toDoor('s', 'the tunnel track door')) && (await enterLoadedLevel('metro tunnel (return)', 15000))) {
      inTunnelAgain = await roomIs('Metro Tunnel');
    }
  }
}

await browser.close();
console.log(
  `metro: tunnel=${inTunnel} backAtShrine=${backAtShrine} tunnelAgain=${inTunnelAgain} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
