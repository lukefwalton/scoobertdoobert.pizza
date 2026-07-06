// Save San Diego cabinet smoke: the /save-san-diego route surfaces Scoobert's real
// Twine quest (public/1101.html) as an arcade cabinet. Two contracts, like the other
// standalone cabinets:
//   1. JS-DISABLED: a real prerendered document (title + a real back-to-storefront
//      anchor) with NO <iframe> (the game is a post-hydration enhancement, so the
//      crawlable / JS-off page is intact).
//   2. JS ON: the cabinet mounts a PRESS-START button (no eager iframe → no eager
//      name-prompt), clicking it mounts the iframe pointed at /1101.html, and the
//      embedded Twine story actually loads (its <tw-storydata> title resolves).
import { launchSmoke } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { browser, fail, finish, failures } = await launchSmoke();

// --- 1. JS-DISABLED: crawlable shell, no iframe ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(`${base}/save-san-diego`, { waitUntil: 'load' });
  const title = await page.title();
  const titled = title.includes('Save San Diego');
  if (!titled) fail(`no-JS <title> unexpected -> ${JSON.stringify(title)}`);
  const back = await page.$('a[href="/"]');
  if (!back) fail('no-JS: missing real back-to-storefront anchor');
  const iframe = await page.$('iframe');
  if (iframe) fail('no-JS: an <iframe> leaked into the crawlable HTML');
  console.log(`no-JS -> titled=${titled} back=${!!back} iframe=${!!iframe}`);
  await ctx.close();
}

// --- 2. JS ON: PRESS START gates the iframe; clicking loads the Twine story ---
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  page.on('pageerror', (e) => fail(`JS pageerror: ${e.message}`));
  await page.goto(`${base}/save-san-diego`, { waitUntil: 'networkidle' });

  const start = await page.waitForSelector('.arcade-start', { timeout: 12000 }).then(
    () => true,
    () => false,
  );
  if (!start) fail('JS: the PRESS START button did not mount');

  // The iframe (and its name prompt) must NOT be eager — only after START.
  const eager = await page.$('.arcade-iframe');
  if (eager) fail('JS: the iframe mounted before PRESS START (would fire the name prompt early)');

  let framed = false;
  let storyLoaded = false;
  let banked = false;
  if (start) {
    await page.click('.arcade-start');
    const frameEl = await page.waitForSelector('.arcade-iframe', { timeout: 6000 }).then(
      (h) => h,
      () => null,
    );
    framed = !!frameEl;
    if (!framed) fail('JS: clicking PRESS START did not mount the iframe');

    if (frameEl) {
      const src = await frameEl.getAttribute('src');
      if (src !== '/1101.html')
        fail(`JS: iframe src is ${JSON.stringify(src)}, expected /1101.html`);
      // Reach into the embedded Twine doc and confirm the real story mounted.
      const frame = await frameEl.contentFrame();
      storyLoaded = await frame
        .waitForFunction(
          () =>
            document
              .querySelector('tw-storydata')
              ?.getAttribute('name')
              ?.includes('Save San Diego'),
          null,
          { timeout: 8000 },
        )
        .then(
          () => true,
          () => false,
        );
      if (!storyLoaded) fail('JS: the embedded 1101 (Save San Diego) Twine story did not load');

      // The ARG WIN → progression hook: the win terminus renders a dedicated MARKER
      // element (<span data-sdp-ending="win">) that ONLY the real win passage emits;
      // 1101.html sees it, postMessages the win, and the page's useSaveSanDiegoWin banks
      // the durable 'saved-san-diego' BONUS secret. We inject to simulate the terminus,
      // then assert the PARENT banked it.
      if (storyLoaded) {
        // Resolves true once the parent bank lands, false if it never does within `ms`.
        const waitBanked = (ms) =>
          page
            .waitForFunction(
              () => {
                try {
                  return (
                    JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || []
                  ).includes('saved-san-diego');
                } catch {
                  return false;
                }
              },
              null,
              { timeout: ms },
            )
            .then(
              () => true,
              () => false,
            );

        // LOAD GUARD: the marker element ALSO exists inside the hidden <tw-storydata>
        // passage source (real DOM nodes the browser parses there), so a whole-document
        // query would auto-bank on load. The observer scopes to rendered <tw-story>
        // output only — so merely LOADING the story must NOT bank.
        const bankedOnLoad = await waitBanked(1500);
        if (bankedOnLoad)
          fail('JS: saved-san-diego banked on story LOAD (marker in hidden source, not rendered)');
        else console.log('load guard: story load alone does not bank (hidden source ignored)');

        // NEGATIVE (forgery guard): the win keys off the marker ELEMENT, never free-form
        // text — so echoed player input can't fake it (the name prompt renders $name,
        // which Harlowe escapes to inert text). Inject the win PHRASE as plain text with
        // NO marker; it must NOT bank.
        await frame.evaluate(() => {
          const s = document.querySelector('tw-story');
          if (s)
            s.insertAdjacentHTML(
              'beforeend',
              '<tw-passage>CONGRATULATIONS, SAN DIEGO IS SAVED. — typed as a name</tw-passage>',
            );
        });
        const forged = await waitBanked(1500);
        if (forged)
          fail('JS: win phrase as plain TEXT forged saved-san-diego (must require the marker)');
        else console.log('forgery guard: win text alone does not bank (marker required)');

        // POSITIVE: emit the real marker element INTO the rendered story → banks.
        await frame.evaluate(() => {
          const s = document.querySelector('tw-story');
          if (s) s.insertAdjacentHTML('beforeend', '<span data-sdp-ending="win"></span>');
        });
        banked = await waitBanked(4000);
        if (!banked)
          fail('JS: the 1101 win marker did not bank the saved-san-diego secret in the parent');
      }
    }
  }
  await page.screenshot({ path: '.shots/save-san-diego.png' });
  console.log(`JS -> start=${start} framed=${framed} story=${storyLoaded} banked=${banked}`);
  await ctx.close();
}

console.log(`save-san-diego: errors=${failures()}`);
await finish();
