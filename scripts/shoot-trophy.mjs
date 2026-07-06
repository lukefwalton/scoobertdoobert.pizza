// Verifies the Trophy Pizzeria's REACTIVE hall-of-fame (ShopFittings): with a
// seeded save (finale banked, grass goblin cleared, luck up, a few tapes held),
// entering the shop must render all four earned trophies — the gold finale award,
// the goblin trophy, the lucky clover, and the collected-cassette row — WITHOUT
// throwing. watchPageErrors catches any material/geometry throw from the gated
// props. Turns to face the back-bar (-X wall) for the screenshot.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors, roomIs as sharedRoomIs } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail, finish, failures } = await startSmoke();
await ctx.addInitScript(() => {
  try {
    sessionStorage.setItem('sdp_booted', '1');
    localStorage.setItem(
      'sdp_progress_v1',
      JSON.stringify({
        everEnteredWorld: true,
        visitedRooms: ['shop'],
        luckEarned: 6,
        luckSpent: 0,
        secretsFound: ['finale', 'grass-cleared'],
        itemsHeld: ['tape-mystery-machine', 'tape-moonlight', 'tape-japan'],
      }),
    );
  } catch {
    /* ignore */
  }
});
watchPageErrors(page, fail);

await page.goto(base + '/?room=shop&debug=1', { waitUntil: 'commit' });
try {
  await page.waitForSelector('.hud-menu-btn', { timeout: 12000 });
} catch (e) {
  fail(`world did not mount: ${e.message}`);
}
const inShop = await sharedRoomIs(page, 'Beach Pizza Shop', { fail, timeout: 8000 });
await page
  .getByRole('button', { name: /dismiss intro/i })
  .click({ timeout: 3000 })
  .catch(() => {});
// Seeding 'finale' also raises the capstone card — dismiss it so it doesn't cover
// the shelf we came to see.
await page
  .getByRole('button', { name: /^nice$/i })
  .click({ timeout: 3000 })
  .catch(() => {});
await page.waitForTimeout(2000); // materials compile + the reactive props mount

// Turn to face the back-bar hall of fame (on the -X wall, to the spawn's left) —
// a modest drag-look toward it for the confirmation shot.
await page.mouse.move(640, 400);
await page.mouse.down();
await page.mouse.move(340, 380, { steps: 20 });
await page.mouse.up();
await page.waitForTimeout(600);
await page.screenshot({ path: '.shots/trophy.png' });

// The reactive props are 3D meshes (no DOM), so the contract this smoke enforces is
// "the seeded shop renders the earned trophies without throwing" — a shader/geometry
// error in any gated prop would surface via watchPageErrors above.
console.log(`trophy -> inShop=${inShop} errors=${failures()}`);
await ctx.close();
await finish('\ntrophy checks passed.', `\n${failures()} trophy check(s) FAILED`);
