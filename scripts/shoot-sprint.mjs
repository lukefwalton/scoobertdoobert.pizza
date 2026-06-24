// Verifies the sprint juice (Commit E): holding Shift while moving covers more
// ground than walking over the same wall-clock. Compares the two over equal
// durations, so the ratio holds regardless of the runner's frame rate.
import { chromium } from 'playwright';

const base = process.argv[2] || 'http://localhost:4173';
const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

const cam = () => page.evaluate(() => window.__sdpCam);
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);

// Measure how far holding `keys` for `ms` moves the camera, from a fresh spawn in
// the roomy poolrooms (no wall in reach over this short a press).
const run = async (keys) => {
  await page.goto(base + '/?room=poolrooms&debug=1', { waitUntil: 'networkidle' });
  await page
    .waitForFunction(() => !!window.__sdpCam, null, { timeout: 12000 })
    .catch(() => bad('cam hook never appeared'));
  await page.waitForTimeout(400);
  const a = await cam();
  for (const k of keys) await page.keyboard.down(k);
  await page.waitForTimeout(800);
  for (const k of keys) await page.keyboard.up(k);
  const b = await cam();
  return dist(a, b);
};

const walk = await run(['w']);
const sprint = await run(['w', 'Shift']);
const faster = sprint > walk * 1.3;
if (!faster) bad(`sprint (${sprint.toFixed(2)}) not clearly faster than walk (${walk.toFixed(2)})`);

if (errors.length) bad(`sprint: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `sprint -> walk=${walk.toFixed(2)} sprint=${sprint.toFixed(2)} faster=${faster} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} sprint check(s) FAILED` : '\nsprint checks passed.');
process.exit(fail ? 1 : 0);
