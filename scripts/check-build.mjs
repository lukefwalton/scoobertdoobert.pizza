// Post-build smoke check. The SSG / MPA contract says both documents must exist
// as real prerendered HTML containing their real content — not SPA fallbacks.
// Runs automatically after `npm run build` (and on Vercel), failing the build on
// a quiet config regression.
//
// vite-react-ssg emits the text-only route as dist/text.html. We accept either
// that or a nested dist/text/index.html so this guard stays correct if the SSG
// output shape ever changes.
import { existsSync, readFileSync, readdirSync } from 'node:fs';

function hasContent(file, needle) {
  return existsSync(file) && readFileSync(file, 'utf8').includes(needle);
}

const cases = [
  { label: 'storefront (/)', files: ['dist/index.html'], needle: 'Electronic Pizza Storefront' },
  {
    label: 'text-only (/text)',
    files: ['dist/text.html', 'dist/text/index.html'],
    needle: 'Text-Only Menu',
  },
  {
    label: 'leaderboard (/leaderboard)',
    files: ['dist/leaderboard.html', 'dist/leaderboard/index.html'],
    needle: 'HIGH SCORES',
  },
];

let failed = 0;
for (const c of cases) {
  const hit = c.files.find((f) => hasContent(f, c.needle));
  if (hit) {
    console.log(`  ok ${c.label} -> ${hit}`);
  } else {
    console.error(`  x ${c.label}: none of [${c.files.join(', ')}] contain "${c.needle}"`);
    failed++;
  }
}

// Provenance guard: every shipped 3D model (dist/models/*.glb) must have an entry
// in THIRD_PARTY_NOTICES.md, so a bundled third-party asset can't drift into the
// release without an attribution row. We only require the filename be PRESENT —
// the exact license text is Luke's to fill in (TODO(license) is allowed); a model
// with no row at all fails the build.
const NOTICES = 'THIRD_PARTY_NOTICES.md';
const modelsDir = 'dist/models';
if (existsSync(modelsDir)) {
  const notices = existsSync(NOTICES) ? readFileSync(NOTICES, 'utf8') : '';
  for (const glb of readdirSync(modelsDir).filter((f) => f.toLowerCase().endsWith('.glb'))) {
    if (notices.includes(glb)) {
      console.log(`  ok shipped model ${glb} -> has a ${NOTICES} entry`);
    } else {
      console.error(`  x shipped model ${glb}: no entry in ${NOTICES} (add an attribution row)`);
      failed++;
    }
  }
}

if (failed) {
  console.error(`\npost-build check FAILED (${failed}).`);
  process.exit(1);
}
console.log('post-build check passed.');
