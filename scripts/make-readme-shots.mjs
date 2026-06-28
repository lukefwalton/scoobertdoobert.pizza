// Capture the curated showcase screenshots used in the README hero + gallery
// (and as the source frames for the descent GIF). Drives the REAL site: the
// era-floor descent by clicking through it, then the 3D world via the ?world /
// ?room debug entrances. Web-sized PNGs land in .github/media/.
//
//   npm run build && npm run preview &   # serve dist/ on :4173
//   node scripts/make-readme-shots.mjs
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
const OUT = '.github/media';
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
// Skip the boot sequence on the world entrances (same flag shoot-world uses).
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
  } catch {
    /* ignore */
  }
});
const page = await ctx.newPage();
const shot = async (name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`shot ${name}`);
};
// These assets get committed as the canonical README media, so a capture that ran
// before the page was actually ready must fail LOUDLY (exit non-zero), not quietly
// write a half-loaded screenshot. Required surfaces call fail(); genuinely
// best-effort touches (the CRT, the auto-dismissing intro) just log a note.
let errors = 0;
const fail = (m) => {
  errors++;
  console.error('CAPTURE FAIL:', m);
};
// Any console error / uncaught exception means a surface didn't render as intended.
// Most importantly: roomById() fails SOFT to the shop on a bad ?room id (it logs
// `[rooms] unknown room id …`), which would otherwise save the WRONG room under the
// right filename — so a typo can't quietly produce a canonical asset of the shop.
page.on('console', (m) => {
  if (m.type() === 'error') fail(`console error: ${m.text()}`);
});
page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));

// ── the era-floor descent (one stateful session, clicking down the eras) ──────
await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
await shot('01-storefront');

await page.click('#order-form button[type="submit"]');
await page.waitForSelector('[data-floor="y1999"]', { timeout: 8000 });
await page.waitForTimeout(900);
await shot('02-1999');

await page.click('.floor-door--down');
await page.waitForSelector('[data-floor="y2000"]', { timeout: 8000 });
await page.waitForTimeout(900);
await shot('03-2000');

await page.click('.floor-door--down');
await page.waitForSelector('[data-floor="machine"]', { timeout: 8000 });
// Best-effort: the SGI chrome + the install dialog carry this shot even if the
// little live CRT render is slow, so a miss is a note, not a failure.
const crt = await page
  .waitForSelector('.mr__crt-screen canvas', { timeout: 12000 })
  .catch(() => null);
if (!crt)
  console.warn(
    '  note: machine-room CRT canvas never appeared (chrome + install still carry the shot)',
  );
await page.waitForTimeout(1800); // let the live CRT render warm up
await shot('04-machine-room');

// ── the 3D world (debug entrances; wait out any GLB loader + the intro card) ──
const worldShot = async (url, name, { warm = 3500, walk = 0 } = {}) => {
  await page.goto(base + url, { waitUntil: 'commit' });
  // REQUIRED: the canvas must mount, or the shot is blank.
  const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
  if (!canvas) {
    fail(`${name}: the world canvas never mounted — capture would be blank`);
    return; // don't write a broken canonical asset
  }
  // REQUIRED: a committed gallery shot must NOT show a stuck GLB loader.
  const loaderGone = await page
    .waitForFunction(() => !document.querySelector('[data-level-loader]'), null, { timeout: 20000 })
    .then(
      () => true,
      () => false,
    );
  if (!loaderGone) fail(`${name}: the GLB loader never cleared — capture would show a load screen`);
  await page.waitForTimeout(warm);
  if (await page.$('.hud-welcome')) {
    // Best-effort: the welcome card auto-dismisses, so a failed click still clears.
    const dismissed = await page
      .getByRole('button', { name: /dismiss intro/i })
      .click({ timeout: 2000 })
      .then(
        () => true,
        () => false,
      );
    if (!dismissed)
      console.warn(`  note: ${name}: intro dismiss click failed (it auto-dismisses anyway)`);
    await page.waitForTimeout(700);
  }
  if (walk) {
    await page.keyboard.down('w');
    await page.waitForTimeout(walk);
    await page.keyboard.up('w');
    await page.waitForTimeout(500);
  }
  await shot(name);
};

// NOTE: ?room=ID (no &debug) mounts the room with the leva dev panel hidden
// (leva is gated on ?debug specifically) — the real HUD/objective/whisper still show.
await worldShot('/?world=1', '05-world-shop', { warm: 3800, walk: 1100 });
await worldShot('/?room=jukebox', '06-jukebox', { warm: 3000, walk: 600 });
await worldShot('/?room=boardwalk', '07-boardwalk', { warm: 3200, walk: 700 });
await worldShot('/?room=grassrooms', '08-grassrooms', { warm: 3200, walk: 0 });
await worldShot('/?room=gallery', '09-gallery', { warm: 4500, walk: 400 });

// ── the arcade (the mobile reward / game layer) ──
await page.goto(base + '/crusteroids', { waitUntil: 'networkidle' });
await page.waitForTimeout(1600);
await shot('10-arcade');

await browser.close();
if (errors) {
  console.error(
    `\n${errors} capture(s) failed — see CAPTURE FAIL above. No partial assets trusted.`,
  );
  process.exit(1);
}
console.log('readme shots done.');
