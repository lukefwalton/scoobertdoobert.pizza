// Verifies "Poke Scoobert" — the face-stretch instrument cabinet.
//   1. JS-OFF: /poke prerenders to a real crawlable page (title + back anchor),
//      with NO live canvas (the instrument is a post-hydration enhancement).
//   2. The arcade page links to /poke (the cabinet is discoverable).
//   3. JS ON: the warp canvas mounts and a drag distorts it without throwing.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

// --- 1. JS-OFF crawlable shell ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/poke', { waitUntil: 'load' });
  const title = await page.title();
  if (!title.includes('Poke Scoobert')) bad(`no-JS title unexpected -> ${JSON.stringify(title)}`);
  const back = await page.$('a[href="/arcade"]');
  if (!back) bad('no-JS: missing "back to the arcade" anchor');
  const canvas = await page.$('canvas');
  if (canvas) bad('no-JS: a <canvas> rendered into crawlable HTML (should be JS-only)');
  console.log(`no-JS    -> titled=${title.includes('Poke Scoobert')} back=${!!back} canvas=${!!canvas}`);
  await ctx.close();
}

// --- 2. discoverable from the arcade ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/arcade', { waitUntil: 'load' });
  const link = await page.$('a[href="/poke"]');
  if (!link) bad('arcade: missing link to the /poke cabinet');
  console.log(`arcade   -> poke-link=${!!link}`);
  await ctx.close();
}

// --- 3. JS ON: the warp mounts, a drag stretches it, the stretch HOLDS while
//        pressed (the "tap just giggles, won't pull and stay" bug), and springs
//        back on release. ?debug exposes window.__sdpPokeStretch (avg displ px). ---
{
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 900 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(base + '/poke?debug=1', { waitUntil: 'networkidle' });

  const canvas = await page.waitForSelector('.poke-canvas', { timeout: 8000 }).catch(() => null);
  if (!canvas) bad('JS: face-stretch canvas did not mount');

  let heldStretch = 0;
  let stayStretch = 0;
  let releasedStretch = 0;
  if (canvas) {
    await page.waitForTimeout(600); // let the face image load
    const box = await canvas.boundingBox();
    const stretch = () => page.evaluate(() => window.__sdpPokeStretch ?? 0);
    // grab near the centre and yank down-left to stretch the face — then HOLD.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.42);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.25, box.y + box.height * 0.78, { steps: 14 });
    await page.waitForTimeout(120);
    heldStretch = await stretch();
    // Keep holding STILL (no further movement). The bug was the face springing
    // straight back to rest here; with pull-and-hold it should stay deformed.
    await page.waitForTimeout(500);
    stayStretch = await stretch();
    await page.screenshot({ path: '.shots/poke.png' });
    await page.mouse.up();
    // Released → jelly springs home.
    await page.waitForTimeout(600);
    releasedStretch = await stretch();

    if (heldStretch < 15) bad(`JS: drag did not stretch the face (held displ ${heldStretch.toFixed(1)}px)`);
    if (stayStretch < heldStretch * 0.5)
      bad(`JS: stretch did not HOLD while pressed (held ${heldStretch.toFixed(1)} -> stayed ${stayStretch.toFixed(1)}px) — the "won't pull and stay" bug`);
    if (releasedStretch > stayStretch * 0.5)
      bad(`JS: face did not spring back after release (stayed ${stayStretch.toFixed(1)} -> released ${releasedStretch.toFixed(1)}px)`);
  }
  if (errors.length) bad(`JS: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
  console.log(
    `play     -> canvas=${!!canvas} held=${heldStretch.toFixed(1)} stay=${stayStretch.toFixed(1)} released=${releasedStretch.toFixed(1)} errors=${errors.length}`,
  );
  await ctx.close();
}

await browser.close();
console.log(fail ? `\n${fail} poke check(s) FAILED` : '\npoke checks passed.');
process.exit(fail ? 1 : 0);
