// Phase 2 descent test (full loop). Verifies: storefront → 1999 → 2000 →
// machine room via the era-floor doors, then the relocated install (machine
// room → installer → 3D world), then exiting the world drops back to floor 0
// (the storefront). Desktop viewport, so the world path is exercised (mobile /
// reduced-motion hand off to /text instead — see MachineRoomFloor).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1100, height: 850 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
let errors = 0;
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

// Deeper via the era-floor doors.
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

if (!on1999 || !on2000 || !onMachine || !world || !exitToFloor0) errors++;
await browser.close();
console.log(
  `descent: 1999=${on1999} 2000=${on2000} machine=${onMachine} world=${world} exitToFloor0=${exitToFloor0} errors=${errors}`,
);
process.exit(errors ? 1 : 0);
