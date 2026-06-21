// "End of the Line" smoke (Phase 6): the backrooms terminus the undersea metro
// line lets out into. A crunched GLB level reached by following the tunnel's
// tracks to their far end, masked by the loader. Drops in, asserts the loader
// reaches ready and the room renders, then round-trips the wiring back up the
// line to the tunnel.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { makeLoaderHelpers, walkToDoor } from './lib/smoke.mjs';

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
// Walk `key` until a door prompts, then E — shared, hold-and-poll with a
// CI-generous timeout (see lib/smoke.mjs).
const toDoor = (key, label) => walkToDoor(page, fail, key, label);
// Wait out a GLB loader and tap in (shared, resilient: button → Enter fallback
// → confirm the loader dismissed; never throws uncaught). See lib/smoke.mjs.
const { enterLoadedLevel } = makeLoaderHelpers(page, fail);

// ?room=terminus drops straight at the end of the line (otherwise reached by
// following the metro tunnel's tracks to their far end).
await page.goto(base + '/?room=terminus', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}

let inEnd = false;
let backInTunnel = false;
let inEndAgain = false;

if ((await enterLoadedLevel('end of the line')) && (inEnd = await roomIs('End of the Line'))) {
  await page.waitForTimeout(900);
  await page.screenshot({ path: '.shots/terminus.png' });
  // end → tunnel via the +Z return door (spawn faces -Z, so 's' walks +Z to it).
  // The tunnel is ALSO a GLB room, so it comes up behind its own loader first.
  if (
    (await toDoor('s', 'the back-up-the-tunnel door')) &&
    (await enterLoadedLevel('metro tunnel (return)', 15000)) &&
    (backInTunnel = await roomIs('Metro Tunnel'))
  ) {
    await page.waitForTimeout(500);
    // tunnel(fromEnd, -Z facing +Z) → terminus: 's' walks -Z back to the end door.
    if ((await toDoor('s', 'the end-of-the-line door')) && (await enterLoadedLevel('end of the line (return)', 15000))) {
      inEndAgain = await roomIs('End of the Line');
    }
  }
}

await browser.close();
console.log(
  `terminus: end=${inEnd} backInTunnel=${backInTunnel} endAgain=${inEndAgain} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
