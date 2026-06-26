// Phase 2 descent test (full loop + both escape hatches). Waits on explicit
// floor markers (`[data-floor="..."]`) + the world HUD button rather than fixed
// sleeps, so it stays stable if transition/boot timings drift. Verifies on
// desktop: storefront → 1999 → 2000 → machine room via the era-floor doors, the
// up-door round-trip, the relocated install (machine room → installer → 3D
// world), and exiting the world rewinding to floor 0. Then a mobile pass: the
// machine room skips the WebGL CRT and Install hands off to /text.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let errors = 0;
const fail = (msg) => {
  errors++;
  console.log('FAIL:', msg);
};
const floor = (p, id, timeout = 8000) =>
  p.waitForSelector(`[data-floor="${id}"]`, { timeout }).then(
    () => true,
    () => (fail(`floor "${id}" never appeared`), false),
  );

// ── desktop full loop ──────────────────────────────────────────────────────
const ctx = await browser.newContext({
  viewport: { width: 1100, height: 850 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
page.on('pageerror', (e) => fail(`desktop pageerror: ${e.message}`));

await page.goto(base + '/', { waitUntil: 'networkidle' });

// Entry rewire: the Order Online "Continue" starts the descent (floor 0 -> 1).
await page.click('#order-form button[type="submit"]');
const on1999 = await floor(page, 'y1999');
await page.screenshot({ path: '.shots/descent-1999.png' });

// Deeper via the era-floor doors.
await page.click('.floor-door--down');
const on2000 = await floor(page, 'y2000');

await page.click('.floor-door--down');
const onMachine = await floor(page, 'machine');
await page.screenshot({ path: '.shots/descent-machine.png' });

// up-door round-trip: machine room -> back up to 2000 -> back down to machine room.
await page.click('.floor-door--up');
const upDoor = await floor(page, 'y2000');
await page.click('.floor-door--down');
await floor(page, 'machine');

// Desktop should mount the live CRT preview (lazy WebGL) before install — the
// mirror of the mobile noCanvas check, so a MiniWorldPreview regression fails
// here loudly instead of silently shipping a dead screen.
let crtCanvas = false;
try {
  await page.waitForSelector('.mr__crt-screen canvas', { timeout: 12000 });
  crtCanvas = true;
} catch {
  fail('desktop machine-room CRT canvas never mounted');
}

// The relocated install: machine room -> installer -> 3D world.
await page.click('.mr__install');
let world = false;
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 18000 });
  world = true;
} catch {
  fail('world never mounted after install');
}

// Exit the world via the pause menu -> exitWorld() rewinds to floor 0.
await page.keyboard.press('Escape');
let exitToFloor0 = false;
try {
  await page.getByRole('button', { name: 'Return to storefront' }).click({ timeout: 5000 });
  exitToFloor0 = await floor(page, 'storefront');
} catch {
  fail('could not return to storefront from the world');
}

// The rewind must leave floor 0 actually interactive, not just on-screen:
// the order form should restart the descent (floor 0 -> 1999) all over again.
let reusable = false;
if (exitToFloor0) {
  await page.click('#order-form button[type="submit"]');
  reusable = await floor(page, 'y1999');
}
await ctx.close();

// ── mobile / low-power handoff ─────────────────────────────────────────────
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const mp = await mctx.newPage();
mp.on('pageerror', (e) => fail(`mobile pageerror: ${e.message}`));
await mp.goto(base + '/', { waitUntil: 'networkidle' });
await mp.click('.floor-door--plain'); // descend via the door (order form -> /text on mobile)
await floor(mp, 'y1999');
await mp.click('.floor-door--down');
await floor(mp, 'y2000');
await mp.click('.floor-door--down');
await floor(mp, 'machine');
const mobileNoCanvas = (await mp.$$eval('.mr__crt-screen canvas', (e) => e.length)) === 0;
// Mobile install now pops the cheeky "desktop only — phones didn't exist in 1996"
// gag instead of silently redirecting. It must still offer a REAL path onward to
// /text (never a dead end), so: gag appears → its text-only link → /text.
await mp.click('.mr__install');
let mobileGag = false;
let mobileToText = false;
try {
  await mp.waitForSelector('.mr__gag', { timeout: 6000 });
  mobileGag = true;
} catch {
  fail('mobile install did not show the desktop-invite gag');
}
if (mobileGag) {
  await mp.getByRole('link', { name: /text-only version/i }).click();
  try {
    await mp.waitForURL('**/text', { timeout: 6000 });
    mobileToText = true;
  } catch {
    fail('the desktop-invite gag did not lead onward to /text');
  }
}
await mctx.close();

await browser.close();
console.log(
  `descent: 1999=${on1999} 2000=${on2000} machine=${onMachine} upDoor=${upDoor} crt=${crtCanvas} ` +
    `world=${world} exitToFloor0=${exitToFloor0} reusable=${reusable} | mobile: noCanvas=${mobileNoCanvas} ` +
    `gag=${mobileGag} install→text=${mobileToText} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
