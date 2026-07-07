// ───────────────────────────────────────────────────────────────────────────
// src/lib/loot.ts — the shared "grab this loot" action (the interactive-music half).
//
// Every way of grabbing loot — clicking it, walking onto it, pressing P, the smoke
// hook — funnels through collectLootById so they can't double-collect and all get
// the same reward: points (scoreStore), a TOAST, and a musical note. The note is
// the interactive-music hook: each grab plays the next step of a climbing
// pentatonic scale, so a collection COMBO literally plays an ascending melody and a
// broken combo drops back to the root. (No wrong notes — it's a pentatonic.)
// ───────────────────────────────────────────────────────────────────────────
import { audio } from '../audio/engine';
import { noteToFreq } from './chimes';
import { announce } from '../state/toastStore';
import { useScoreStore } from '../state/scoreStore';
import { useProgressStore } from '../state/progressStore';
import { lootById, lootDropById } from '../data/loot';

// C-major pentatonic up two-plus octaves — the "collect" ladder. The combo index
// walks up it (capped at the top), so a streak rings out a rising run.
const SCALE: Array<[string, number]> = [
  ['C', 5],
  ['D', 5],
  ['E', 5],
  ['G', 5],
  ['A', 5],
  ['C', 6],
  ['D', 6],
  ['E', 6],
  ['G', 6],
  ['A', 6],
  ['C', 7],
];

/**
 * Grab a loot drop by id. IDEMPOTENT within a run (no-op if already taken).
 * Returns true the one time it actually collects. Plays the combo note + a milestone
 * sparkle, and toasts the points.
 */
export function collectLootById(id: string): boolean {
  const drop = lootDropById(id);
  if (!drop) return false;
  const type = lootById(drop.type);
  if (!type) return false;
  const res = useScoreStore.getState().collectLoot(id, type.points, type.grow);
  if (!res) return false; // already taken this run

  // Tally the lifetime haul (the trophy case's "how many pizza slices, ever" count).
  // The run score is ephemeral; this durable per-type total is not.
  useProgressStore.getState().addLoot(type.id);

  audio.unlock();
  // Climb the scale with the combo — collecting IS a melody.
  const [n, o] = SCALE[Math.min(res.combo - 1, SCALE.length - 1)];
  audio.playChime(noteToFreq(n, o), 0, 0.16, 0.7);
  // Every 5th in a streak gets a bright octave sparkle — the share-fuel flourish.
  if (res.combo > 1 && res.combo % 5 === 0) audio.playChime(noteToFreq('C', 7), 0.25, 0.12, 1.1);

  const comboTag = res.combo > 1 ? ` ·  combo ×${res.combo}` : '';
  announce(`${type.glyph} +${res.awarded}${comboTag}`, res.combo >= 5 ? 'crit-good' : 'luck');
  // One-time-per-run nudge the moment you beat your record: go put your initials up.
  if (res.newBest) {
    window.setTimeout(
      () => announce('🏆 New best! Open the menu (Esc) to sign the leaderboard.', 'crit-good'),
      900,
    );
  }
  return true;
}
