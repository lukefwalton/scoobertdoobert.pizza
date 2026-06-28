import { create } from 'zustand';
import { useProgressStore } from './progressStore';

// ───────────────────────────────────────────────────────────────────────────
// src/state/scoreStore.ts — the EPHEMERAL run score (NOT persisted).
//
// One descent = one run. You hoover loot for PIZZA POINTS, build a combo (grabs
// inside COMBO_WINDOW chain and multiply), and grow taller as you go. The run
// resets each time you enter the world (World mount → resetRun), so loot respawns
// and the score is a fresh arcade run every descent — replayable. The DURABLE best
// lives in progressStore (pizzaPointsBest), recorded as the score climbs; that's
// what the leaderboard submits and the storefront remembers.
// ───────────────────────────────────────────────────────────────────────────

/** A grab within this of the last continues the combo; longer resets it to 1. */
const COMBO_WINDOW_MS = 2500;
/** Combo multiplier is capped here so a long streak is great, not infinite. */
const MAX_COMBO_MULT = 9;
/** You can only get SO tall — kept under any room's ceiling (Controls also clamps
 *  per-room so you never poke through the roof). */
export const MAX_TALLNESS = 2.6;

export type LootAward = {
  awarded: number;
  combo: number;
  score: number;
  tallness: number;
  /** True the FIRST time this run's score crosses your record (or 100 for a cold
   *  player) — the cue to nudge "go sign the leaderboard." Fires once per run. */
  newBest: boolean;
};

type ScoreState = {
  /** Points this run. */
  score: number;
  /** Current combo length (grabs chained inside the window). */
  combo: number;
  /** Best combo reached this run (for a flourish). */
  bestCombo: number;
  /** Current bonus eye-height (grows as you collect; capped). */
  tallness: number;
  /** Loot drop ids taken THIS run (so they don't re-collect until the next run). */
  taken: string[];
  /** performance.now() of the last grab (drives the combo window). */
  lastGrabAt: number;
  /** Your durable best at the START of this run, + whether we've already nudged
   *  "go sign the board" — so the new-best cue fires exactly once per descent. */
  startBest: number;
  nudged: boolean;
  /** Collect a loot drop. IDEMPOTENT per id within a run (returns null if already
   *  taken), so click / walk-over / P / the smoke hook all converge safely. On a
   *  real collect it returns the award so the caller can play the note + announce. */
  collectLoot: (id: string, points: number, grow: number) => LootAward | null;
  /** Start a fresh run (World mount): zero the score/combo/height + clear taken. */
  resetRun: () => void;
};

// The live combo expires on its own so the HUD meter doesn't linger after a streak
// ends. Module-scoped (one combo at a time); cleared on each grab + on reset.
let comboTimer: ReturnType<typeof setTimeout> | undefined;

export const useScoreStore = create<ScoreState>((set, get) => ({
  score: 0,
  combo: 0,
  bestCombo: 0,
  tallness: 0,
  taken: [],
  lastGrabAt: 0,
  startBest: 0,
  nudged: false,

  collectLoot: (id, points, grow) => {
    const s = get();
    if (s.taken.includes(id)) return null;
    const now = typeof performance !== 'undefined' ? performance.now() : 0;
    const combo = now - s.lastGrabAt < COMBO_WINDOW_MS ? s.combo + 1 : 1;
    const awarded = points * Math.min(combo, MAX_COMBO_MULT);
    const score = s.score + awarded;
    const tallness = Math.min(MAX_TALLNESS, s.tallness + grow);
    // New-best cue: the first grab this run that beats your record (or clears 100
    // for a cold player). Fires once — the "go sign the leaderboard" nudge.
    const newBest = !s.nudged && score > Math.max(s.startBest, 99);
    set({
      taken: [...s.taken, id],
      combo,
      bestCombo: Math.max(s.bestCombo, combo),
      score,
      tallness,
      lastGrabAt: now,
      nudged: s.nudged || newBest,
    });
    // Drop the visible combo back to 0 if the streak isn't continued in time.
    if (comboTimer) clearTimeout(comboTimer);
    comboTimer = setTimeout(() => set({ combo: 0 }), COMBO_WINDOW_MS);
    // Bank the durable best as we climb (monotonic — only ever rises).
    useProgressStore.getState().recordPizzaScore(score);
    return { awarded, combo, score, tallness, newBest };
  },

  resetRun: () => {
    if (comboTimer) clearTimeout(comboTimer);
    set({
      score: 0,
      combo: 0,
      bestCombo: 0,
      tallness: 0,
      taken: [],
      lastGrabAt: 0,
      // Capture the record to beat THIS descent, and re-arm the one-time nudge.
      startBest: useProgressStore.getState().pizzaPointsBest,
      nudged: false,
    });
  },
}));
