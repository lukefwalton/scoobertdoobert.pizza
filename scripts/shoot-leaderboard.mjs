// Leaderboard smoke. There's no serverless runtime under `vite preview`, so this
// can't exercise the real Vercel Blob backend — instead it proves the parts that
// must hold without it:
//   • /leaderboard is a REAL crawlable document (JS-off): the marquee + a cold board
//     + a real "back to storefront" anchor (no SPA shell, no dead end);
//   • with JS it mounts the live board, renders the CRAZY gifs, and DEGRADES
//     GRACEFULLY when /api/score is absent (offline notices, never a thrown error);
//   • the initials entry + ADD button work and report the offline state;
//   • the same board is wired into the in-world pause menu.
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail: bad, finish, failures } = await launchSmoke();

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
  .waitForFunction(
    () => /offline/i.test(document.querySelector('.hud-board')?.textContent || ''),
    null,
    {
      timeout: 6000,
    },
  )
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
      () =>
        /saved here|you're #|keep climbing|made the board/i.test(
          document.querySelector('.hud-board')?.textContent || '',
        ),
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
await page
  .waitForSelector('.hud-menu-btn', { timeout: 12000 })
  .catch(() => bad('world never mounted'));
await page.keyboard.press('Escape');
await page
  .waitForSelector('.hud-pause', { timeout: 6000 })
  .catch(() => bad('pause menu did not open'));
const inPause = await page.$('.hud-pause .hud-board').then((e) => !!e);
if (!inPause) bad('leaderboard: the board is not wired into the pause menu');

// ── 4. the "you" strip: own rank + gap-to-next + neighbors ───────────────────
// There's no serverless backend under `vite preview`, so MOCK /api/score to prove the
// new render path: a player OUTSIDE the top-N sees "You're #N, X to climb" + the real
// entries around them (true ranks, a highlighted YOU row spliced in at score order).
let youStripOk = false;
{
  const board = [
    { initials: 'AAA', score: 100 },
    { initials: 'BBB', score: 90 },
    { initials: 'CCC', score: 90 },
    { initials: 'DDD', score: 50 },
    { initials: 'EEE', score: 20 },
  ];
  const mockCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  // Seed a best of 60 → would-be rank 4 (3 strictly above), gap 30 (to the 90s).
  await mockCtx.addInitScript(() => {
    try {
      localStorage.setItem('sdp_progress_v1', JSON.stringify({ pizzaPointsBest: 60 }));
    } catch {
      /* ignore */
    }
  });
  const mp = await mockCtx.newPage();
  mp.on('pageerror', (e) => errors.push(e.message));
  await mp.route('**/api/score*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        entries: board,
        you: {
          rank: 4,
          index: 3,
          gap: 30,
          // Competition rank (ties SHARE) — the same rule the real windowAround uses, so
          // the two 90s (BBB, CCC) are BOTH #2 and the 50 is #4 (1-2-2-4), not 1-2-3-4.
          neighbors: board.map((e) => ({
            rank: board.filter((x) => x.score > e.score).length + 1,
            initials: e.initials,
            score: e.score,
          })),
        },
      }),
    }),
  );
  await mp.goto(base + '/leaderboard', { waitUntil: 'networkidle' });
  const strip = await mp.waitForSelector('.hud-board__you', { timeout: 8000 }).catch(() => null);
  if (!strip) bad('leaderboard: the "you" strip did not render from a mocked board');
  else {
    const txt = (await strip.textContent()) || '';
    if (!/#4/.test(txt)) bad(`leaderboard: you-strip missing rank #4 -> ${txt}`);
    if (!/30/.test(txt) || !/climb/i.test(txt))
      bad(`leaderboard: you-strip missing gap-to-climb -> ${txt}`);
    // the highlighted YOU row shows the player's own score
    const selfTxt = await mp.$('.hud-board__row--you').then((el) => el && el.textContent());
    if (!selfTxt || !/YOU/.test(selfTxt) || !/60/.test(selfTxt))
      bad(`leaderboard: the highlighted YOU row is wrong -> ${selfTxt}`);
    // a tied neighbor carries its COMPETITION rank: CCC (90) ties BBB (90) → #2, not the
    // ordinal #3 — matching the "You're #N" headline's tie-aware semantics.
    const cccRank = await mp.$eval('.hud-board__list--you', (ol) => {
      const li = [...ol.querySelectorAll('li')].find(
        (el) => el.querySelector('.hud-board__ini')?.textContent === 'CCC',
      );
      return li?.querySelector('.hud-board__rank')?.textContent ?? null;
    });
    if (cccRank !== '2')
      bad(`leaderboard: neighbor CCC (tied at 90) should be competition rank 2, got ${cccRank}`);
    // YOU slots by score: after CCC (90), before DDD (50)
    const order = await mp.$$eval('.hud-board__list--you li', (lis) =>
      lis.map((el) => el.querySelector('.hud-board__ini')?.textContent),
    );
    const iYou = order.indexOf('YOU');
    if (!(iYou > order.indexOf('CCC') && iYou < order.indexOf('DDD')))
      bad(`leaderboard: YOU row is out of score order -> ${order.join(',')}`);
    youStripOk =
      !!selfTxt && cccRank === '2' && iYou > order.indexOf('CCC') && iYou < order.indexOf('DDD');
    await mp.screenshot({ path: '.shots/leaderboard-you.png' });
  }
  await mockCtx.close();
}

