// Terminal smoke (Phase 4): the hidden dead-web command line. Confirms it is
// summoned by backtick, runs commands (help / the new persistence-aware status /
// echo / a forbidden one), closes again — and that it's a pure JS enhancement,
// ABSENT from the prerendered / JS-off storefront (crawlable surface untouched).
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail: bad, finish, failures } = await launchSmoke();

// ── JS-ON: the terminal works ──────────────────────────────────────────────
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
page.on('pageerror', (e) => bad(`pageerror: ${e.message}`));

await page.goto(base + '/', { waitUntil: 'networkidle' });

// Absent until summoned.
if (await page.$('[aria-label="Terminal"]')) bad('terminal visible before backtick');

await page.keyboard.press('Backquote');
const term = await page
  .waitForSelector('[aria-label="Terminal"]', { timeout: 5000 })
  .catch(() => null);
if (!term) bad('backtick did not summon the terminal');

const run = async (cmd) => {
  await page.click('[aria-label="terminal input"]');
  await page.fill('[aria-label="terminal input"]', cmd);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(120);
  return (await page.textContent('[aria-label="Terminal"]')) || '';
};

if (term) {
  if (!(await run('help')).includes('available commands')) bad('`help` did not list commands');
  const status = await run('status');
  if (!status.includes('VISITOR RECORD')) bad('`status` did not print the visitor record');
  if (!status.includes('plug-in installed')) bad('`status` missing the persistence fields');
  // The game-layer readouts (pure reads of the progress snapshot). On a fresh load
  // luck is 0 (the "earn it at the shrine" branch) and the spellbook is empty.
  const luck = await run('luck');
  if (!luck.includes('LUCK') || !luck.includes('banked'))
    bad('`luck` did not print the luck readout');
  if (!(await run('spells')).includes('SPELLBOOK')) bad('`spells` did not print the spellbook');
  if (!/d20\D+(?:[1-9]|1\d|20)\b/.test(await run('roll')))
    bad('`roll` did not print a d20 face (1..20)');
  if (!(await run('echo scoobert')).includes('scoobert')) bad('`echo` did not echo');
  if (!(await run('sudo')).toLowerCase().includes('reported'))
    bad('forbidden `sudo` gave no response');

  await page.screenshot({ path: '.shots/terminal.png' });

  // Backtick again closes it.
  await page.keyboard.press('Backquote');
  await page.waitForTimeout(150);
  if (await page.$('[aria-label="Terminal"]')) bad('backtick did not close the terminal');
}

await ctx.close();

// ── JS-OFF: the crawlable storefront has no terminal ───────────────────────
const ctx2 = await browser.newContext({ javaScriptEnabled: false });
const page2 = await ctx2.newPage();
await page2.goto(base + '/', { waitUntil: 'domcontentloaded' });
const body = (await page2.textContent('body')) || '';
if (!/Electronic Pizza Storefront/i.test(body)) bad('JS-off storefront did not render its heading');
if (await page2.$('[aria-label="Terminal"]'))
  bad('terminal present in the JS-off / prerendered DOM');
await ctx2.close();

console.log(`terminal -> errors=${failures()}`);
await finish('\nterminal checks passed.', `\n${failures()} terminal check(s) FAILED`);
