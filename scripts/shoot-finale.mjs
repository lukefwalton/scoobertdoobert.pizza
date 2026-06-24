// Verifies the finale / win arc (Commit D): with every objective done EXCEPT one,
// completing that last one flips completion to 100% and fires the finale once — a
// celebratory toast, a durable 'finale' secret, and the pause-menu "★ 100%" badge.
// We complete the last objective deterministically via the shrine clap hook.
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

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

const secrets = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || [];
    } catch {
      return [];
    }
  });

// Seed EVERY objective done except "earn-luck" (luckEarned 0) — so the next clap
// at the shrine completes the set and trips the finale.
await page.addInitScript(() => {
  localStorage.setItem(
    'sdp_progress_v1',
    JSON.stringify({
      everEnteredWorld: true,
      luckEarned: 0,
      luckSpent: 0,
      radioUnlocked: true,
      itemsHeld: [
        'pool-locker-key',
        'hall-closet-key',
        'tape-mystery-machine',
        'tape-moonlight',
        'tape-japan',
        'tape-internet',
      ],
      secretsFound: ['dice-monster', 'grass-cleared', 'danced:seed'],
      visitedRooms: ['shop', 'hallway', 'jukebox', 'poolrooms', 'shrine', 'terminus'],
    }),
  );
});
await page.goto(base + '/?room=shrine&debug=1', { waitUntil: 'networkidle' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 15000 })
  .catch(() => bad('world never mounted'));
const hasClap = await page
  .waitForFunction(() => typeof window.__sdpShrineClap === 'function', null, { timeout: 8000 })
  .then(
    () => true,
    () => false,
  );
if (!hasClap) bad('finale: shrine clap hook never appeared');
await page.waitForTimeout(600);

let finaleToast = false;
let finaleSecret = false;
let badge = false;
if (hasClap) {
  if ((await secrets()).includes('finale'))
    bad('finale: started already finished (state not fresh)');

  // Complete the last objective — the clap earns luck → 100% → finale.
  await page.evaluate(() => window.__sdpShrineClap());

  finaleToast = await page
    .waitForFunction(
      () => {
        const el = document.querySelector('.hud-toast--crit-good');
        return !!el && /seen it all/i.test(el.textContent || '');
      },
      null,
      { timeout: 6000 },
    )
    .then(
      () => true,
      () => false,
    );
  if (!finaleToast) bad('finale: no "seen it all" finale toast fired on completion');

  finaleSecret = (await secrets()).includes('finale');
  if (!finaleSecret) bad('finale: durable finale secret not recorded');

  // Pause menu shows the ★ 100% badge.
  await page.keyboard.press('Escape');
  const count = await page
    .waitForSelector('.hud-pause__todocount', { timeout: 4000 })
    .catch(() => null);
  const txt = count ? ((await count.textContent()) ?? '').trim() : '';
  badge = /★/.test(txt) && /100%/.test(txt);
  if (!badge) bad(`finale: pause badge not at ★ 100% (saw ${JSON.stringify(txt)})`);
  await page.screenshot({ path: '.shots/finale.png' });
}

if (errors.length) bad(`finale: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `finale -> clap=${hasClap} toast=${finaleToast} secret=${finaleSecret} badge=${badge} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} finale check(s) FAILED` : '\nfinale checks passed.');
process.exit(fail ? 1 : 0);
