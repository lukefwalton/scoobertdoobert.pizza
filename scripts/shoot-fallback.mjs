// Verifies the step-6 contract: on mobile OR with reduced motion, the descent
// and 3D are skipped entirely, and Continue just navigates to the flat /text
// destination list. Fails non-zero if 3D leaks in or the boot card shows.
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail, finish, failures } = await launchSmoke();

// --- Mobile: no descent, no 3D — Continue lands in the ARCADE (mobile's reward,
//     the minigames ARE the mobile experience), not the 3D world. ---
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  // Mobile must be instantly usable: no boot overlay on a first visit.
  const mboot = await page.$('.boot');
  if (mboot) {
    fail('MOBILE: boot overlay present (should skip on small screens)');
  }
  await page.click('#order-form button[type="submit"]');
  await page.waitForTimeout(900);
  const url = page.url();
  if (!url.includes('/arcade')) {
    fail(`MOBILE: Continue did not navigate to /arcade -> ${url}`);
  }
  // The arcade's 2D game canvas is expected; what must NOT appear is the 3D
  // world (its HUD room label). Distinguish by selector, not by "any canvas".
  const arcadeCanvas = await page.$('.arcade-canvas');
  const worldHud = await page.$('.hud-room');
  if (!arcadeCanvas) {
    fail('MOBILE: arcade game canvas missing on /arcade');
  }
  if (worldHud) {
    fail('MOBILE: the 3D world mounted (should be skipped)');
  }
  await page.screenshot({ path: '.shots/fallback-mobile.png', fullPage: true });
  console.log(`mobile    -> ${url}  arcadeCanvas=${!!arcadeCanvas} worldHud=${!!worldHud}`);
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
    fail('REDUCED: boot card showed (should self-skip)');
  }
  await page.click('#order-form button[type="submit"]');
  await page.waitForTimeout(900);
  const url = page.url();
  const canvas = await page.$('canvas');
  if (!url.includes('/text')) {
    fail(`REDUCED: Continue did not navigate to /text -> ${url}`);
  }
  if (canvas) {
    fail('REDUCED: a 3D canvas appeared (should be skipped)');
  }
  console.log(`reduced   -> ${url}  boot=${!!boot} canvas=${!!canvas}`);
  await ctx.close();
}

// --- /about: the crawlable "straight story" route renders (registration +
//     prerender + metadata regression catch). Served from the prerendered
//     dist/about.html, so this also proves the SSG route is wired. ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + '/about', { waitUntil: 'networkidle' });
  const heading = (await page.textContent('main h1').catch(() => null))?.trim() ?? '';
  const title = await page.title();
  if (!heading.includes('About Scoobert Doobert')) {
    fail(`ABOUT: main <h1> missing/unexpected -> ${JSON.stringify(heading)}`);
  }
  if (!title.includes('Scoobert Doobert')) {
    fail(`ABOUT: <title> missing/unexpected -> ${JSON.stringify(title)}`);
  }
  console.log(
    `about     -> h1=${JSON.stringify(heading)} titled=${title.includes('Scoobert Doobert')}`,
  );
  await ctx.close();
}

await finish('\nfallback checks passed.', `\n${failures()} fallback check(s) FAILED`);
