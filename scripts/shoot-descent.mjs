// End-to-end test of the descent gag: submit the order form, walk through the
// crash -> Calzone Player install -> progress -> cut, and assert we actually
// land in the 3D world (canvas mounts). Fails non-zero on page errors or if the
// world never appears.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
  } catch {
    /* ignore */
  }
});
const page = await ctx.newPage();
let errors = 0;
page.on('pageerror', (e) => {
  errors++;
  console.log('PAGE EXC:', e.message);
});

await page.goto(base + '/', { waitUntil: 'networkidle' });
await page.click('#order-form button[type="submit"]'); // fire the descent

await page.waitForTimeout(1550); // aging -> crash
await page.screenshot({ path: '.shots/descent-crash.png' });

await page.waitForTimeout(1450); // crash -> install prompt
await page.screenshot({ path: '.shots/descent-prompt.png' });

await page
  .getByRole('button', { name: 'Install' })
  .click({ timeout: 5000 })
  .catch(() => {
    errors++;
    console.log('Install button not found');
  });
await page.waitForTimeout(900);
await page.screenshot({ path: '.shots/descent-installing.png' });

// The PIZZA-DOS loading screen now lives HERE, at the level load (not on the
// storefront). Assert it actually appears before the world reveals.
let bootSeen = true;
try {
  await page.waitForFunction(() => document.body.innerText.includes('ENTERING THE WORLD'), {
    timeout: 15000,
  });
  await page.screenshot({ path: '.shots/descent-booting.png' });
} catch {
  bootSeen = false;
  errors++;
  console.log('level-load boot screen never appeared');
}

let mounted = true;
try {
  await page.waitForSelector('canvas', { timeout: 14000 }); // positive proof we reached the world
} catch {
  mounted = false;
  errors++;
  console.log('world canvas never mounted after install');
}
await page.waitForTimeout(2500);
await page.screenshot({ path: '.shots/descent-world.png' });

await browser.close();
console.log(`descent shots done (mounted=${mounted}, bootScreen=${bootSeen}, errors=${errors})`);
process.exit(errors ? 1 : 0);
