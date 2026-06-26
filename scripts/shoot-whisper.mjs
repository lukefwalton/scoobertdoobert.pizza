// Perception-whisper smoke: entering a room with a curated lore whisper surfaces a
// "✦ You notice…" toast (a Perception check on first entry). With &debug the check
// always succeeds (deterministic), so this pins the wiring: the right whisper for
// the room, exposed on __sdpWhisper, and a sweet info toast — without depending on
// the random d20. Also checks a whisper-less room (the safe shop) stays quiet.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();
let errors = 0;
const bad = (m) => {
  errors++;
  console.log('FAIL:', m);
};
watchPageErrors(page, bad);

// ?room=california drops straight into a whisper room; &debug forces the check to
// succeed so the whisper is deterministic.
await page.goto(base + '/?room=california&debug=1', { waitUntil: 'commit' });
const canvas = await page.waitForSelector('canvas', { timeout: 12000 }).catch(() => null);
if (!canvas) bad('whisper: world canvas never mounted');

// The whisper fires ~1.2s after arrival (a beat after the room's own toast).
const whispered = await page
  .waitForFunction(() => window.__sdpWhisper?.room === 'california', null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!whispered) bad('whisper: entering california never surfaced its lore whisper');

const text = await page.evaluate(() => window.__sdpWhisper?.text ?? '');
if (!/california/i.test(text))
  bad(`whisper: the california whisper text looks wrong: ${JSON.stringify(text)}`);

// The ✦ info toast must actually show.
const toast = await page.waitForSelector('.hud-toast--info', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (!toast) bad('whisper: no info toast appeared for the whisper');
await page.screenshot({ path: '.shots/whisper.png' });

// A whisper-less room (the safe shop) must NOT whisper — jump there and confirm
// __sdpWhisper does not flip to it.
await page.evaluate(() => {
  if (typeof window.__sdpGoToRoom === 'function') window.__sdpGoToRoom('shop', 'default');
});
await page.waitForTimeout(2200); // past the wipe + the whisper delay window
const shopWhispered = await page.evaluate(() => window.__sdpWhisper?.room === 'shop');
if (shopWhispered) bad('whisper: the safe shop should have nothing to notice, but it whispered');

await ctx.close();
await browser.close();
console.log(
  `whisper: california=${whispered} toast=${toast} shopQuiet=${!shopWhispered} | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
