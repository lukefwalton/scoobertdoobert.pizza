// Playwright screenshot + content-assertion harness for self-verification.
//
//   node scripts/shoot.mjs [baseURL]
//
// Defaults to the `vite preview` server (http://localhost:4173). Captures the
// storefront and text-only page at desktop + mobile, the storefront with
// JavaScript DISABLED (the load-bearing fallback requirement), and the boot
// card. Beyond "did it 200", each shot asserts that expected fallback CONTENT
// actually rendered — so a prerender regression that still returns 200 fails
// here instead of passing unnoticed.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
const out = '.shots';
mkdirSync(out, { recursive: true });

const DESKTOP = { width: 1280, height: 900 };
const MOBILE = { width: 390, height: 844 };

// `assert` strings must appear in the page HTML for the shot to pass.
const shots = [
  {
    name: 'storefront-desktop',
    path: '/',
    viewport: DESKTOP,
    js: true,
    skipBoot: true,
    assert: ['Electronic Pizza Storefront', 'Sample Menu', 'open.spotify.com', 'Place Your Order'],
  },
  {
    name: 'storefront-desktop-nojs',
    path: '/',
    viewport: DESKTOP,
    js: false,
    skipBoot: true,
    // The whole point: real content + real anchors with JavaScript OFF.
    assert: ['Electronic Pizza Storefront', 'Sample Menu', 'open.spotify.com', 'www.surmado.com'],
  },
  { name: 'storefront-mobile', path: '/', viewport: MOBILE, js: true, skipBoot: true, assert: ['Electronic Pizza Storefront'] },
  {
    name: 'textonly-desktop',
    path: '/text',
    viewport: DESKTOP,
    js: true,
    skipBoot: true,
    assert: ["what's hot @ the .pizza?", 'open.spotify.com', 'Text-Only Menu', 'canonical'],
  },
  { name: 'boot-desktop', path: '/', viewport: DESKTOP, js: true, skipBoot: false, delayMs: 700, assert: ['PIZZA-DOS'] },
];

const browser = await chromium.launch();
let failures = 0;
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: s.viewport, javaScriptEnabled: s.js, deviceScaleFactor: 1 });
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
    const res = await page.goto(base + s.path, { waitUntil: s.delayMs ? 'commit' : 'networkidle', timeout: 15000 });
    if (s.delayMs) await page.waitForTimeout(s.delayMs);
    const status = res?.status() ?? 0;
    await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: !s.delayMs });

    const html = await page.content();
    const missing = (s.assert || []).filter((a) => !html.includes(a));
    const ok = status < 400 && missing.length === 0;
    if (!ok) failures++;
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(24)} js=${String(s.js).padEnd(5)} -> ${status}` +
        (missing.length ? `  MISSING: ${missing.join(', ')}` : ''),
    );
  } catch (err) {
    failures++;
    console.error(`FAIL  ${s.name}:`, err.message);
  }
  await ctx.close();
}
await browser.close();
console.log(failures ? `\n${failures} shot(s) failed.` : '\nAll shots passed (status + content).');
process.exit(failures ? 1 : 0);
