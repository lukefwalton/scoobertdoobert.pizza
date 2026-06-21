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

const results = [];
for (const name of smokes) {
  // Invoke the package script as declared (`npm run <name> -- <BASE>`) rather than
  // parsing out `node <file>`, so any future arg/env wrapper is preserved and the
  // "auto-discovered" claim can't silently drift from how the scripts actually run.
  const t0 = Date.now();
  // Per-suite timeout so one hung smoke fails on its own (a clear "timed out"
  // line) instead of stalling the whole run until the workflow's 20-min job
  // timeout kills it with no useful signal.
  const r = spawnSync('npm', ['run', name, '--', BASE], { encoding: 'utf8', timeout: 180000 });
  const timedOut = r.error?.code === 'ETIMEDOUT';
  const ok = !timedOut && r.status === 0;
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  results.push({ name, ok });
  console.log(`${ok ? '✓' : '✗'} ${name}  (${secs}s)${timedOut ? ' [timed out]' : ''}`);
  if (!ok) {
    const lines = `${r.stdout || ''}\n${r.stderr || ''}`
      .split('\n')
      .filter((l) => /FAIL|Error|never|did not|->/.test(l))
      .slice(0, 5);
    for (const l of lines) console.log(`    ${l}`);
  }
}

stop();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} suites passed`);
if (failed.length) console.log(`FAILED: ${failed.map((f) => f.name).join(', ')}`);
process.exit(failed.length ? 1 : 0);
