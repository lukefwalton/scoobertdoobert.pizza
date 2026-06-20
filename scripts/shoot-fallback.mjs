// Verifies the step-6 contract: on mobile OR with reduced motion, the descent
// and 3D are skipped entirely, and Continue just navigates to the flat /text
// destination list. Fails non-zero if 3D leaks in or the boot card shows.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let fail = 0;

// --- Mobile: no descent, no canvas, Continue -> /text ---
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.click('#order-form button[type="submit"]');
  await page.waitForTimeout(900);
  const url = page.url();
  const canvas = await page.$('canvas');
  if (!url.includes('/text')) {
    fail++;
    console.log('MOBILE: Continue did not navigate to /text ->', url);
  }
  if (canvas) {
    fail++;
    console.log('MOBILE: a 3D canvas appeared (should be skipped)');
  }
  await page.screenshot({ path: '.shots/fallback-mobile.png', fullPage: true });
  console.log(`mobile    -> ${url}  canvas=${!!canvas}`);
  await ctx.close();
}

// --- Reduced motion (desktop): no boot, no descent, no canvas, Continue -> /text ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const boot = await page.$('.boot');
  if (boot) {
    fail++;
    console.log('REDUCED: boot card showed (should self-skip)');
  }
  await page.click('#order-form button[type="submit"]');
  await page.waitForTimeout(900);
  const url = page.url();
  const canvas = await page.$('canvas');
  if (!url.includes('/text')) {
    fail++;
    console.log('REDUCED: Continue did not navigate to /text ->', url);
  }
  if (canvas) {
    fail++;
    console.log('REDUCED: a 3D canvas appeared (should be skipped)');
  }
  console.log(`reduced   -> ${url}  boot=${!!boot} canvas=${!!canvas}`);
  await ctx.close();
}

await browser.close();
console.log(fail ? `\n${fail} fallback check(s) FAILED` : '\nfallback checks passed.');
process.exit(fail ? 1 : 0);
