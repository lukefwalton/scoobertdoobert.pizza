// Post-build smoke check. The SSG / MPA contract says both documents must exist
// as real prerendered HTML containing their real content — not SPA fallbacks.
// Runs automatically after `npm run build` (and on Vercel), failing the build on
// a quiet config regression.
//
// vite-react-ssg emits the text-only route as dist/text.html. We accept either
// that or a nested dist/text/index.html so this guard stays correct if the SSG
// output shape ever changes.
import { existsSync, readFileSync } from 'node:fs';

function hasContent(file, needle) {
  return existsSync(file) && readFileSync(file, 'utf8').includes(needle);
}

const cases = [
  { label: 'storefront (/)', files: ['dist/index.html'], needle: 'Electronic Pizza Storefront' },
  { label: 'text-only (/text)', files: ['dist/text.html', 'dist/text/index.html'], needle: 'Text-Only Menu' },
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

if (failed) {
  console.error(`\npost-build check FAILED (${failed}).`);
  process.exit(1);
}
console.log('post-build check passed.');
