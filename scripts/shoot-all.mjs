// shoot:all — run the whole Playwright smoke suite against ONE preview server.
//
// Discovers every `shoot` / `shoot:*` script in package.json (so a new smoke is
// covered automatically — no list to keep in sync), starts a single `vite
// preview`, runs each smoke against it, and reports a pass/fail summary. Exits
// non-zero if any suite fails. This is the aggregate gate the CI workflow runs.
//
//   npm run build && npm run shoot:all
//
// Sharding (CI fan-out): `--shard=i/N` runs only this shard's slice of the suite, so
// the smokes can be spread across N runners — each with a FULL CPU, which the
// frame-timed WebGL walk-smokes need (in-process concurrency would starve their frame
// budget and reintroduce flakiness). The split is ROUND-ROBIN over the sorted list so
// the heavy suites land in different shards. No flag → run everything (local default).
//
//   npm run shoot:all -- --shard=1/4
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { parseShard, selectShard } from './lib/shard.mjs';

const args = process.argv.slice(2);

// Strict, fail-loud CLI (this is a CI gate, so an ambiguous invocation should error,
// not silently pick the first of a duplicate): exactly one optional positional (the
// base URL) and at most one --shard=i/N. Anything else — an unknown flag, extra
// positionals, a repeated --shard — is surfaced instead of quietly ignored.
const positionals = args.filter((a) => !a.startsWith('--'));
const shardFlags = args.filter((a) => a.startsWith('--shard='));
const unknown = args.find((a) => a.startsWith('--') && !a.startsWith('--shard='));
const cliError = unknown
  ? `unknown flag "${unknown}" (only --shard=i/N is supported)`
  : positionals.length > 1
    ? `too many positional args (${positionals.join(' ')}) — expected just a base URL`
    : shardFlags.length > 1
      ? `--shard given more than once (${shardFlags.join(' ')})`
      : null;
if (cliError) {
  console.error(`shoot:all: ${cliError}`);
  process.exit(1);
}

