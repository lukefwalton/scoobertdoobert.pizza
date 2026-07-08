// Verifies the Pizza Cam™ booth — the site's ONE consensual camera surface.
//   1. JS-OFF: /booth prerenders crawlable (title + back anchor, no canvas/video).
//   2. The arcade page links to /booth (the cabinet is discoverable).
//   3. CONSENT HONESTY: getUserMedia is wrapped with a counter — ZERO calls
//      before "Enable the Pizza Cam" is pressed, exactly one after; the
//      ● CAMERA ON chip appears with the stream and killing it truly ENDS the
//      tracks (chip gone, readyState 'ended'). Chromium's fake camera makes
//      this run headless (launchSmoke passes the flags).
//   4. DETERMINISTIC INSTRUMENTS: with the camera OFF, __sdpBoothInject feeds
//      synthetic 32×24 frames through the real pipeline — a left blob plays a
//      lower pentatonic note than a right blob (AIR DOUGH), and a zone spike
//      hits once, does not machine-gun while sustained, and re-hits after
//      release + refractory (TOPPING DRUMS).
import { launchSmoke, watchPageErrors } from './lib/smoke.mjs';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const CAM_W = 32;
const CAM_H = 24;
// Rounded Hz of the D-major pentatonic ladder (D4→B5) — what __sdpBooth.freq reports.
const PENTATONIC = new Set([294, 330, 370, 440, 494, 587, 659, 740, 880, 988]);

/** Build a 768-cell luminance frame from {x0,x1,y0,y1,v} blocks (x1/y1 exclusive). */
function frame(...blocks) {
  const f = new Array(CAM_W * CAM_H).fill(0);
  for (const { x0, x1, y0, y1, v } of blocks)
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) f[y * CAM_W + x] = v;
  return f;
}
const LEFT = { x0: 2, x1: 8, y0: 8, y1: 16, v: 200 };
const RIGHT = { x0: 24, x1: 30, y0: 8, y1: 16, v: 200 };
const SPIKE = { x0: 12, x1: 20, y0: 16, y1: 23, v: 220 }; // bottom-middle zone (mushroom)

const { browser, fail: bad, finish, failures } = await launchSmoke({
  // Chromium's fake camera: auto-grant the permission prompt + a synthetic feed,
  // so the REAL getUserMedia path runs headless (CI has no webcam).
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});

// --- 1. JS-OFF crawlable shell ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/booth', { waitUntil: 'load' });
  const title = await page.title();
  if (!title.includes('Pizza Cam')) bad(`no-JS title unexpected -> ${JSON.stringify(title)}`);
  const back = await page.$('a[href="/arcade"]');
  if (!back) bad('no-JS: missing "back to the arcade" anchor');
  const canvas = await page.$('canvas');
  if (canvas) bad('no-JS: a <canvas> rendered into crawlable HTML (should be JS-only)');
  const video = await page.$('video');
  if (video) bad('no-JS: a <video> rendered into crawlable HTML (the camera element is JS-only)');
  console.log(
    `no-JS    -> titled=${title.includes('Pizza Cam')} back=${!!back} canvas=${!!canvas} video=${!!video}`,
  );
  await ctx.close();
}

// --- 2. discoverable from the arcade shelf ---
{
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto(base + '/arcade', { waitUntil: 'load' });
  const link = await page.$('a[href="/booth"]');
  if (!link) bad('arcade: missing link to the /booth cabinet');
  console.log(`arcade   -> booth-link=${!!link}`);
  await ctx.close();
}

