// Playwright screenshot harness for self-verification.
//
//   node scripts/shoot.mjs [baseURL]
//
// Defaults to the `vite preview` server (http://localhost:4173). Captures the
// storefront and the text-only page at desktop + mobile, and — crucially — the
// storefront with JavaScript DISABLED, which is the load-bearing requirement
// for the fallback layer. Output PNGs land in .shots/ (gitignored).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
const out = '.shots';
mkdirSync(out, { recursive: true });

const shots = [
  { name: 'storefront-desktop', path: '/', viewport: { width: 1280, height: 900 }, js: true },
  { name: 'storefront-desktop-nojs', path: '/', viewport: { width: 1280, height: 900 }, js: false },
  { name: 'storefront-mobile', path: '/', viewport: { width: 390, height: 844 }, js: true },
  { name: 'textonly-desktop', path: '/text', viewport: { width: 1280, height: 900 }, js: true },
];

const browser = await chromium.launch();
let failures = 0;
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: s.viewport,
    javaScriptEnabled: s.js,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  try {
    const res = await page.goto(base + s.path, { waitUntil: 'networkidle', timeout: 15000 });
    const status = res?.status() ?? 0;
    if (status >= 400) failures++;
    await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: true });
    console.log(`${s.name.padEnd(26)} ${s.path.padEnd(6)} js=${String(s.js).padEnd(5)} -> ${status}`);
  } catch (err) {
    failures++;
    console.error(`${s.name} FAILED:`, err.message);
  }
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} shot(s) had problems.` : '\nAll shots OK.');
process.exit(failures ? 1 : 0);
