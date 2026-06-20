// Playwright screenshot harness for self-verification.
//
//   node scripts/shoot.mjs [baseURL]
//
// Defaults to the `vite preview` server (http://localhost:4173). Captures the
// storefront and text-only page at desktop + mobile, the storefront with
// JavaScript DISABLED (the load-bearing fallback requirement), and the boot
// card. The page shots seed sessionStorage so the once-per-session boot card
// doesn't cover them; the boot shot deliberately doesn't.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
const out = '.shots';
mkdirSync(out, { recursive: true });

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

const shots = [
  { name: 'storefront-desktop', path: '/', viewport: DESKTOP, js: true, skipBoot: true },
  { name: 'storefront-desktop-nojs', path: '/', viewport: DESKTOP, js: false, skipBoot: true },
  { name: 'storefront-mobile', path: '/', viewport: MOBILE, js: true, skipBoot: true },
  { name: 'textonly-desktop', path: '/text', viewport: DESKTOP, js: true, skipBoot: true },
  { name: 'boot-desktop', path: '/', viewport: DESKTOP, js: true, skipBoot: false, delayMs: 700 },
];

const browser = await chromium.launch();
let failures = 0;
for (const s of shots) {
  const ctx = await browser.newContext({
    viewport: s.viewport,
    javaScriptEnabled: s.js,
    deviceScaleFactor: 1,
  });
  if (s.skipBoot) {
    await ctx.addInitScript(() => {
      try {
        sessionStorage.setItem('sdp_booted', '1');
      } catch {
        /* ignore */
      }
    });
  }
  const page = await ctx.newPage();
  try {
    const res = await page.goto(base + s.path, {
      waitUntil: s.delayMs ? 'commit' : 'networkidle',
      timeout: 15000,
    });
    if (s.delayMs) await page.waitForTimeout(s.delayMs);
    const status = res?.status() ?? 0;
    if (status >= 400) failures++;
    await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: !s.delayMs });
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