const BASE = positionals[0] || 'http://localhost:4173';
let shardIdx = 0;
let shardCount = 1;
if (shardFlags.length) {
  try {
    ({ shardIdx, shardCount } = parseShard(shardFlags[0].slice('--shard='.length)));
  } catch (e) {
    console.error(`shoot:all: ${e.message}`);
    process.exit(1);
  }
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

// The naming contract (also in README): `shoot` and every `shoot:*` script IS a
// CI smoke gate, discovered by name alone. So a non-gating helper/debug script
// must NOT use that prefix (name it `make-*`, put it in `lib/`, etc.) or it
// silently becomes a merge blocker.
const allSmokes = Object.keys(pkg.scripts)
  .filter((s) => (s === 'shoot' || s.startsWith('shoot:')) && s !== 'shoot:all')
  .sort();
const smokes = selectShard(allSmokes, shardIdx, shardCount);

// Fail CLOSED on an empty selection: a shard that runs nothing would exit 0 (no
// failures) — a false green. Over-sharding (count > suite total) or a discovery
// regression is a loud error, not a quiet pass.
if (smokes.length === 0) {
  console.error(
    `shoot:all: shard ${shardIdx + 1}/${shardCount} selected 0 of ${allSmokes.length} suites — nothing to run; refusing to pass an empty shard`,
  );
  process.exit(1);
}

const shardLabel = shardCount > 1 ? ` [shard ${shardIdx + 1}/${shardCount}]` : '';
console.log(
  `shoot:all — ${smokes.length}/${allSmokes.length} smoke suites${shardLabel} against ${BASE}`,
);
// Log THIS run's suite names up front — cheap CI forensics for "did shard N cover X?".
console.log(`  ${smokes.join(' ')}\n`);

// One preview server for all of them. Capture its output so a startup failure is
// debuggable (rather than a bare "never came up").
const preview = spawn('npm', ['run', 'preview'], { stdio: ['ignore', 'pipe', 'pipe'] });
let previewLog = '';
let previewExited = false;
preview.stdout.on('data', (d) => (previewLog += d));
preview.stderr.on('data', (d) => (previewLog += d));
preview.on('exit', () => (previewExited = true));
const stop = () => {
  try {
    preview.kill('SIGKILL');
  } catch {
    /* already gone */
  }
};
process.on('exit', stop);
process.on('SIGINT', () => {
  stop();
  process.exit(130);
});

const up = async () => {
  for (let i = 0; i < 80; i++) {
    // Fail fast: if preview died on startup, don't burn the whole poll budget
    // (~40s) waiting for a server that's never coming.
    if (previewExited) return false;
    try {
      const r = await fetch(BASE);
      if (r.ok) return true;
    } catch {
      /* not up yet */
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
};

if (!(await up())) {
  console.error('shoot:all: preview server never came up. preview output:\n' + previewLog);
  stop();
  process.exit(1);
}

// Run one suite once. Per-suite timeout so a hung smoke fails on its own (a clear
// "[timed out]" line) instead of stalling until the workflow's job cap. Raised to
// 300s (from 180s) to fit the heaviest walk smoke (shoot:mainstreet, 5 chained
// traversals at up to 45s/hop) on a slow/saturated CI runner where the WebGL loop
// drops to a few FPS and the CLAMPED per-frame movement covers less ground per
// wall-clock second. A PASSING suite releases early and never approaches this; the
// cap only bounds a genuinely-stuck run.
const PER_SUITE_TIMEOUT_MS = 300000;
const runOnce = (name) => {
  const t0 = Date.now();
  // Invoke the package script as declared (`npm run <name> -- <BASE>`) rather than
  // parsing out `node <file>`, so any future arg/env wrapper is preserved and the
  // "auto-discovered" claim can't silently drift from how the scripts actually run.
  const r = spawnSync('npm', ['run', name, '--', BASE], {
    encoding: 'utf8',
    timeout: PER_SUITE_TIMEOUT_MS,
  });
  const timedOut = r.error?.code === 'ETIMEDOUT';
  return {
    ok: !timedOut && r.status === 0,
    timedOut,
    r,
    secs: ((Date.now() - t0) / 1000).toFixed(0),
  };
};

const results = [];
for (const name of smokes) {
  let res = runOnce(name);
  // These are full-browser, frame-timed smokes on a shared CI runner; a single
  // slow-runner blip (a GLB decode or a frame stall just past a timeout) should
  // not redden the whole gate. Retry a failure ONCE — a real regression still
  // fails deterministically on the retry, so this absorbs flakiness without
  // hiding bugs. The retry is logged so chronic flakiness stays visible.
  const flaked = !res.ok;
  if (flaked) {
    console.log(
      `↻ ${name} failed (${res.secs}s)${res.timedOut ? ' [timed out]' : ''} — retrying once`,
    );
    res = runOnce(name);
  }
  results.push({ name, ok: res.ok, flaked: flaked && res.ok });
  console.log(
    `${res.ok ? '✓' : '✗'} ${name}  (${res.secs}s)${res.timedOut ? ' [timed out]' : ''}${flaked && res.ok ? ' [passed on retry]' : ''}`,
  );
  if (!res.ok) {
    const lines = `${res.r.stdout || ''}\n${res.r.stderr || ''}`
      .split('\n')
      .filter((l) => /FAIL|Error|never|did not|->/.test(l))
      .slice(0, 5);
    for (const l of lines) console.log(`    ${l}`);
  }
}

stop();
const failed = results.filter((r) => !r.ok);
const flaky = results.filter((r) => r.flaked);
console.log(`\n${results.length - failed.length}/${results.length} suites passed`);
if (failed.length) console.log(`FAILED: ${failed.map((f) => f.name).join(', ')}`);
// Keep intermittent suites visible even on a green run, so flakiness doesn't hide
// behind the retry: a recurring name here is a smoke worth hardening.
if (flaky.length) console.log(`FLAKY (passed on retry): ${flaky.map((f) => f.name).join(', ')}`);
process.exit(failed.length ? 1 : 0);
