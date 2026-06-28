// Leaderboard smoke. There's no serverless runtime under `vite preview`, so this
// can't exercise the real Vercel Blob backend — instead it proves the parts that
// must hold without it:
//   • /leaderboard is a REAL crawlable document (JS-off): the marquee + a cold board
//     + a real "back to storefront" anchor (no SPA shell, no dead end);
//   • with JS it mounts the live board, renders the CRAZY gifs, and DEGRADES
//     GRACEFULLY when /api/score is absent (offline notices, never a thrown error);
//   • the initials entry + ADD button work and report the offline state;
//   • the same board is wired into the in-world pause menu.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

// ── 1. JS-OFF: a real crawlable document ─────────────────────────────────────
const noJs = await browser.newContext({ javaScriptEnabled: false });
const p0 = await noJs.newPage();
await p0.goto(base + '/leaderboard', { waitUntil: 'commit' });
const html = (await p0.content()) || '';
const crawlMarquee = /HIGH SCORES/.test(html);
const crawlCold = /PIZZA POINTS HIGH SCORES/.test(html);
const crawlBack = (await p0.$('a[href="/"]').then((e) => !!e)) || /href="\/"/.test(html);
if (!crawlMarquee) bad('leaderboard: JS-off HTML missing the "HIGH SCORES" marquee');
if (!crawlCold) bad('leaderboard: JS-off HTML missing the cold-board text');
if (!crawlBack) bad('leaderboard: JS-off HTML missing a real back-to-storefront anchor');
await noJs.close();

// ── 2. JS-ON: live board, the gifs, graceful offline ─────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() !== 'error') return;
  // The /api/score 404s are EXPECTED here — there's no serverless runtime under
  // `vite preview`. They're exactly the offline path this smoke verifies degrades
  // gracefully, so they don't count as page errors.
  const url = m.location()?.url || '';
  if (url.includes('/api/')) return;
  errors.push(m.text());
});

// Seed a non-zero best so the "sign your score" entry shows.
await page.goto(base + '/leaderboard', { waitUntil: 'commit' });
await page.evaluate(() =>
  localStorage.setItem('sdp_progress_v1', JSON.stringify({ pizzaPointsBest: 1234 })),
);
await page.goto(base + '/leaderboard', { waitUntil: 'networkidle' });

const board = await page.waitForSelector('.hud-board', { timeout: 8000 }).catch(() => null);
if (!board) bad('leaderboard: the live board never mounted');

// the CRAZY gifs are on the page
const gifTrophy = await page.$('img[src="/gifs/trophy.gif"]').then((e) => !!e);
const gifFlames = await page.$('img[src="/gifs/flames.gif"]').then((e) => !!e);
const gifPizza = await page.$('img[src="/gifs/dancing-pizza.gif"]').then((e) => !!e);
const coinRain = await page.$$('.lb-coins').then((a) => a.length >= 2);
if (!gifTrophy) bad('leaderboard: the trophy gif is missing');
if (!gifFlames) bad('leaderboard: the flames gif is missing');
if (!gifPizza) bad('leaderboard: the dancing-pizza gif is missing');
if (!coinRain) bad('leaderboard: the coin-rain margins are missing');

// graceful GET degrade: no backend → "offline" notice (not a crash)
const offlineOnMount = await page
  .waitForFunction(() => /offline/i.test(document.querySelector('.hud-board')?.textContent || ''), null, {
    timeout: 6000,
  })
  .then(
    () => true,
    () => false,
  );
if (!offlineOnMount) bad('leaderboard: the board did not report offline gracefully on load');

// the initials entry + ADD, and the graceful POST degrade
let submitGraceful = false;
const input = await page.$('.hud-board__initials');
if (!input) bad('leaderboard: no initials input (is the seeded best showing?)');
else {
  await input.fill('ABC');
  const go = await page.$('.hud-board__go');
  const disabled = await go.isDisabled();
  if (disabled) bad('leaderboard: ADD stayed disabled with a best + three initials');
  await go.click();
  submitGraceful = await page
    .waitForFunction(
      () => /saved here|you're #|made the board/i.test(document.querySelector('.hud-board')?.textContent || ''),
      null,
      { timeout: 6000 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!submitGraceful) bad('leaderboard: submitting did not report a result (offline or ranked)');
}

await page.screenshot({ path: '.shots/leaderboard.png' });

// ── 3. the same board is in the in-world pause menu ───────────────────────────
await page.goto(base + '/?world=1', { waitUntil: 'commit' });
await page.waitForSelector('.hud-menu-btn', { timeout: 12000 }).catch(() => bad('world never mounted'));
await page.keyboard.press('Escape');
await page.waitForSelector('.hud-pause', { timeout: 6000 }).catch(() => bad('pause menu did not open'));
const inPause = await page.$('.hud-pause .hud-board').then((e) => !!e);
if (!inPause) bad('leaderboard: the board is not wired into the pause menu');

if (errors.length) bad(`leaderboard: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `leaderboard -> crawl(marquee=${crawlMarquee} cold=${crawlCold} back=${crawlBack}) ` +
    `gifs(trophy=${gifTrophy} flames=${gifFlames} pizza=${gifPizza} coins=${coinRain}) ` +
    `offlineOnMount=${offlineOnMount} submitGraceful=${submitGraceful} pauseMenu=${inPause} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} leaderboard check(s) FAILED` : '\nleaderboard checks passed.');
process.exit(fail ? 1 : 0);
