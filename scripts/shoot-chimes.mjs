// Verifies "Pendulum Chimes" — the tap-to-play bell instrument cabinet.
//   1. JS-OFF: /chimes prerenders to a real crawlable page (title + back anchor),
//      with NO live canvas (the instrument is a post-hydration enhancement).
//   2. The arcade page links to /chimes (the cabinet is discoverable).
//   3. JS ON: the canvas mounts, the pendulum sim runs (bells strike on their
//      own), and a tap starts the audio engine — all without throwing.
import { launchSmoke, watchPageErrors } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail: bad, finish, failures } = await launchSmoke();

// --- 1. JS-OFF crawlable shell ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/chimes', { waitUntil: 'load' });
  const title = await page.title();
  if (!title.includes('Pendulum Chimes')) bad(`no-JS title unexpected -> ${JSON.stringify(title)}`);
  const back = await page.$('a[href="/arcade"]');
  if (!back) bad('no-JS: missing "back to the arcade" anchor');
  const canvas = await page.$('canvas');
  if (canvas) bad('no-JS: a <canvas> rendered into crawlable HTML (should be JS-only)');
  console.log(
    `no-JS    -> titled=${title.includes('Pendulum Chimes')} back=${!!back} canvas=${!!canvas}`,
  );
  await ctx.close();
}

// --- 2. discoverable from the arcade ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/arcade', { waitUntil: 'load' });
  const link = await page.$('a[href="/chimes"]');
  if (!link) bad('arcade: missing link to the /chimes cabinet');
  console.log(`arcade   -> chimes-link=${!!link}`);
  await ctx.close();
}

// --- 3. JS ON: the canvas mounts, the sim strikes bells, and a tap starts audio.
//        ?debug exposes window.__sdpChimes = { strikes, started, muted }. ---
{
  // Snapshot so the play-phase log reports only this phase's failures, not the
  // cumulative total (the JS-off phases ran first).
  const playErr0 = failures();
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 900 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  watchPageErrors(page, bad);
  await page.goto(base + '/chimes?debug=1', { waitUntil: 'networkidle' });

  const canvas = await page.waitForSelector('.chimes-canvas', { timeout: 8000 }).catch(() => null);
  if (!canvas) bad('JS: chimes canvas did not mount');

  let struckEarly = 0;
  let struckLater = 0;
  let started = false;
  let gainLive = null;
  let gainMuted = null;
  if (canvas) {
    const read = () => page.evaluate(() => window.__sdpChimes ?? { strikes: 0, started: false });
    await page.waitForTimeout(700); // let the pendulums swing and start striking
    struckEarly = (await read()).strikes;
    if (struckEarly <= 0) bad('JS: the pendulum sim produced no strikes (loop not running?)');

    // Tap the glass — starts the audio engine and re-swings the wave.
    const box = await canvas.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(700);
    const after = await read();
    started = after.started;
    struckLater = after.strikes;
    if (!started) bad('JS: tapping the glass did not start the audio engine');
    if (struckLater <= struckEarly) bad('JS: the sim stopped striking after the tap');
    await page.screenshot({ path: '.shots/chimes.png' });

    // Mute path (regression): hitting ♪ OFF must ramp master to ~0 so bells that
    // are already ringing stop too — consistency with Cultures.
    gainLive = await page.evaluate(() => window.__sdpChimes?.masterGain ?? null);
    await page.click('.chimes-btn[aria-pressed]'); // the ♪ ON/OFF toggle → mutes
    await page.waitForTimeout(500);
    gainMuted = await page.evaluate(() => window.__sdpChimes?.masterGain ?? null);
    if (!(gainLive > 0.5)) bad(`JS: chimes master not live after start (gain ${gainLive})`);
    if (!(gainMuted != null && gainMuted < 0.1))
      bad(`JS: chimes did not mute — master gain ${gainMuted} (ringing bells continue)`);
  }
  console.log(
    `play     -> canvas=${!!canvas} struck=${struckEarly}->${struckLater} started=${started} gain=${gainLive}->${gainMuted} errors=${failures() - playErr0}`,
  );
  await ctx.close();
}

await finish('\nchimes checks passed.', `\n${failures()} chimes check(s) FAILED`);
