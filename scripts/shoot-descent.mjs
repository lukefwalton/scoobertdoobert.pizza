// Phase 2 descent test (full loop + both escape hatches). Verifies on desktop:
// storefront → 1999 → 2000 → machine room via the era-floor doors, the up-door
// round-trip (machine room → 2000 → machine room), the relocated install
// (machine room → installer → 3D world), and exiting the world rewinding to
// floor 0. Then a mobile pass: the machine room skips the WebGL CRT and Install
// hands off to /text instead of the 3D world.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let errors = 0;

// ── desktop full loop ──────────────────────────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1100, height: 850 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
page.on('pageerror', (e) => {
  errors++;
  console.log('PAGE EXC:', e.message);
});

await page.goto(base + '/', { waitUntil: 'networkidle' });

// Entry rewire: the Order Online "Continue" starts the descent (floor 0 -> 1).
await page.click('#order-form button[type="submit"]');
await page.waitForTimeout(950);
const on1999 = await page.$eval('body', (el) => el.innerText.includes('1999'));
await page.screenshot({ path: '.shots/descent-1999.png' });

await page.click('.floor-door--down');
await page.waitForTimeout(950);
const on2000 = await page.$eval('body', (el) => el.innerText.includes('freezer stairs'));

await page.click('.floor-door--down');
await page.waitForTimeout(950);
const onMachine = await page.$eval(
  'body',
  (el) => el.innerText.includes('Calzone') && el.innerText.includes('Pizza Graphics'),
);
await page.screenshot({ path: '.shots/descent-machine.png' });

// up-door round-trip: machine room -> back up to 2000 -> back down to machine room.
await page.click('.floor-door--up');
await page.waitForTimeout(950);
const upDoor = await page.$eval('body', (el) => el.innerText.includes('freezer stairs'));
await page.click('.floor-door--down');
await page.waitForTimeout(950);

// The relocated install: machine room -> installer -> 3D world.
await page.click('.mr__install');
let world = false;
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 18000 });
  world = true;
} catch {
  /* world never mounted */
}
await page.waitForTimeout(1200);

// Exit the world via the pause menu -> exitWorld() rewinds to floor 0.
await page.keyboard.press('Escape');
await page.waitForTimeout(350);
let exitToFloor0 = false;
try {
  await page.getByRole('button', { name: 'Return to storefront' }).click({ timeout: 4000 });
  await page.waitForTimeout(900);
  exitToFloor0 = await page.$eval('body', (el) =>
    el.innerText.includes('Electronic Pizza Storefront'),
  );
} catch {
  /* couldn't get back */
}
await ctx.close();

// ── mobile / low-power handoff ─────────────────────────────────────────────
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
const mp = await mctx.newPage();
mp.on('pageerror', (e) => {
  errors++;
  console.log('MOBILE EXC:', e.message);
});
await mp.goto(base + '/', { waitUntil: 'networkidle' });
await mp.click('.floor-door--plain'); // descend via the door (order form -> /text on mobile)
await mp.waitForTimeout(800);
await mp.click('.floor-door--down');
await mp.waitForTimeout(800);
await mp.click('.floor-door--down');
await mp.waitForTimeout(800);
const mobileNoCanvas = (await mp.$$eval('.mr__crt-screen canvas', (e) => e.length)) === 0;
await mp.click('.mr__install');
let mobileToText = false;
try {
  await mp.waitForURL('**/text', { timeout: 6000 });
  mobileToText = true;
} catch {
  /* install never handed off to /text */
}
await mctx.close();

await browser.close();

if (!on1999 || !on2000 || !onMachine || !upDoor || !world || !exitToFloor0 || !mobileNoCanvas || !mobileToText)
  errors++;
console.log(
  `descent: 1999=${on1999} 2000=${on2000} machine=${onMachine} upDoor=${upDoor} world=${world} ` +
    `exitToFloor0=${exitToFloor0} | mobile: noCanvas=${mobileNoCanvas} install→text=${mobileToText} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
