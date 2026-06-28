// Verifies the dancing-entity loop in a GLB liminal level: a wanderer roams, and
// when the player comes near it transitions wander → approach → DANCE (never
// anything threatening). Uses the per-entity phase hook (gated to the test
// entrances) since the creatures roam, so a pixel check would be flaky.
import { mkdirSync } from 'node:fs';
import { startSmoke, watchPageErrors } from './lib/smoke.mjs';

const base = process.argv[2] || 'http://localhost:4173';
mkdirSync('.shots', { recursive: true });

const { ctx, page, fail: bad, finish, failures } = await startSmoke();
watchPageErrors(page, bad);

// ?room=liminal drops into the GLB liminal level (lighter fog than the deeper
// levels); &debug=1 exposes the per-entity phase hook.
await page.goto(base + '/?room=liminal&debug=1', { waitUntil: 'commit' });
await page
  .waitForSelector('.hud-menu-btn', { timeout: 15000 })
  .catch(() => bad('entities: world never mounted'));

// Wait out the GLB loader (tap Enter until the camera hook + entities exist).
for (let i = 0; i < 30; i++) {
  const ready = await page.evaluate(
    () => !!window.__sdpCam && typeof window['__sdpEntity:liminal-blob'] !== 'undefined',
  );
  if (ready) break;
  await page.keyboard.press('Enter').catch(() => {});
  await page.waitForTimeout(400);
}

const hasEntity = await page
  .waitForFunction(() => typeof window['__sdpEntity:liminal-blob'] !== 'undefined', null, {
    timeout: 8000,
  })
  .then(
    () => true,
    () => false,
  );
if (!hasEntity) bad('entities: liminal-blob phase hook never appeared');

const danced = () =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem('sdp_progress_v1') || '{}').secretsFound || [];
    } catch {
      return [];
    }
  });

let sawDance = false;
let sawApproach = false;
let dancePrompt = false;
let rhythmStarted = false;
let danceReward = false;
let danceRecorded = false;
if (hasEntity) {
  // Walk into the middle where they roam, then stand still — a wanderer drifts in
  // (approach) and stops to dance when it reaches you.
  await page.keyboard.down('w');
  await page.waitForTimeout(1200);
  await page.keyboard.up('w');
  for (let i = 0; i < 16 && !sawDance; i++) {
    await page.waitForTimeout(500);
    const p = await page.evaluate(() => [
      window['__sdpEntity:liminal-blob'],
      window['__sdpEntity:liminal-mop'],
    ]);
    if (p.includes('approach')) sawApproach = true;
    if (p.includes('dance')) sawDance = true;
  }
  await page.screenshot({ path: '.shots/entities.png' });
  // DANCE is the contract (a wanderer can't dance without first noticing you);
  // the brief "approach" phase can fall between samples, so it's logged, not gated.
  if (!sawDance) bad('entities: no wanderer ever DANCED when reached');

  // Dance ALONG: a dancing wanderer is the prompt's target → "dance along" cue.
  // Pressing E starts the rhythm minigame; copying the demoed sequence (read off
  // the test global) wins → the reward (luck toast + durable danced:<id> secret).
  if (sawDance) {
    dancePrompt = await page.waitForSelector('.hud-prompt--dance', { timeout: 6000 }).then(
      () => true,
      () => false,
    );
    if (!dancePrompt) bad('entities: a wanderer danced but no "dance along" prompt appeared');
    else {
      await page.keyboard.press('e');
      // The minigame overlay comes up in DEMO; wait for it to hand over to input.
      rhythmStarted = await page.waitForSelector('.hud-rhythm', { timeout: 5000 }).then(
        () => true,
        () => false,
      );
      if (!rhythmStarted) bad('entities: pressing E did not start the dance rhythm minigame');
      else {
        await page.waitForFunction(
          () => /your turn/i.test(document.querySelector('.hud-rhythm__cue')?.textContent || ''),
          null,
          { timeout: 6000 },
        );
        const seq = await page.evaluate(() => window.__sdpRhythmSeq);
        const KEY = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
        for (const d of seq || []) {
          await page.keyboard.press(KEY[d]);
          await page.waitForTimeout(120);
        }
        danceReward = await page
          .waitForFunction(
            () => {
              const el = document.querySelector('.hud-toast--luck');
              return !!el && /dance with|delighted/i.test(el.textContent || '');
            },
            null,
            { timeout: 6000 },
          )
          .then(
            () => true,
            () => false,
          );
        danceRecorded = (await danced()).some((s) => s.startsWith('danced:'));
        if (!danceReward) bad('entities: winning the rhythm raised no reward toast');
        if (!danceRecorded) bad('entities: winning the rhythm did not record a danced:<id> secret');
      }
    }
  }
}

console.log(
  `entities -> hook=${hasEntity} approach=${sawApproach} dance=${sawDance} prompt=${dancePrompt} rhythm=${rhythmStarted} reward=${danceReward} recorded=${danceRecorded} errors=${failures()}`,
);

await ctx.close();
await finish('\nentities checks passed.', `\n${failures()} entities check(s) FAILED`);
