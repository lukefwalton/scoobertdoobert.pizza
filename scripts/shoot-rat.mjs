// Verifies the rat-as-guide (Commit B): once it has knocked the secret open and
// settled, walking up to it shows "Press E to talk", and E opens a dialogue box
// that nudges you toward your next objective. The rat's knock/reveal itself is
// covered by shoot:rooms; this focuses on the new TALK interaction.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

const ratPhase = () => page.evaluate(() => window.__sdpRatPhase);
const holdUntil = async (selector, keys, timeout = 12000) => {
  for (const k of keys) await page.keyboard.down(k);
  const ok = await page.waitForSelector(selector, { timeout }).then(
    () => true,
    () => false,
  );
  for (const k of keys) await page.keyboard.up(k);
  return ok;
};

await page.goto(base + '/?room=hallway&debug=1', { waitUntil: 'networkidle' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 15000 })
  .catch(() => bad('world never mounted'));
await page
  .waitForFunction(() => typeof window.__sdpRatPhase === 'string', null, { timeout: 8000 })
  .catch(() => bad('rat phase hook never appeared'));
await page.waitForTimeout(800);
// suppress the streamed welcome so it can't sit over the dialog
await page.addStyleTag({ content: '.hud-welcome{display:none !important}' });

let talkPrompt = false;
let dialogOpen = false;
let nudgeShown = false;

// 1) Trigger the rat: walk down the hall UNTIL it breaks off to knock (its phase
//    leaves 'lead'). Polling — not a fixed-duration walk — so it's robust on a
//    slow CI runner, where a fixed press covers less ground (clamped per-frame
//    delta) and might never reach the trigger zone. Then it knocks → reveals →
//    bolts → settles to 'done' on its own.
await page.keyboard.down('w');
await page
  .waitForFunction(() => window.__sdpRatPhase && window.__sdpRatPhase !== 'lead', null, {
    timeout: 16000,
  })
  .catch(() => {});
await page.keyboard.up('w');
const settled = await page
  .waitForFunction(() => window.__sdpRatPhase === 'done', null, { timeout: 12000 })
  .then(
    () => true,
    () => false,
  );
if (!settled) bad(`rat never settled to 'done' (phase ${await ratPhase()})`);

if (settled) {
  // 2) Walk over to the settled rat (it hugs the -X wall at the dark end): A+W
  //    heads -X/-Z toward it. Stop the moment the talk prompt shows.
  talkPrompt = await holdUntil('.hud-prompt--npc', ['a', 'w']);
  if (!talkPrompt) bad('rat: never got the "talk" prompt walking up to the settled rat');
  else {
    // 3) E opens the dialogue box, which carries a nudge toward the next objective.
    await page.keyboard.press('e');
    const dlg = await page
      .waitForSelector('.hud-dialog[aria-label="the rat"]', { timeout: 5000 })
      .catch(() => null);
    dialogOpen = !!dlg;
    if (!dialogOpen) bad('rat: pressing E did not open the dialogue box');
    else {
      const nudge = await page.$('.hud-dialog__nudge');
      const txt = nudge ? ((await nudge.textContent()) ?? '').trim() : '';
      nudgeShown = txt.length > 0;
      if (!nudgeShown) bad('rat: dialogue had no objective nudge');
      await page.screenshot({ path: '.shots/rat.png' });
      // Esc closes it.
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
      if (await page.$('.hud-dialog[aria-label="the rat"]'))
        bad('rat: Escape did not close the dialogue box');
    }
  }
}

console.log(
  `rat -> settled=${settled} talkPrompt=${talkPrompt} dialog=${dialogOpen} nudge=${nudgeShown} errors=${failures()}`,
);

await ctx.close();
await finish('\nrat checks passed.', `\n${failures()} rat check(s) FAILED`);