// ── 5. an UNRANKED submit still gets relative context from the POST ───────────
// The POST path returns `you` for EVERY successful submit, not just top-N ones — so a
// low/unranked score (even on a loadBoard=false surface like the pause menu) still gets
// "you're #N, X to climb". Mock the POST as an UNRANKED result carrying `you`, and make
// the mount GET carry NO `you`, so the only way a strip can appear is from the POST.
let unrankedSubmitOk = false;
{
  const board = Array.from({ length: 5 }, (_, i) => ({ initials: `ZZ${i}`, score: 500 - i * 10 }));
  const uCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await uCtx.addInitScript(() => {
    try {
      localStorage.setItem('sdp_progress_v1', JSON.stringify({ pizzaPointsBest: 42 }));
    } catch {
      /* ignore */
    }
  });
  const up = await uCtx.newPage();
  up.on('pageerror', (e) => errors.push(e.message));
  await up.route('**/api/score*', (route) => {
    const isPost = route.request().method() === 'POST';
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        isPost
          ? {
              ok: true,
              stored: true,
              rank: 73, // well past the top-50 → unranked, but still carries `you`
              ranked: false,
              entries: board,
              you: {
                rank: 73,
                index: 72,
                gap: 8, // 8 points to the next-higher score
                neighbors: [
                  { rank: 72, initials: 'QQQ', score: 50 },
                  { rank: 74, initials: 'RRR', score: 30 },
                ],
              },
            }
          : { ok: true, entries: board }, // GET (mount): board only, NO `you`
      ),
    });
  });
  await up.goto(base + '/leaderboard', { waitUntil: 'networkidle' });
  await up
    .waitForSelector('.hud-board', { timeout: 8000 })
    .catch(() => bad('unranked: board never mounted'));
  if (await up.$('.hud-board__you'))
    bad('unranked: a you-strip showed before submit (the GET carried no you)');
  const input = await up.$('.hud-board__initials');
  if (!input) bad('unranked: no initials input to submit with');
  else {
    await input.fill('ZED');
    await up.$('.hud-board__go').then((b) => b && b.click());
    const unrankedMsg = await up
      .waitForFunction(
        () => /keep climbing/i.test(document.querySelector('.hud-board')?.textContent || ''),
        null,
        { timeout: 6000 },
      )
      .then(
        () => true,
        () => false,
      );
    if (!unrankedMsg) bad('unranked: no "keep climbing" message after an unranked submit');
    const postStrip = await up.waitForSelector('.hud-board__you', { timeout: 4000 }).then(
      (el) => el,
      () => null,
    );
    let rankShown = false;
    if (!postStrip) bad('unranked: the POST returned `you` but no strip rendered after submit');
    else {
      const t = (await postStrip.textContent()) || '';
      rankShown = /#73/.test(t) && /\b8\b/.test(t) && /climb/i.test(t);
      if (!rankShown) bad(`unranked: the post-submit you-strip is missing #73 / gap -> ${t}`);
      const selfT = await up.$('.hud-board__row--you').then((el) => el && el.textContent());
      if (!selfT || !/ZED/.test(selfT) || !/42/.test(selfT))
        bad(`unranked: the highlighted YOU row should show the signed ZED/42 -> ${selfT}`);
    }
    unrankedSubmitOk = unrankedMsg && rankShown;
  }
  await up.screenshot({ path: '.shots/leaderboard-unranked.png' });
  await uCtx.close();
}

