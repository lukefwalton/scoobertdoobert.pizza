// Phase 6 metro-tunnel smoke: the deep end of the shrine's railway line — a
// (46 MB → 1.4 MB) GLB level reached by FOLLOWING THE TRACKS from the wayside
// shrine, masked by the loader minigame. Drops into the tunnel, asserts the
// loader reaches ready and the room enters, then round-trips the wiring:
// tunnel → shrine (return door) and shrine → tunnel (the new track door).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import {
  makeLoaderHelpers,
  roomIs as sharedRoomIs,
  walkToDoor,
  watchPageErrors,
} from './lib/smoke.mjs';

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
watchPageErrors(page, fail);

const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail, timeout });
// Walk `key` until a door prompts, then E — shared, hold-and-poll with a
// CI-generous timeout (see lib/smoke.mjs).
const toDoor = (key, label) => walkToDoor(page, fail, key, label);
// Wait out a GLB loader and tap in (shared, resilient: button → Enter fallback
// → confirm the loader dismissed; never throws uncaught). See lib/smoke.mjs.
const { enterLoadedLevel } = makeLoaderHelpers(page, fail);

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
  if (
    (await toDoor('s', 'the climb-back-up door')) &&
    (backAtShrine = await roomIs('Wayside Shrine'))
  ) {
    await page.waitForTimeout(500);
    // shrine → tunnel: arrived at fromTunnel (+X, facing -X), so 's' walks +X back
    // toward the new track door. Re-enters the tunnel (cached loader → quick).
    if (
      (await toDoor('s', 'the tunnel track door')) &&
      (await enterLoadedLevel('metro tunnel (return)', 15000))
    ) {
      inTunnelAgain = await roomIs('Metro Tunnel');
    }
  }
}

await browser.close();
console.log(
  `metro: tunnel=${inTunnel} backAtShrine=${backAtShrine} tunnelAgain=${inTunnelAgain} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
