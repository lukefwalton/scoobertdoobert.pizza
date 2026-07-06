// Smoke: the pause-menu SHARE button (Fix 4's "share fuel" social lever). Exercises
// the REAL in-world wiring — open pause → click "↗ share" → shareResult → clipboard
// → toast — that the src/lib/share unit tests can't reach. Enters via ?world (a
// test entrance; the REAL path to the world is covered by shoot:descent /
// shoot:fallback / shoot:touch) and STUBS navigator so the branch is deterministic:
// headless has no Web Share sheet and a permission-gated clipboard, so we install a
// writeText that records + resolves and force the clipboard path.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail, finish, failures } = await startSmoke();
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
  } catch {
    /* ignore */
  }
  // Deterministic clipboard branch: no native sheet, and a writeText that RECORDS the
  // shared text + resolves. Both defines are guarded (properties may be non-config).
  try {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  } catch {
    /* leave as-is; headless desktop has no Web Share anyway */
  }
  window.__shared = null;
  try {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (t) => {
          window.__shared = t;
          return Promise.resolve();
        },
      },
    });
  } catch {
    /* ignore */
  }
});
watchPageErrors(page, fail);

await page.goto(base + '/?world=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
await page
  .getByRole('button', { name: /dismiss intro/i })
  .click({ timeout: 3000 })
  .catch(() => {});

// Open the pause menu (the always-reachable nav) and click the share button.
await page.keyboard.press('Escape');
const paused = await page.waitForSelector('.hud-pause', { timeout: 4000 }).then(
  () => true,
  () => false,
);
if (!paused) fail('SHARE: the pause menu did not open');

const shareUp = await page
  .getByRole('button', { name: /share/i })
  .waitFor({ state: 'visible', timeout: 4000 })
  .then(
    () => true,
    () => false,
  );
if (!shareUp) fail('SHARE: the ↗ share button is missing from the pause menu');
else {
  await page
    .getByRole('button', { name: /share/i })
    .click({ timeout: 3000 })
    .catch(() => fail('SHARE: the share button was not clickable'));
  await page.waitForTimeout(400);
  // The button must have routed the share text to the clipboard (the stubbed path)…
  const shared = await page.evaluate(() => window.__shared);
  if (!shared || !/scoobertdoobert\.pizza/.test(shared))
    fail(`SHARE: clipboard not written with the share text (got ${JSON.stringify(shared)})`);
  // …and confirmed it with the "copied" toast.
  const toasted = await page.waitForSelector('.hud-toast', { timeout: 3000 }).then(
    () => true,
    () => false,
  );
  if (!toasted) fail('SHARE: no confirmation toast after copying the share link');
  else console.log('pause-menu share copies the link + toasts');
}
await page.screenshot({ path: '.shots/share.png' });

console.log(`share -> paused=${paused} button=${shareUp} errors=${failures()}`);
await ctx.close();
await finish('\nshare checks passed.', `\n${failures()} share check(s) FAILED`);
