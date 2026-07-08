// Dread layer smoke (Phase 5). Two guarantees:
//  1. SAFETY — the output brickwall LIMITER exists on the audio graph, so no
//     sum of sources (music + dread bed + train SFX) can spike the speakers.
//  2. DOSAGE — `unease` rises in the bitter deep rooms but stays SWEET at the
//     surface and in the shrine relief beat (the contrast is the whole point).
// Reads the live value off the ?debug DREAD overlay; drives the audio singleton
// directly via the gated __sdpAudio test hook.
import { startSmoke } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
const { page, fail: bad, finish, failures } = await startSmoke();

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
  await page.waitForFunction(() => /unease \d/.test(document.body.textContent || ''), null, {
    timeout: 8000,
  });
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

// ── 3. the curdle — unease finally degrades the MUSIC (bitcrush/wobble/dropouts) ──
// Drive setDreadLevel directly through the gated singleton: at u=1 the insert must
// be wet + rolling dropout dice; back at u=0 it must return to exact passthrough
// (the surface stays clean). Then force one dropout and watch the dedicated gain
// DIP and FADE BACK — the recovery is pre-scheduled in the same call, so this is
// deterministic (the WCAG "never spike, always fade back" audio rule, machine-checked).
const curdle = await page.evaluate(async () => {
  const a = window.__sdpAudio;
  if (!a) return { hook: false };
  a.unlock();
  a.setDreadLevel(1);
  const deep = window.__sdpCurdle;
  a.setDreadLevel(0);
  const clean = window.__sdpCurdle;
  return { hook: true, deep, clean };
});
if (!curdle.hook) bad('__sdpAudio not exposed for the curdle check');
else {
  if (!(curdle.deep && curdle.deep.wet > 0.3 && curdle.deep.dropoutChance > 0.02))
    bad(`deep curdle not engaged at u=1: ${JSON.stringify(curdle.deep)}`);
  if (!(curdle.clean && curdle.clean.wet === 0 && curdle.clean.dropoutChance === 0))
    bad(`curdle did not return to passthrough at u=0: ${JSON.stringify(curdle.clean)}`);
}

// The dropout shape check needs the audio CLOCK actually advancing (automation
// runs on ctx time), and that takes a real user gesture — a key press counts.
await page.keyboard.press('q');
const ctxState = await page.evaluate(() => {
  const a = window.__sdpAudio;
  a?.unlock();
  return a?.outputLimiter?.context.state ?? 'missing';
});
if (ctxState !== 'running') bad(`audio ctx not running after a gesture (${ctxState})`);

const dropout = await page.evaluate(async () => {
  const a = window.__sdpAudio;
  if (!a) return { hook: false };
  const at = (ms) => new Promise((r) => setTimeout(r, ms));
  const rest = a.curdleLevel;
  a.forceDropout();
  await at(300);
  const dipped = a.curdleLevel;
  await at(2200);
  const recovered = a.curdleLevel;
  return { hook: true, rest, dipped, recovered };
});
if (!dropout.hook) bad('__sdpAudio not exposed for the dropout check');
else {
  if (!(dropout.dipped < 0.5))
    bad(`forceDropout did not dip the curdle gain (rest=${dropout.rest} dipped=${dropout.dipped})`);
  if (!(dropout.recovered > 0.85))
    bad(`dropout did not FADE BACK within ~2.5s (recovered=${dropout.recovered}) — WCAG audio rule`);
}

console.log(
  `dread -> limiter=${lim.kind} | surface=${surface} classified=${classified} shrine=${shrine} metro=${metro} ` +
    `| curdle deep=${JSON.stringify(curdle.deep)} clean=${JSON.stringify(curdle.clean)} dropout dip=${dropout.dipped?.toFixed?.(3)} rec=${dropout.recovered?.toFixed?.(3)}`,
);
await finish('\ndread checks passed.', `\n${failures()} dread check(s) FAILED`);
