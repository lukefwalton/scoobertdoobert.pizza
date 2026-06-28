// Verifies the sprint juice (Commit E): holding Shift while moving covers more
// ground than walking over the same wall-clock. Compares the two over equal
// durations, so the ratio holds regardless of the runner's frame rate.
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

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

console.log(
  `sprint -> walk=${walk.toFixed(2)} sprint=${sprint.toFixed(2)} faster=${faster} errors=${failures()}`,
);

await ctx.close();
await finish('\nsprint checks passed.', `\n${failures()} sprint check(s) FAILED`);
