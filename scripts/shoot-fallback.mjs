// Verifies the mobile/reduced-motion contract AFTER the world went cross-platform:
//   • MOBILE now runs the full descent (the 3D world at the bottom uses touch
//     controls), so Continue starts the descent in-page — it no longer shunts to
//     /arcade, and the 3D world does NOT mount instantly (that's post-install).
//   • REDUCED MOTION is ASKED, not auto-routed: Continue raises the MotionConsent
//     gate, which carries a real <a href="/text"> as the safe, motion-free default
//     and never auto-mounts a canvas.
// Fails non-zero if the 3D world leaks in early, the boot card shows, or the
// reduced-motion opt-in/its /text escape hatch is missing.
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail, finish, failures } = await launchSmoke();

// --- Mobile: Continue now DESCENDS (the world runs on phones with touch), it no
//     longer redirects to /arcade. The descent is in-page — a floor marker
//     appears, the URL stays on '/', and the 3D world hasn't mounted yet. ---
{
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  // Mobile must be instantly usable: no boot overlay on a first visit.
  const mboot = await page.$('.boot');
  if (mboot) {
    fail('MOBILE: boot overlay present (should skip on small screens)');
  }
  await page.click('#order-form button[type="submit"]');
  const descended = await page.waitForSelector('[data-floor="y1999"]', { timeout: 8000 }).then(
    () => true,
    () => false,
  );
  if (!descended) {
    fail('MOBILE: Continue did not start the descent (the 1999 floor never appeared)');
  }
  const url = page.url();
  if (url.includes('/arcade')) {
    fail(`MOBILE: Continue wrongly redirected to /arcade -> ${url}`);
  }
  // The 3D world (its HUD room label) must NOT be up at floor 1 — it only mounts
  // after the machine-room install, several floors down.
  const worldHud = await page.$('.hud-room');
  if (worldHud) {
    fail('MOBILE: the 3D world mounted at the top of the descent (should be post-install)');
  }
  await page.screenshot({ path: '.shots/fallback-mobile.png', fullPage: true });
  console.log(`mobile    -> descended=${descended} url=${url} worldHud=${!!worldHud}`);
  await ctx.close();
}

// --- Reduced motion (desktop): Continue raises the opt-in gate, not a redirect.
//     No boot, no auto-canvas; the gate carries a real /text escape hatch. ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  const boot = await page.$('.boot');
  if (boot) {
    fail('REDUCED: boot card showed (should self-skip)');
  }
  await page.click('#order-form button[type="submit"]');
  const gated = await page.waitForSelector('.mcons', { timeout: 3000 }).then(
    () => true,
    () => false,
  );
  if (!gated) {
    fail('REDUCED: the motion-consent gate did not appear on Continue');
  }
  const url = page.url();
  if (url.includes('/text')) {
    fail(`REDUCED: Continue auto-navigated instead of asking first -> ${url}`);
  }
  const canvas = await page.$('canvas');
  if (canvas) {
    fail('REDUCED: a 3D canvas appeared (must wait for explicit opt-in)');
  }
  // The safe default is a REAL anchor to /text — follow it to prove it's not a dead end.
  const textHref = await page.getAttribute('.mcons-text', 'href').catch(() => null);
  if (textHref !== '/text') {
    fail(`REDUCED: the gate's text-menu link is not a real /text anchor -> ${textHref}`);
  }
  await page.click('.mcons-text');
  const reachedText = await page.waitForURL('**/text', { timeout: 6000 }).then(
    () => true,
    () => false,
  );
  if (!reachedText) {
    fail("REDUCED: the gate's /text escape hatch did not navigate to /text");
  }
  console.log(`reduced   -> gated=${gated} textHref=${textHref} reachedText=${reachedText}`);
  await ctx.close();
}

// --- Reduced motion, the OPT-IN side: "Enter the world anyway" must actually
//     start the descent (the consent gate is a real choice, not a soft wall). ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  await page.click('#order-form button[type="submit"]');
  await page.waitForSelector('.mcons', { timeout: 3000 }).catch(() => {});
  await page.click('.mcons-go');
  const descended = await page.waitForSelector('[data-floor="y1999"]', { timeout: 8000 }).then(
    () => true,
    () => false,
  );
  if (!descended) {
    fail('REDUCED opt-in: "Enter the world anyway" did not start the descent');
  }
  const gateGone = (await page.$('.mcons')) === null;
  if (!gateGone) {
    fail('REDUCED opt-in: the consent gate stayed up after opting in');
  }
  console.log(`reduced+  -> optInDescended=${descended} gateGone=${gateGone}`);
  await ctx.close();
}

