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
import { launchSmoke } from './lib/smoke.mjs';
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
    assert: ['Electronic Pizza Storefront', 'Sample Menu', 'open.spotify.com', 'Order Online'],
  },
  {
    name: 'storefront-desktop-nojs',
    path: '/',
    viewport: DESKTOP,
    js: false,
    skipBoot: true,
    // The whole point: real content + real anchors with JavaScript OFF.
    assert: ['Electronic Pizza Storefront', 'Sample Menu', 'open.spotify.com', 'beformer.co'],
  },
  {
    name: 'storefront-mobile',
    path: '/',
    viewport: MOBILE,
    js: true,
    skipBoot: true,
    assert: ['Electronic Pizza Storefront'],
  },
  {
    name: 'textonly-desktop',
    path: '/text',
    viewport: DESKTOP,
    js: true,
    skipBoot: true,
    assert: ['Listen on Spotify', 'open.spotify.com', 'Text-Only Menu', 'canonical'],
  },
  // The storefront no longer renders a boot card — the PIZZA-DOS loading screen
  // moved to the descent (the level load). shoot-descent.mjs asserts it there.
];

// Shared launch / fail-counter / teardown (the same harness the rest of the
// shoot:* suite uses). This smoke creates a fresh context per shot in the loop,
// so it takes the bare launchSmoke() and builds each context itself.
const { browser, fail, finish, failures } = await launchSmoke();
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
    await page.screenshot({ path: `${out}/${s.name}.png`, fullPage: !s.delayMs });

    const html = await page.content();
    const missing = (s.assert || []).filter((a) => !html.includes(a));
    const line =
      `${s.name.padEnd(24)} js=${String(s.js).padEnd(5)} -> ${status}` +
      (missing.length ? `  MISSING: ${missing.join(', ')}` : '');
    if (status < 400 && missing.length === 0) console.log(`PASS  ${line}`);
    else fail(line);
  } catch (err) {
    fail(`${s.name}: ${err.message}`);
  }
  await ctx.close();
}
await finish('\nAll shots passed (status + content).', `\n${failures()} shot(s) failed.`);
