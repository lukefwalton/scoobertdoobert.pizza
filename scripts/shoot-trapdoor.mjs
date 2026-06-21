// Verifies the trap door — the storefront's d20 random-drop into the deep.
// Contracts:
//   1. Desktop + JS: the "soft spot in the floor" seam exists; clicking it runs
//      the d20 roll interstitial and DROPS you into the 3D world (canvas mounts)
//      at one of the DEEP back rooms — never the safe surface.
//   2. It's a desktop-only progressive enhancement: ABSENT on mobile, and ABSENT
//      from the crawlable / JS-off HTML (so the dead-plain front door is intact).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

// The rooms the d20 can drop you into (mirrors TRAP_DROP_ROOMS titles) — all
// deep; the surface rooms (Beach Pizza Shop / Back Hall / The Jukebox) must
// never be a landing.
const DEEP_TITLES = ['Classified', 'The Back Room', 'The Long Corridor', 'Liminal Space'];

const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

// --- 1. JS-OFF: the seam must NOT be in the crawlable HTML ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  const seam = await page.$('.trapdoor-seam');
  if (seam) bad('JS-off: trapdoor seam present in crawlable HTML (must be JS-only)');
  console.log(`no-JS    -> seam=${!!seam}`);
  await ctx.close();
}

// --- 2. MOBILE: the seam must be absent (desktop-only PE) ---
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const seam = await page.$('.trapdoor-seam');
  if (seam) bad('mobile: trapdoor seam present (should be desktop-only)');
  console.log(`mobile   -> seam=${!!seam}`);
  await ctx.close();
}

// --- 3. DESKTOP + JS: seam present; clicking it drops into a DEEP room ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });

  const seam = await page.$('.trapdoor-seam');
  if (!seam) bad('desktop: trapdoor seam missing (should be a post-hydration PE)');

  if (seam) {
    await seam.click();
    // The roll interstitial takes over.
    const fall = await page.waitForSelector('.trapdoor-fall', { timeout: 4000 }).catch(() => null);
    if (!fall) bad('desktop: clicking the seam did not start the d20 roll');
    await page.screenshot({ path: '.shots/trapdoor-roll.png' });

    // The drop: the world canvas mounts and a deep room title shows in the HUD.
    const canvas = await page.waitForSelector('canvas', { timeout: 20000 }).catch(() => null);
    if (!canvas) bad('desktop: never dropped into the world (no canvas after the roll)');

    const title =
      (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
      (await page.textContent('.hud-room').catch(() => ''))?.trim();
    if (!title || !DEEP_TITLES.includes(title)) {
      bad(`desktop: dropped into "${title}" which is not a deep room`);
    }
    console.log(
      `desktop  -> seam=${!!seam} rolled=${!!fall} canvas=${!!canvas} room=${JSON.stringify(title)}`,
    );
    await page.waitForTimeout(400);
    await page.screenshot({ path: '.shots/trapdoor-dropped.png' });
  }
  await ctx.close();
}

await browser.close();
console.log(fail ? `\n${fail} trapdoor check(s) FAILED` : '\ntrapdoor checks passed.');
process.exit(fail ? 1 : 0);
