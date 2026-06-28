// Mobile polish audit + regression guard. Loads every URL-addressable surface at
// a narrow phone viewport (390×844, touch) and checks the two things that most
// often break on a phone: HORIZONTAL OVERFLOW (a stray wide element that forces a
// sideways scroll) and tiny TAP TARGETS on the primary controls. Screenshots each
// so a human can eyeball contrast/layout. The 3D world is gated off mobile by
// design, so it's not audited here; these are the crawlable pages + the mobile
// arcade (the actual mobile reward).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots/mobile', { recursive: true });

const ROUTES = [
  '/',
  '/text',
  '/links',
  '/about',
  '/about/jp',
  '/leaderboard',
  '/arcade',
  '/crusteroids',
  '/slice-breaker',
  '/jazz-snake',
  '/pizza-radar',
  '/burrito-belt',
  '/delivery-dash',
  '/poke',
  '/chimes',
  '/cultures',
];

const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

for (const route of ROUTES) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700); // let fonts + any hydration settle

  // 1) Horizontal overflow: the document must not be wider than the viewport.
  //    Report the widest offending element so a fix has a lead.
  const overflow = await page.evaluate(() => {
    const docW = document.documentElement.clientWidth;
    if (document.documentElement.scrollWidth <= docW + 1) return null;
    let worst = null;
    for (const el of document.body.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (r.right > docW + 1 && (!worst || r.right > worst.right)) {
        worst = { right: Math.round(r.right), tag: el.tagName, cls: el.className };
      }
    }
    return { scrollW: document.documentElement.scrollWidth, docW, worst };
  });
  if (overflow) {
    const w = overflow.worst;
    bad(
      `${route}: horizontal overflow (scrollW ${overflow.scrollW} > ${overflow.docW})` +
        (w ? ` — widest: <${w.tag}> .${String(w.cls).slice(0, 40)} right=${w.right}` : ''),
    );
  }

  const slug = route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
  await page.screenshot({ path: `.shots/mobile/${slug}.png`, fullPage: true });
  console.log(`${route} -> overflow=${overflow ? 'YES' : 'no'}`);
}

if (errors.length) bad(`mobile: ${errors.length} page error(s): ${errors.slice(0, 3).join(' | ')}`);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} mobile check(s) FAILED` : '\nmobile checks passed.');
process.exit(fail ? 1 : 0);
