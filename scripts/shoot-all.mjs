// shoot:all — run the whole Playwright smoke suite against ONE preview server.
//
// Discovers every `shoot` / `shoot:*` script in package.json (so a new smoke is
// covered automatically — no list to keep in sync), starts a single `vite
// preview`, runs each smoke against it, and reports a pass/fail summary. Exits
// non-zero if any suite fails. This is the aggregate gate the CI workflow runs.
//
//   npm run build && npm run shoot:all
import { spawn, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const BASE = process.argv[2] || 'http://localhost:4173';
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

// The naming contract (also in README): `shoot` and every `shoot:*` script IS a
// CI smoke gate, discovered by name alone. So a non-gating helper/debug script
// must NOT use that prefix (name it `make-*`, put it in `lib/`, etc.) or it
// silently becomes a merge blocker.
const smokes = Object.keys(pkg.scripts)
  .filter((s) => (s === 'shoot' || s.startsWith('shoot:')) && s !== 'shoot:all')
  .sort();

console.log(`shoot:all — ${smokes.length} smoke suites against ${BASE}\n`);

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
// "[timed out]" line) instead of stalling until the workflow's 20-min job cap.
const runOnce = (name) => {
  const t0 = Date.now();
  // Invoke the package script as declared (`npm run <name> -- <BASE>`) rather than
  // parsing out `node <file>`, so any future arg/env wrapper is preserved and the
  // "auto-discovered" claim can't silently drift from how the scripts actually run.
  const r = spawnSync('npm', ['run', name, '--', BASE], { encoding: 'utf8', timeout: 180000 });
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