// ── 6. time-boxing tabs (Today / This Week / All-Time) ───────────────────────
// Mock the GET per `window` query so a tab switch is observable without a backend: each
// window returns a distinctly-tagged board, and we assert the default is All-Time and that
// clicking Today re-fetches with `window=today` and swaps in that board.
let tabsOk = false;
{
  const byWindow = {
    all: [
      { initials: 'ALL', score: 900 },
      { initials: 'AL2', score: 800 },
    ],
    today: [
      { initials: 'TOD', score: 40 },
      { initials: 'TD2', score: 30 },
    ],
    week: [
      { initials: 'WKK', score: 120 },
      { initials: 'WK2', score: 110 },
    ],
  };
  const tCtx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const tp = await tCtx.newPage();
  tp.on('pageerror', (e) => errors.push(e.message));
  const seen = [];
  await tp.route('**/api/score*', (route) => {
    const win = new URL(route.request().url()).searchParams.get('window') || 'all';
    seen.push(win);
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, entries: byWindow[win] || byWindow.all }),
    });
  });
  await tp.goto(base + '/leaderboard', { waitUntil: 'networkidle' });

  const tabCount = await tp.$$('.hud-board__tab').then((a) => a.length);
  if (tabCount !== 3) bad(`tabs: expected 3 time tabs, got ${tabCount}`);
  const defaultOn = await tp
    .$eval('.hud-board__tab--on', (el) => el.textContent?.trim())
    .catch(() => null);
  if (defaultOn !== 'All-Time')
    bad(`tabs: default active tab should be All-Time, got ${defaultOn}`);
  const firstList = await tp
    .$eval('.hud-board__list', (ol) => ol.textContent || '')
    .catch(() => '');
  if (!/ALL/.test(firstList))
    bad(`tabs: first paint should show the all-time board -> ${firstList}`);

  // switch to Today → re-fetch with window=today → today's board swaps in
  await tp.getByRole('tab', { name: 'Today' }).click();
  const todayShown = await tp
    .waitForFunction(
      () => /TOD/.test(document.querySelector('.hud-board__list')?.textContent || ''),
      null,
      { timeout: 5000 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!todayShown) bad('tabs: clicking Today did not load the today board');
  const todayFetched = seen.includes('today');
  if (!todayFetched) bad('tabs: no GET carried window=today after clicking Today');
  const todayOn = await tp
    .$eval('.hud-board__tab--on', (el) => el.textContent?.trim())
    .catch(() => null);
  if (todayOn !== 'Today') bad(`tabs: Today should be the active tab after click, got ${todayOn}`);
  tabsOk =
    tabCount === 3 && defaultOn === 'All-Time' && todayShown && todayFetched && todayOn === 'Today';
  await tp.screenshot({ path: '.shots/leaderboard-tabs.png' });
  await tCtx.close();
}

if (errors.length)
  bad(`leaderboard: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `leaderboard -> crawl(marquee=${crawlMarquee} cold=${crawlCold} back=${crawlBack}) ` +
    `gifs(trophy=${gifTrophy} flames=${gifFlames} pizza=${gifPizza} coins=${coinRain}) ` +
    `offlineOnMount=${offlineOnMount} submitGraceful=${submitGraceful} youStrip=${youStripOk} ` +
    `unrankedSubmit=${unrankedSubmitOk} tabs=${tabsOk} pauseMenu=${inPause} errors=${errors.length}`,
);

await ctx.close();
await finish('\nleaderboard checks passed.', `\n${failures()} leaderboard check(s) FAILED`);
