// /catalog smoke — the liner-notes shelf. Two contexts:
//   1) JS-OFF: the crawlable contract — a real document with one h1, every
//      catalog track as a list row (titles never masked — discovery is a game
//      concept, not a crawl gate), alt'd cover imgs, a real back anchor, and a
//      JSON-LD @graph that parses and carries MusicRecording nodes byArtist the
//      shared #scoobert id (never re-declaring the MusicGroup).
//   2) JS-ON: hydration holds (no page errors), and seeded progress layers the
//      "your copy" chips on top — ✓ found and ★ HI-FI — without changing rows.
import { mkdirSync } from 'node:fs';
import { launchSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail, finish, failures } = await launchSmoke();

// ── 1) the JS-OFF crawlable document ────────────────────────────────────────
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: false,
  });
  const page = await ctx.newPage();
  await page.goto(`${base}/catalog`, { waitUntil: 'domcontentloaded' });

  const h1s = await page.$$eval('h1', (els) => els.map((e) => e.textContent ?? ''));
  if (h1s.length !== 1 || !/Song Catalog/i.test(h1s[0] ?? ''))
    fail(`JS-off: expected one Song Catalog h1, got ${JSON.stringify(h1s)}`);

  const rows = await page.$$('.catalog-row');
  if (rows.length < 18) fail(`JS-off: only ${rows.length} catalog rows (expected the full shelf)`);

  const maskedTitles = await page.$$eval(
    '.catalog-row h2',
    (els) => els.filter((e) => (e.textContent ?? '').includes('???')).length,
  );
  if (maskedTitles > 0) fail('JS-off: the crawlable catalog masked a title (no ??? on /catalog)');

  const badImgs = await page.$$eval(
    '.catalog-row img',
    (imgs) => imgs.filter((i) => !i.getAttribute('alt')).length,
  );
  if (badImgs > 0) fail(`JS-off: ${badImgs} cover img(s) missing alt text`);

  const backHome = await page.$('a[href="/"]');
  if (!backHome) fail('JS-off: no real anchor back to the storefront');

  // the JSON-LD graph parses and carries the recordings
  const ld = await page.$$eval('script[type="application/ld+json"]', (els) =>
    els.map((e) => e.textContent ?? ''),
  );
  let recordings = 0;
  for (const block of ld) {
    try {
      const doc = JSON.parse(block);
      const graph = Array.isArray(doc['@graph']) ? doc['@graph'] : [doc];
      const blockRecordings = graph.filter((n) => n['@type'] === 'MusicRecording');
      for (const node of blockRecordings) {
        recordings++;
        if (node.byArtist?.['@id'] !== 'https://lukefwalton.com/#scoobert')
          fail(`JSON-LD recording ${node['@id']} not byArtist the shared #scoobert`);
      }
      // The CATALOG's own graph must reference #scoobert, never re-declare it —
      // a second partial MusicGroup would shadow the canonical one. (The page
      // SHELL's identity block legitimately declares it; only the block that
      // carries the recordings is ours to police.)
      if (blockRecordings.length > 0 && graph.some((n) => n['@type'] === 'MusicGroup'))
        fail('the /catalog graph re-declares MusicGroup (shadows the identity block)');
    } catch {
      fail('a JSON-LD block on /catalog does not parse');
    }
  }
  if (recordings < 18) fail(`JSON-LD carries ${recordings} MusicRecording nodes (expected ≥18)`);

  await page.screenshot({ path: '.shots/catalog-1-jsoff.png', fullPage: false });
  await ctx.close();
}

// ── 2) JS-ON: hydration + the seeded "your copy" chips ──────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  watchPageErrors(page, fail);
  await ctx.addInitScript(() => {
    localStorage.setItem(
      'sdp_progress_v1',
      JSON.stringify({ discoveredSongs: ['boardwalk'], restoredSongs: ['information'] }),
    );
  });
  await page.goto(`${base}/catalog`, { waitUntil: 'load' });

  const sawChips = await page.waitForSelector('.catalog-chip--hifi', { timeout: 8000 }).then(
    () => true,
    () => false,
  );
  if (!sawChips) fail('JS-on: the seeded ★ HI-FI chip never mounted');
  const hifiRow = await page.$$eval('.catalog-row', (rows) =>
    rows.some(
      (r) =>
        (r.querySelector('h2')?.textContent ?? '').includes('Information') &&
        r.querySelector('.catalog-chip--hifi'),
    ),
  );
  if (!hifiRow) fail('JS-on: the restored track does not wear its ★ HI-FI chip');
  const foundChips = await page.$$eval('.catalog-chip', (els) =>
    els.map((e) => e.textContent ?? ''),
  );
  if (!foundChips.some((t) => t.includes('✓')))
    fail('JS-on: no ✓ found chip despite seeded discovery');

  await page.screenshot({ path: '.shots/catalog-2-json.png', fullPage: false });
  await ctx.close();
}

console.log(`catalog: errors=${failures()}`);
await finish(
  'shoot-catalog: the liner-notes shelf is crawlable + enhanced',
  'shoot-catalog: FAILED — see FAIL lines above',
);
