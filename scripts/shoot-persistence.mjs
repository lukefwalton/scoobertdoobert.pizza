// Phase 6 persistence smoke: "the site remembers you." The storefront's rat
// greeting is HISTORY-AWARE — it reflects what the saved localStorage progress
// says you've done. This seeds a few progress blobs and asserts the greeting
// tiers correctly (and that a cold visitor gets NO wink at all). The wink is a
// post-hydration enhancement, so it must never appear with JS off / on a cold
// first load.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });
const KEY = 'sdp_progress_v1';

const browser = await chromium.launch();
let errors = 0;
const fail = (m) => {
  errors++;
  console.log('FAIL:', m);
};

// Load the storefront with a seeded progress blob; return the rat-greeting text
// (or null if there's no wink). seed=null means a cold visitor (no localStorage).
async function greetingFor(seed) {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 768 } });
  await ctx.addInitScript(
    ([key, blob]) => {
      try {
        if (blob) localStorage.setItem(key, blob);
        // skip the boot gate so the storefront renders straight away
        sessionStorage.setItem('sdp_booted', '1');
      } catch {
        /* ignore */
      }
    },
    [KEY, seed ? JSON.stringify(seed) : ''],
  );
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail(`pageerror: ${e.message}`));
  await page.goto(base + '/', { waitUntil: 'networkidle', timeout: 15000 });
  await page.waitForSelector('.store', { timeout: 8000 });
  await page.waitForTimeout(400); // let the post-hydration wink settle (useMounted)
  const text = await page.evaluate(
    () => document.querySelector('.news-returning')?.textContent?.trim() ?? null,
  );
  await ctx.close();
  return text;
}

// A cold, first-time visitor gets NO wink (visits becomes 1, not "returning").
const cold = await greetingFor(null);
if (cold !== null) fail(`cold visitor saw a returning wink: ${cold}`);

// Each tier, most-specific first. The selector picks the deepest matching line.
const cases = [
  { label: 'entered world', seed: { everEnteredWorld: true }, needle: 'seen downstairs' },
  {
    label: 'heard the jukebox',
    seed: { everEnteredWorld: true, visitedRooms: ['shop', 'jukebox'] },
    needle: 'music',
  },
  {
    label: 'found the back room',
    seed: { everEnteredWorld: true, visitedRooms: ['jukebox'], secretsFound: ['classified'] },
    needle: 'back room',
  },
  {
    label: 'went deep',
    seed: { everEnteredWorld: true, secretsFound: ['classified'], maxUnease: 0.82 },
    needle: 'all the way down',
  },
];

const results = {};
for (const c of cases) {
  const text = await greetingFor(c.seed);
  const ok = !!text && text.toLowerCase().includes(c.needle);
  results[c.label] = ok;
  if (!ok) fail(`"${c.label}" greeting missing "${c.needle}" (got: ${text})`);
}

await browser.close();
console.log(
  `persistence: coldNoWink=${cold === null} ` +
    cases.map((c) => `${c.label.replace(/\s+/g, '_')}=${results[c.label]}`).join(' ') +
    ` | errors=${errors}`,
);
process.exit(errors ? 1 : 0);
