// Dread layer smoke (Phase 5). Two guarantees:
//  1. SAFETY — the output brickwall LIMITER exists on the audio graph, so no
//     sum of sources (music + dread bed + train SFX) can spike the speakers.
//  2. DOSAGE — `unease` rises in the bitter deep rooms but stays SWEET at the
//     surface and in the shrine relief beat (the contrast is the whole point).
// Reads the live value off the ?debug DREAD overlay; drives the audio singleton
// directly via the gated __sdpAudio test hook.
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

// ── 1. the limiter guard ────────────────────────────────────────────────────
await page.goto(base + '/?debug', { waitUntil: 'networkidle' });
// Build the audio graph without needing a real gesture (hook is exposed by ?debug).
const lim = await page.evaluate(() => {
  const a = window.__sdpAudio;
  if (!a) return { hook: false };
  a.unlock(); // → ensure(): builds master → limiter → destination
  const l = a.outputLimiter;
  return {
    hook: true,
    kind: l ? l.constructor.name : null,
    threshold: l ? l.threshold.value : null,
    ratio: l ? l.ratio.value : null,
  };
});
if (!lim.hook) bad('audio test hook (__sdpAudio) not exposed under ?debug');
else if (lim.kind !== 'DynamicsCompressorNode') bad(`no output limiter — got ${lim.kind}`);
else if (lim.threshold > -1 || lim.ratio < 8)
  bad(`limiter not configured as a brickwall (threshold=${lim.threshold}, ratio=${lim.ratio})`);

// ── 2. the dosage curve ─────────────────────────────────────────────────────
const uneaseAt = async (query, settleMs = 4200) => {
  await page.goto(base + query, { waitUntil: 'commit' });
  // wait for the DREAD overlay, then let unease ease to the zone's resting value
  await page.waitForFunction(() => /unease \d/.test(document.body.textContent || ''), null, { timeout: 8000 });
  await page.waitForTimeout(settleMs);
  const txt = (await page.textContent('body')) || '';
  const m = txt.match(/unease (\d\.\d+)/);
  return m ? Number(m[1]) : NaN;
};

const surface = await uneaseAt('/?debug', 1500);
if (!(surface < 0.06)) bad(`surface (storefront) not sweet: unease=${surface}`);

const classified = await uneaseAt('/?room=classified&debug');
if (!(classified > 0.5)) bad(`classified did not rise into the bitter band: unease=${classified}`);

const shrine = await uneaseAt('/?room=shrine&debug');
if (!(shrine < 0.1)) bad(`shrine relief beat is not sweet: unease=${shrine}`);

const metro = await uneaseAt('/?room=metro-tunnel&debug');
if (!(metro > 0.3 && metro < 0.72)) bad(`metro-tunnel not in the moderate band: unease=${metro}`);

await browser.close();
console.log(
  `dread -> limiter=${lim.kind} | surface=${surface} classified=${classified} shrine=${shrine} metro=${metro}`,
);
console.log(fail ? `\n${fail} dread check(s) FAILED` : '\ndread checks passed.');
process.exit(fail ? 1 : 0);
