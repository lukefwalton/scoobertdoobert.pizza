// Verifies "Cultures" — the stir-to-play living-colony drone cabinet.
//   1. JS-OFF: /cultures prerenders to a real crawlable page (title + back
//      anchor), with NO live canvas (the instrument is a post-hydration enhancement).
//   2. The arcade page links to /cultures (the cabinet is discoverable).
//   3. JS ON: the canvas mounts, the colony sim runs, and dragging across the
//      glass herds the cells together so they breed notes — all without throwing.
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
  await page.goto(base + '/cultures', { waitUntil: 'load' });
  const title = await page.title();
  if (!title.includes('Cultures')) bad(`no-JS title unexpected -> ${JSON.stringify(title)}`);
  const back = await page.$('a[href="/arcade"]');
  if (!back) bad('no-JS: missing "back to the arcade" anchor');
  const canvas = await page.$('canvas');
  if (canvas) bad('no-JS: a <canvas> rendered into crawlable HTML (should be JS-only)');
  console.log(`no-JS    -> titled=${title.includes('Cultures')} back=${!!back} canvas=${!!canvas}`);
  await ctx.close();
}

// --- 2. discoverable from the arcade ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/arcade', { waitUntil: 'load' });
  const link = await page.$('a[href="/cultures"]');
  if (!link) bad('arcade: missing link to the /cultures cabinet');
  console.log(`arcade   -> cultures-link=${!!link}`);
  await ctx.close();
}

// --- 3. JS ON: the canvas mounts and a stir breeds notes + starts audio.
//        ?debug exposes window.__sdpCultures = { collisions, started, cells }. ---
{
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 900 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.goto(base + '/cultures?debug=1', { waitUntil: 'networkidle' });

  const canvas = await page
    .waitForSelector('.cultures-canvas', { timeout: 8000 })
    .catch(() => null);
  if (!canvas) bad('JS: cultures canvas did not mount');

  let cells = 0;
  let started = false;
  let bred = 0;
  let gainLive = null;
  let gainMuted = null;
  if (canvas) {
    const read = () =>
      page.evaluate(() => window.__sdpCultures ?? { collisions: 0, started: false, cells: 0 });
    await page.waitForTimeout(300);
    cells = (await read()).cells;
    if (cells !== 5) bad(`JS: expected 5 colony cells, saw ${cells}`);

    // Stir the colony in a tight circle near the centre to force the cells
    // together (they breed on contact). A real drag (pointer capture path).
    const box = await canvas.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 0; i < 48; i++) {
      const a = (i / 48) * Math.PI * 4;
      await page.mouse.move(cx + Math.cos(a) * 26, cy + Math.sin(a) * 26);
      await page.waitForTimeout(16);
    }
    // …then GATHER: hold near the centre with a tiny jitter so the pointer
    // attractor pulls all five cells onto the same point. Poll until they
    // actually collide (exit the instant they do) so the assertion no longer
    // depends on the random Perlin seed / initial layout — robust, not flaky.
    for (let i = 0; i < 120 && (await read()).collisions <= 0; i++) {
      await page.mouse.move(cx + Math.sin(i) * 3, cy + Math.cos(i) * 3);
      await page.waitForTimeout(16);
    }
    await page.mouse.up();
    await page.waitForTimeout(200);

    const after = await read();
    started = after.started;
    bred = after.collisions;
    if (!started) bad('JS: stirring did not start the audio engine');
    if (bred <= 0) bad('JS: stirring the colony bred no notes (no collisions)');
    await page.screenshot({ path: '.shots/cultures.png' });

    // Mute path (regression): the colony's CONTINUOUS drone bed must actually go
    // silent — master gain ramps to ~0 — when you hit ♪ OFF, not just stop
    // spawning collision voices. Read the engine's live master gain before/after.
    gainLive = await page.evaluate(() => window.__sdpCultures?.masterGain ?? null);
    await page.click('.cultures-btn'); // the ♪ ON/OFF toggle → mutes
    await page.waitForTimeout(500); // let master ramp down
    gainMuted = await page.evaluate(() => window.__sdpCultures?.masterGain ?? null);
    if (!(gainLive > 0.5)) bad(`JS: colony master not live after start (gain ${gainLive})`);
    if (!(gainMuted != null && gainMuted < 0.1))
      bad(`JS: colony did not mute — master gain ${gainMuted} (drone bed still audible)`);
  }
  if (errors.length) bad(`JS: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
  console.log(
    `play     -> canvas=${!!canvas} cells=${cells} started=${started} bred=${bred} gain=${gainLive}->${gainMuted} errors=${errors.length}`,
  );
  await ctx.close();
}

await browser.close();
console.log(fail ? `\n${fail} cultures check(s) FAILED` : '\ncultures checks passed.');
process.exit(fail ? 1 : 0);