// --- 3. consent honesty: no getUserMedia before the press; kill truly kills ---
{
  const phaseErr0 = failures();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  watchPageErrors(page, bad);
  // Wrap getUserMedia BEFORE any page code runs: count calls, keep the streams.
  await ctx.addInitScript(() => {
    window.__gumCalls = 0;
    window.__gumStreams = [];
    const real = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async (c) => {
      window.__gumCalls++;
      const s = await real(c);
      window.__gumStreams.push(s);
      return s;
    };
  });
  await page.goto(base + '/booth?debug=1', { waitUntil: 'networkidle' });

  const gate = await page
    .getByRole('button', { name: 'Enable the Pizza Cam' })
    .waitFor({ state: 'visible', timeout: 8000 })
    .then(
      () => true,
      () => false,
    );
  if (!gate) bad('consent: the gate never rendered');
  const callsBefore = await page.evaluate(() => window.__gumCalls);
  if (callsBefore !== 0) bad(`consent: getUserMedia fired ${callsBefore}x BEFORE consent`);

  await page.getByRole('button', { name: 'Enable the Pizza Cam' }).click();
  const chip = await page
    .waitForSelector('.booth-chip', { timeout: 8000 })
    .then(() => true)
    .catch(() => false);
  if (!chip) bad('consent: the ● CAMERA ON chip never appeared after enabling');
  const callsAfter = await page.evaluate(() => window.__gumCalls);
  if (callsAfter !== 1) bad(`consent: expected exactly 1 getUserMedia call, got ${callsAfter}`);
  await page.waitForTimeout(600); // let a few fake frames draw the dithered grid
  await page.screenshot({ path: '.shots/booth.png' });

  // Switch channels while live (the stream persists), shoot the drum zones.
  await page.getByRole('button', { name: /TOPPING DRUMS/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: '.shots/booth-drums.png' });

  // The kill switch: chip disappears AND every captured track truly ended.
  await page.click('.booth-chip');
  const chipGone = await page
    .waitForSelector('.booth-chip', { state: 'detached', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!chipGone) bad('kill: the chip did not unmount with the stream');
  const tracksEnded = await page.evaluate(() =>
    window.__gumStreams.every((s) => s.getTracks().every((t) => t.readyState === 'ended')),
  );
  if (!tracksEnded) bad('kill: some MediaStream tracks are still live after the kill switch');
  console.log(
    `consent  -> gate=${gate} before=${callsBefore} after=${callsAfter} chip=${chip} killed=${chipGone}&&${tracksEnded} errors=${failures() - phaseErr0}`,
  );
  await ctx.close();
}

// --- 4. deterministic instruments — no camera at all, synthetic frames only ---
{
  const phaseErr0 = failures();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  watchPageErrors(page, bad);
  // Pre-arm the session gate so the booth shows READY (camera stays OFF —
  // injection must work without a single getUserMedia call).
  await ctx.addInitScript(() => sessionStorage.setItem('sdp:camera-choice', 'armed'));
  await page.goto(base + '/booth?debug=1', { waitUntil: 'networkidle' });
  const ready = await page
    .waitForFunction(() => typeof window.__sdpBoothInject === 'function', null, { timeout: 8000 })
    .then(
      () => true,
      () => false,
    );
  if (!ready) bad('inject: __sdpBoothInject never exposed (?debug gate)');

  const inject = (f) =>
    page.evaluate((arr) => {
      window.__sdpBoothInject(arr);
      return window.__sdpBooth;
    }, f);

  // AIR DOUGH: left blob → a low pentatonic degree...
  await inject(frame()); // baseline
  const left = await inject(frame(LEFT));
  if (!left?.playing) bad('dough: a left blob did not make the voice play');
  if (!PENTATONIC.has(left?.freq)) bad(`dough: left freq ${left?.freq} not in the pentatonic set`);
  // ...let the field decay to silence (same frame → zero diff)...
  let settled = left;
  for (let i = 0; i < 14; i++) settled = await inject(frame(LEFT));
  if (settled?.playing) bad('dough: sustained stillness did not fall silent (noise floor?)');
  // ...then a NEW blob on the right (left held, so only the right edge moves).
  const right = await inject(frame(LEFT, RIGHT));
  if (!PENTATONIC.has(right?.freq)) bad(`dough: right freq ${right?.freq} not in the pentatonic set`);
  if (!(right?.freq > left?.freq))
    bad(`dough: right (${right?.freq}) should pitch above left (${left?.freq})`);

  // TOPPING DRUMS: settle, switch channel, spike a zone.
  for (let i = 0; i < 14; i++) await inject(frame(LEFT, RIGHT));
  await page.evaluate(() => window.__sdpBoothChannel('drums'));
  const h0 = (await inject(frame(LEFT, RIGHT)))?.hits ?? 0;
  const hit1 = (await inject(frame(LEFT, RIGHT, SPIKE)))?.hits;
  if (hit1 !== h0 + 1) bad(`drums: one spike expected 1 hit (${h0} -> ${hit1})`);
  // Sustained wave: no machine-gun.
  let sustained = hit1;
  for (let i = 0; i < 3; i++) sustained = (await inject(frame(LEFT, RIGHT, SPIKE)))?.hits;
  if (sustained !== h0 + 1) bad(`drums: sustained wave re-fired (${sustained} hits)`);
  // Release (+decay well past the 200ms refractory at +100ms/frame), spike again.
  for (let i = 0; i < 14; i++) await inject(frame(LEFT, RIGHT));
  const hit2 = (await inject(frame(LEFT, RIGHT, SPIKE)))?.hits;
  if (hit2 !== h0 + 2) bad(`drums: release+refractory should re-hit (${hit1} -> ${hit2})`);

  const calls = await page.evaluate(() => window.__gumCalls ?? 'unwrapped');
  console.log(
    `inject   -> dough ${left?.freq}->${right?.freq}Hz drums ${h0}->${hit2} camera-untouched=${calls === 'unwrapped'} errors=${failures() - phaseErr0}`,
  );
  await ctx.close();
}

// --- 5. the in-world entrance: the kitchen's Pizza Cam tripod ---
{
  const phaseErr0 = failures();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  watchPageErrors(page, bad);
  await page.goto(base + '/?room=kitchen&debug=1', { waitUntil: 'commit' });
  try {
    await page.waitForSelector('canvas', { timeout: 15000 });
    await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
  } catch (e) {
    bad(`world did not mount for the kitchen phase: ${e.message}`);
  }
  await page.waitForTimeout(1500); // WebGL warmup
  await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});

  // The tripod sits in the back-right corner (+X/−Z); the spawn faces −X, so
  // back up + strafe right and poll for ITS prompt (the door prompt may flicker
  // past on the way — keep holding until the Pizza Cam text shows).
  for (const k of ['s', 'd']) await page.keyboard.down(k);
  const prompted = await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('.hud-prompt')].some((el) =>
          (el.textContent ?? '').includes('Pizza Cam'),
        ),
      null,
      { timeout: 8000 },
    )
    .then(
      () => true,
      () => false,
    );
  for (const k of ['s', 'd']) await page.keyboard.up(k);
  if (!prompted) bad('kitchen: the Pizza Cam prompt never appeared at the tripod');

  // E opens the booth — ALWAYS the booth (never a rolled game): the modal is
  // titled PIZZA CAM and shows the consent gate (camera still untouched).
  await page.keyboard.press('e');
  const modal = await page
    .waitForSelector('.hud-dialog--arcade[aria-label="PIZZA CAM"]', { timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  if (!modal) bad('kitchen: E at the tripod did not open the PIZZA CAM modal');
  const gate = await page
    .getByRole('button', { name: 'Enable the Pizza Cam' })
    .waitFor({ state: 'visible', timeout: 4000 })
    .then(
      () => true,
      () => false,
    );
  if (!gate) bad('kitchen: the consent gate is not the first thing the modal shows');
  await page.screenshot({ path: '.shots/booth-kitchen.png' });

  // Esc closes the modal and the world verbs resume (the prompt can re-show).
  await page.keyboard.press('Escape');
  const closed = await page
    .waitForSelector('.hud-dialog--arcade', { state: 'detached', timeout: 4000 })
    .then(() => true)
    .catch(() => false);
  if (!closed) bad('kitchen: Esc did not close the booth modal');
  console.log(
    `kitchen  -> prompt=${prompted} modal=${modal} gate=${gate} esc=${closed} errors=${failures() - phaseErr0}`,
  );
  await ctx.close();
}

// --- 6. the boot-screen opt-in: PIZZA CAM line on the green load screen ---
{
  const phaseErr0 = failures();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 850 } });
  const page = await ctx.newPage();
  watchPageErrors(page, bad);
  await page.goto(base + '/', { waitUntil: 'networkidle' });
  // Storefront → era floors → machine room → Install → the PIZZA-DOS boot.
  await page.click('#order-form button[type="submit"]');
  await page.waitForSelector('[data-floor="y1999"]', { timeout: 8000 }).catch(() => bad('boot: no 1999 floor'));
  await page.click('.floor-door--down');
  await page.waitForSelector('[data-floor="y2000"]', { timeout: 8000 }).catch(() => bad('boot: no 2000 floor'));
  await page.click('.floor-door--down');
  await page.waitForSelector('[data-floor="machine"]', { timeout: 8000 }).catch(() => bad('boot: no machine room'));
  await page.click('.mr__install');

  // The boot log gains the NOT DETECTED line + the arming row (first un-answered
  // desktop boot of the visit). ENABLE arms the session flag — and ONLY the flag.
  const row = await page
    .getByRole('button', { name: 'ENABLE HAND CONTROL' })
    .waitFor({ state: 'visible', timeout: 20000 })
    .then(
      () => true,
      () => false,
    );
  if (!row) bad('boot: the ENABLE HAND CONTROL row never appeared on the boot screen');
  await page.screenshot({ path: '.shots/booth-boot.png' });
  if (row) await page.getByRole('button', { name: 'ENABLE HAND CONTROL' }).click();
  const armed = await page.evaluate(() => sessionStorage.getItem('sdp:camera-choice'));
  if (armed !== 'armed') bad(`boot: expected the session flag armed, got ${JSON.stringify(armed)}`);
  const world = await page
    .waitForSelector('.hud-menu-btn', { timeout: 18000 })
    .then(() => true)
    .catch(() => false);
  if (!world) bad('boot: the world never mounted after arming');
  console.log(
    `boot     -> row=${row} armed=${armed === 'armed'} world=${world} errors=${failures() - phaseErr0}`,
  );
  await ctx.close();
}

// --- 7. touch: the parallel-port gag (no webcam UI on a phone, per policy) ---
{
  const ctx = await browser.newContext({
    viewport: { width: 412, height: 900 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await ctx.newPage();
  await page.goto(base + '/booth', { waitUntil: 'networkidle' });
  const gag = await page
    .waitForFunction(() => document.body.textContent?.includes('parallel port'), null, {
      timeout: 8000,
    })
    .then(
      () => true,
      () => false,
    );
  if (!gag) bad('touch: /booth did not show the parallel-port gag');
  const video = await page.$('video');
  if (video) bad('touch: a <video> element mounted on a touch device');
  console.log(`touch    -> gag=${gag} video=${!!video}`);
  await ctx.close();
}

await finish('\nbooth checks passed.', `\n${failures()} booth check(s) FAILED`);
