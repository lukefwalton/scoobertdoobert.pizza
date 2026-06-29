// Verifies The Aerial (テルミン) — the deep theremin instrument room off the liminal
// level — AND its proximity-played voice:
//  - the ?room=theremin test entrance drops in, the procedural scene renders
//    without throwing, the HUD names it;
//  - the new sustained voice is driven by DISTANCE to the device: stepping into the
//    field starts it, stepping closer raises the pitch, stepping out silences it.
// The proximity logic is the pure, unit-tested src/lib/theremin mapping; this drives
// the REAL per-frame path (camera → distance → voice → readout) via a deterministic
// teleport hook (__sdpThereminMoveTo), so the audio wiring is exercised without
// flaky physical walking. Any throw from the geometry/audio is caught by pageerror.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

// ?room=theremin drops straight in (it's otherwise a side door off the liminal);
// &debug=1 exposes the theremin test hooks.
await page.goto(base + '/?room=theremin&debug=1', { waitUntil: 'networkidle' });

const canvas = await page.waitForSelector('canvas', { timeout: 15000 }).catch(() => null);
if (!canvas) bad('theremin: world canvas never mounted');

const title =
  (await page.waitForSelector('.hud-room', { timeout: 8000 }).catch(() => null)) &&
  (await page.textContent('.hud-room').catch(() => ''))?.trim();
if (title !== 'The Aerial')
  bad(`theremin: HUD room is ${JSON.stringify(title)}, expected "The Aerial"`);

// Let the cosmic scene settle (stars + the device + materials compile), dismiss the
// first-entry overlay (best-effort), then shoot.
await page.waitForTimeout(2400);
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
await page.waitForTimeout(500);
await page.screenshot({ path: '.shots/theremin.png' });

// ── the proximity-played voice ──────────────────────────────────────────────────
const hasHooks = await page.evaluate(
  () => typeof window.__sdpThereminMoveTo === 'function' && !!window.__sdpTheremin,
);
if (!hasHooks) bad('theremin: test hooks (__sdpThereminMoveTo / __sdpTheremin) missing');

const probe = async (dist) => {
  await page.evaluate((d) => window.__sdpThereminMoveTo && window.__sdpThereminMoveTo(d), dist);
  await page.waitForTimeout(300); // a few frames: distance → mapping → voice → readout
  return page.evaluate(() => window.__sdpTheremin);
};

// Near the device: it should SING — the sustained voice was acquired on this fresh
// deep-link (hasVoice — the lifecycle path, no extra gesture), playing a real pitch
// in the bounded window.
const near = await probe(2.0);
const nearOk =
  near &&
  near.hasVoice === true &&
  near.playing === true &&
  near.gain > 0.01 &&
  near.freq >= 210 &&
  near.freq <= 680;
if (!nearOk)
  bad(
    `theremin: fresh-load should acquire the voice + play a bounded pitch (got ${JSON.stringify(near)})`,
  );

// Farther (still inside): the pitch + volume should DROP (the glide is monotonic).
const far = await probe(3.4);
const droppedOk =
  far && far.playing === true && far.freq < (near?.freq ?? 0) && far.gain < (near?.gain ?? 0);
if (!droppedOk)
  bad(
    `theremin: walking away should lower pitch + volume (near ${JSON.stringify(near)}, far ${JSON.stringify(far)})`,
  );

// Outside the field: SILENT (no sound thrust across the room).
const out = await probe(6.0);
const silentOk = out && out.playing === false && out.gain <= 0.001;
if (!silentOk) bad(`theremin: outside the field it should be silent (got ${JSON.stringify(out)})`);

console.log(
  `theremin -> canvas=${!!canvas} room=${JSON.stringify(title)} near=${near?.freq}Hz far=${far?.freq}Hz silent=${silentOk} errors=${failures()}`,
);

await ctx.close();
await finish('\ntheremin checks passed.', `\n${failures()} theremin check(s) FAILED`);
