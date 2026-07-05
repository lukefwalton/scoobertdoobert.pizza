// Verifies JUMP-BUFFERING (Controls.tsx): a Space tap made a hair BEFORE landing —
// pressed AND released while still airborne — is remembered and fired on touchdown,
// instead of being swallowed. We seed ONLY the jump verb (not double-jump), so an
// airborne tap can't double-jump — the ONLY way a second hop can appear is the buffer.
// The hop-start count is read from the test-gated __sdpJumps global; the tap is driven
// off OBSERVED near-landing state (not a fixed delay), so it stays deterministic.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors, roomIs as sharedRoomIs } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);
const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail: bad, timeout });

// Seed jump LEARNED (but not double-jump) so Space hops immediately in the first room.
await page.addInitScript(() => {
  localStorage.setItem(
    'sdp_progress_v1',
    JSON.stringify({ everEnteredWorld: true, luckEarned: 1, secretsFound: ['jump-unlocked'] }),
  );
});
await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500);
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
// The welcome-close button keeps focus, and Controls deliberately ignores Space while
// a button is focused ("never steal Space from buttons") — so blur it, or every hop
// below is swallowed before it starts.
await page.evaluate(
  () => document.activeElement instanceof HTMLElement && document.activeElement.blur(),
);
const inShop = await roomIs('Beach Pizza Shop');

const camY = () => page.evaluate(() => window.__sdpCam?.y ?? 0);
const jumps = () => page.evaluate(() => window.__sdpJumps ?? 0);
const baseline = await camY();
const jumps0 = await jumps();

// 1) Ground jump, then RELEASE while airborne (so it can't bunny-hop on landing —
//    a held Space would re-hop via the ordinary ground path and mask the buffer).
await page.keyboard.down(' ');
const airborne = await page
  .waitForFunction((b) => (window.__sdpCam?.y ?? 0) > b + 0.4, baseline, { timeout: 2000 })
  .then(
    () => true,
    () => false,
  );
await page.keyboard.up(' ');
if (!airborne) bad('ground jump never got airborne (Space hop broken)');
const oneHop = await page
  .waitForFunction((j) => (window.__sdpJumps ?? 0) === j + 1, jumps0, { timeout: 1500 })
  .then(
    () => true,
    () => false,
  );
if (!oneHop) bad('the ground jump was not counted (__sdpJumps did not reach +1)');

// 2) Drive the pre-landing tap IN-PAGE off the live camera height, so it's frame-exact
//    — a Node<->browser round-trip could let the player land before the keydown arrives.
//    Once past the peak, as the descent nears the ground, dispatch a real Space keydown,
//    HOLD it ~2 frames so Controls samples the fresh edge (arming the buffer while still
//    airborne), then release — all before touchdown. Double-jump isn't learned, so this
//    can ONLY arm the buffer. A synthetic window key event hits the exact same handler a
//    physical key would.
const tapped = await page.evaluate(
  (b) =>
    new Promise((resolve) => {
      let peaked = false;
      let downAt = 0;
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        resolve(ok);
      };
      const tick = (t) => {
        if (done) return;
        const y = window.__sdpCam?.y ?? 0;
        if (y > b + 0.5) peaked = true;
        if (peaked && !downAt && y < b + 0.3) {
          window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
          downAt = t;
        } else if (downAt && t - downAt > 32) {
          window.dispatchEvent(new KeyboardEvent('keyup', { key: ' ' }));
          finish(true);
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      setTimeout(() => finish(false), 3000); // don't hang if the arc never matched
    }),
  baseline,
);
if (!tapped) bad('never reached the pre-landing window to tap');

// 3) The buffered tap must re-hop on landing: a SECOND counted hop, from a tap that
//    couldn't act any other way. Without buffering this stays at +1.
const reHopped = await page
  .waitForFunction((j) => (window.__sdpJumps ?? 0) >= j + 2, jumps0, { timeout: 1200 })
  .then(
    () => true,
    () => false,
  );
if (!reHopped) bad('the pre-landing tap was swallowed — no buffered re-hop on touchdown');
// Corroborate with a real second arc (camera rises again after the tap).
const secondArc = await page
  .waitForFunction((b) => (window.__sdpCam?.y ?? 0) > b + 0.3, baseline, { timeout: 1500 })
  .then(
    () => true,
    () => false,
  );
if (!secondArc) bad('buffered re-hop was counted but the camera never rose a second time');

// 4) It settles back down and does NOT keep hopping (no phantom extra jumps).
const settled = await page
  .waitForFunction((b) => Math.abs((window.__sdpCam?.y ?? 0) - b) < 0.08, baseline, {
    timeout: 3000,
  })
  .then(
    () => true,
    () => false,
  );
if (!settled) bad('the buffered re-hop never settled back to the ground');
const finalJumps = await jumps();
if (finalJumps !== jumps0 + 2) bad(`expected exactly 2 hops, saw ${finalJumps - jumps0}`);
await page.screenshot({ path: '.shots/jumpbuffer.png' });

console.log(
  `jumpbuffer -> shop=${inShop} groundHop=${oneHop} tapped=${tapped} ` +
    `buffered=${reHopped} secondArc=${secondArc} settled=${settled} ` +
    `hops=${finalJumps - jumps0} errors=${failures()}`,
);

await ctx.close();
await finish('\njumpbuffer checks passed.', `\n${failures()} jumpbuffer check(s) FAILED`);
