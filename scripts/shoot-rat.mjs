// Verifies the rat-as-guide (Commit B): once it has knocked the secret open and
// settled, walking up to it shows "Press E to talk", and E opens a dialogue box
// that nudges you toward your next objective. The rat's knock/reveal itself is
// covered by shoot:rooms; this focuses on the new TALK interaction.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const browser = await chromium.launch();
let fail = 0;
const bad = (m) => {
  fail++;
  console.log('FAIL:', m);
};

const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});

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

// 1) Trigger the rat: step down past TRIGGER_Z so it darts to the panel, knocks,
//    reveals the secret, and bolts to settle at the dark end.
await page.keyboard.down('w');
await page.waitForTimeout(1600);
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

if (errors.length) bad(`rat: ${errors.length} page error(s): ${errors.slice(0, 2).join(' | ')}`);
console.log(
  `rat -> settled=${settled} talkPrompt=${talkPrompt} dialog=${dialogOpen} nudge=${nudgeShown} errors=${errors.length}`,
);

await ctx.close();
await browser.close();
console.log(fail ? `\n${fail} rat check(s) FAILED` : '\nrat checks passed.');
process.exit(fail ? 1 : 0);
