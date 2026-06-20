// Post-build smoke check. The SSG / MPA contract says both documents must exist
// as real prerendered HTML containing their real content — not SPA fallbacks.
// Runs automatically after `npm run build` (and on Vercel), failing the build on
// a quiet config regression.
import { existsSync, readFileSync } from 'node:fs';

const checks = [
  ['dist/index.html', 'Electronic Pizza Storefront'],
  ['dist/text.html', 'Text-Only Menu'],
];

let failed = 0;
for (const [file, needle] of checks) {
  if (!existsSync(file)) {
    console.error(`  x missing ${file}`);
    failed++;
  } else if (!readFileSync(file, 'utf8').includes(needle)) {
    console.error(`  x ${file} missing expected content: "${needle}"`);
    failed++;
  } else {
    console.log(`  ok ${file}`);
  }
}

if (failed) {
  console.error(`\npost-build check FAILED (${failed}).`);
  process.exit(1);
}
console.log('post-build check passed.');