// --- JS-OFF: the hire pitch + the maze are in the crawlable prerender (ADDENDUM
//     #8). The storefront must carry the "mixing engineer" pitch, The Reel, the
//     hire mailto, the ENTER THE BUILDING anchor (a real /text href), and the
//     basement-stairs door; the maze pages must interlink with real anchors. ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    javaScriptEnabled: false,
  });
  const page = await ctx.newPage();
  await page.goto(base + '/', { waitUntil: 'load' });
  const html = await page.content();
  for (const needle of [
    'mixing engineer',
    'beformer@aol.com',
    'open.spotify.com/playlist/7pmgoZlkf6exw4BAJTQs7Q',
    'THERE IS A WHOLE WORLD UNDER THIS PIZZA SHOP',
  ]) {
    if (!html.includes(needle)) {
      fail(`JS-OFF: storefront prerender is missing "${needle}"`);
    }
  }
  const doorHref = await page.getAttribute('.playdoor__cta a', 'href').catch(() => null);
  if (doorHref !== '/text') {
    fail(`JS-OFF: ENTER THE BUILDING is not a real /text anchor -> ${doorHref}`);
  }
  const stairs = await page.$('a[href="/basement-stairs"]');
  if (!stairs) {
    fail('JS-OFF: the storefront has no /basement-stairs anchor');
  }
  // Walk the maze on real anchors, JS disabled: stairs -> freezer -> its exit.
  await page.goto(base + '/basement-stairs', { waitUntil: 'load' });
  const mazeH1 = (await page.textContent('main h1').catch(() => null))?.trim() ?? '';
  if (mazeH1 !== 'The Basement Stairs') {
    fail(`JS-OFF maze: /basement-stairs h1 -> ${JSON.stringify(mazeH1)}`);
  }
  await page.click('a[href="/walk-in-freezer"]');
  await page.waitForURL('**/walk-in-freezer', { timeout: 6000 }).catch(() => {});
  const freezerHtml = await page.content();
  if (!freezerHtml.includes('href="/?room=kitchen"')) {
    fail('JS-OFF maze: the freezer is missing its /?room=kitchen game exit');
  }
  if (!freezerHtml.includes('open.spotify.com/playlist/')) {
    fail('JS-OFF maze: the freezer is missing its Reel pitch anchor');
  }
  await page.screenshot({ path: '.shots/fallback-maze.png', fullPage: true });
  console.log(`js-off    -> door=${doorHref} mazeH1=${JSON.stringify(mazeH1)}`);
  await ctx.close();
}

// --- Reduced motion × the public deep links: /?world must ASK (the MotionConsent
//     gate), never auto-drop a reduced-motion visitor into the 3D world; opting
//     in must actually enter. The maze exits point here, so this is a public
//     entrance now, not just a smoke hook. ---
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto(base + '/?world', { waitUntil: 'networkidle' });
  const gated = await page.waitForSelector('.mcons', { timeout: 4000 }).then(
    () => true,
    () => false,
  );
  if (!gated) {
    fail('REDUCED ?world: the motion-consent gate did not appear');
  }
  if (await page.$('canvas')) {
    fail('REDUCED ?world: a 3D canvas mounted before consent');
  }
  await page.click('.mcons-go');
  const entered = await page.waitForSelector('canvas', { timeout: 20000 }).then(
    () => true,
    () => false,
  );
  if (!entered) {
    fail('REDUCED ?world opt-in: the world did not mount after consent');
  }
  console.log(`deep-link -> gated=${gated} entered=${entered}`);
  await ctx.close();
}

// --- /about: the crawlable "straight story" route renders (registration +
//     prerender + metadata regression catch). Served from the prerendered
//     dist/about.html, so this also proves the SSG route is wired. ---
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(base + '/about', { waitUntil: 'networkidle' });
  const heading = (await page.textContent('main h1').catch(() => null))?.trim() ?? '';
  const title = await page.title();
  if (!heading.includes('About Scoobert Doobert')) {
    fail(`ABOUT: main <h1> missing/unexpected -> ${JSON.stringify(heading)}`);
  }
  if (!title.includes('Scoobert Doobert')) {
    fail(`ABOUT: <title> missing/unexpected -> ${JSON.stringify(title)}`);
  }
  console.log(
    `about     -> h1=${JSON.stringify(heading)} titled=${title.includes('Scoobert Doobert')}`,
  );
  await ctx.close();
}

await finish('\nfallback checks passed.', `\n${failures()} fallback check(s) FAILED`);
