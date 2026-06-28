// Verifies The Kitchen — the pizza shop's back-of-house off the -X "EMPLOYEES
// ONLY" door. Rather than the debug ?room= entrance, this walks the REAL door so
// it actually exercises the new graph edge: shop → kitchen → back to shop. Proves
// the door wiring/spawns in core.ts (a regression there would otherwise still
// leave this green), that the warm procedural scene renders without throwing, the
// HUD names it, the arrival is clean (no prompt flash), and the rack of tuned
// PIZZA PANS — the reused in-world instrument, the site's thesis at its source —
// both mounted (its strike hook only exists once the rack rendered) and rings.
import { mkdirSync } from 'node:fs';
import {
  holdUntilDoorPrompt,
  roomIs as sharedRoomIs,
  startSmoke,
  watchPageErrors,
} from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);
const roomIs = (name, timeout) => sharedRoomIs(page, name, { fail: bad, timeout });
const noPromptNow = async (where) => {
  await page.waitForTimeout(250);
  if ((await page.$('.hud-prompt--door')) !== null)
    bad(`a door prompt flashed at the ${where} spawn (arrival sits in a door radius)`);
};

// ?world=1 drops into the world (past the install gag); ?debug exposes the pan
// strike hook. We then traverse the actual door, not a ?room= shortcut.
await page.goto(base + '/?world=1&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('canvas', { timeout: 15000 });
  await page.waitForSelector('.hud-menu-btn', { timeout: 15000 });
} catch (e) {
  bad(`world did not mount: ${e.message}`);
}
await page.waitForTimeout(1500); // WebGL warmup

// 1) Start in the shop. The kitchen door is a -X side door behind the counter —
//    NOT prompting at the sea-facing spawn (you find it by turning from the window).
const startShop = await roomIs('Beach Pizza Shop');
if ((await page.$('.hud-prompt--door')) !== null)
  bad('a door prompt was visible at the shop spawn');

// 2) Strafe left (-X, facing the sea window) to the "EMPLOYEES ONLY" door → duck
//    into the kitchen. This is the real shop→kitchen edge (core.ts), not a debug
//    entrance: a regression in its position/spawn would fail HERE.
if (!(await holdUntilDoorPrompt(page, 'a', { timeout: 8000 })))
  bad('kitchen door prompt never appeared strafing -X from the shop');
await page.keyboard.press('e');
const inKitchen = await roomIs('The Kitchen');
await noPromptNow('kitchen');

// Let the scene settle (materials compile, the oven glows), then shoot. Dismiss
// the first-entry intro overlay first (best-effort) so the artifact shows the room.
await page.waitForTimeout(1800);
await page.click('.hud-welcome__close', { timeout: 1500 }).catch(() => {});
await page.waitForTimeout(700);
await page.screenshot({ path: '.shots/kitchen.png' });

// 3) The thesis, made playable: strike a pizza pan. The strike hook is registered
//    in PizzaPanChimes' mount effect, so its presence proves the RACK actually
//    rendered into this room (not just that we arrived). Clicking a 3D pan through
//    Playwright is camera-fragile, so drive the deterministic hook; __sdpPans
//    carries the last strike's note (index 0 = the C4 pan).
const panStruck = await page.evaluate(() => {
  if (typeof window.__sdpStrikePan !== 'function')
    return { err: 'no strike hook (rack not mounted?)' };
  window.__sdpStrikePan(0);
  return window.__sdpPans ?? { err: 'no __sdpPans after strike' };
});
const panOk = !!panStruck && panStruck.note === 'C' && panStruck.octave === 4;
if (!panOk)
  bad(`striking a pizza pan did not register the right note (got ${JSON.stringify(panStruck)})`);

// 4) Reciprocity: walk back out to the shop, proving the return edge
//    (kitchen-to-shop → fromKitchen spawn) is wired both ways, not one-directional.
//    The fromShop spawn faces -X into the room, so the +X return door is BEHIND
//    you — back up ('s') toward it rather than strafe.
if (!(await holdUntilDoorPrompt(page, 's', { timeout: 8000 })))
  bad('return door prompt never appeared backing toward the +X door in the kitchen');
await page.keyboard.press('e');
const backInShop = await roomIs('Beach Pizza Shop');
await noPromptNow('shop (from kitchen)');

console.log(
  `kitchen  -> shop=${startShop} kitchen=${inKitchen} pan=${panOk} back=${backInShop} errors=${failures()}`,
);

await ctx.close();
await finish('\nkitchen checks passed.', `\n${failures()} kitchen check(s) FAILED`);
