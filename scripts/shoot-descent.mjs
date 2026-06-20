// Phase 2 descent test: the storefront CTA + the era-floor doors. The old
// storefront→install→world path is gone (the Calzone install moved to the
// machine room — Checkpoint 3), so this now verifies the floor descent:
// storefront → 1999 → 2000 → machine room (terminus), and back up, with the rot
// transition firing and no page errors. The 3D world itself is covered by
// shoot:world (the ?world=1 trigger still mounts it).
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
const on2000 = await page.$eval('body', (el) => el.innerText.includes('2000'));

await page.click('.floor-door--down');
await page.waitForTimeout(950);
const terminus = await page.$eval(
  'body',
  (el) => el.innerText.includes('SILICON SLICE') && el.innerText.includes('Terminus'),
);
await page.screenshot({ path: '.shots/descent-machine.png' });

// Back up one floor.
await page.click('.floor-door--up');
await page.waitForTimeout(950);
const backUp = await page.$eval('body', (el) => el.innerText.includes('2000'));

if (!on1999 || !on2000 || !terminus || !backUp) errors++;
await browser.close();
console.log(
  `descent floors: 1999=${on1999} 2000=${on2000} machineRoom=${terminus} ascend=${backUp} errors=${errors}`,
);
process.exit(errors ? 1 : 0);
