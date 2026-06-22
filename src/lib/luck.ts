// ───────────────────────────────────────────────────────────────────────────
// Luck & the universal d20 — the game layer's core RNG primitive (Luke, 2026-06-21:
// "let's make a damn game here"; "nat 20 and crit fail as 3x mechanics across the
// board"; luck "spent by the system"; 2026-06-22: "do it like D&D — it's advantage:
// 2 d20, take the higher").
//
// Every chance in the world rolls through here: a d20 where a natural 20 is a crit
// success and a natural 1 is a crit fail, each a 3× swing. LUCK (earned by rituals
// like the shrine clap, see progressStore) buys ADVANTAGE the D&D way — one point
// of luck upgrades a stakes roll to advantage: roll TWO d20 and keep the HIGHER.
// The second die is rolled in the backend, never shown. The system spends the luck
// for you (1 per advantaged roll), committed before the dice settle — you never
// spend by hand. So the luckier you are, the more of your rolls have advantage:
// a likelier nat 20, a rarer crit fail, while your luck lasts.
//
// The core (`rollLuckyD20`) is PURE — it takes the luck available and an rng, so it
// unit-tests deterministically. The thin store-bound `rollD20` reads + spends luck
// from the durable save.
// ───────────────────────────────────────────────────────────────────────────

import { useProgressStore, selectLuck } from '../state/progressStore';

export type Crit = 'nat20' | 'nat1' | null;

/** A crit (nat 20 or crit fail) swings the outcome 3× — "across the board." */
export const CRIT_MULT = 3;

/** Advantage costs one point of luck: D&D-style, it rolls a second d20 and keeps
 *  the higher — so at most one luck is ever spent on a single roll. */
export const LUCK_PER_ADVANTAGE = 1;

export type Roll = {
  /** The face you land on, 1..20 — the higher of the two dice under advantage. */
  face: number;
  /** nat20 (crit success) / nat1 (crit fail) / null, read off the landed face. */
  crit: Crit;
  /** Luck the system consumed for this roll: 1 if it bought advantage, else 0. */
  luckSpent: number;
};

const d20 = (rng: () => number): number => 1 + Math.floor(rng() * 20);
const critOf = (face: number): Crit => (face === 20 ? 'nat20' : face === 1 ? 'nat1' : null);

/**
 * Roll the universal d20, D&D-style. Pure: pass the luck available + an rng
 * (Math.random in prod, a seeded sequence in tests). With at least one luck banked
 * the system buys ADVANTAGE — rolls a second, hidden d20 and keeps the higher face
 * — and reports the one luck it spent so the caller can debit the save. With no
 * luck it's a single plain d20. Advantage is committed up front (both dice roll
 * before we know the first), exactly like declaring advantage at the table; a nat
 * 20 / nat 1 always reads off the landed (kept) face.
 */
export function rollLuckyD20(luckAvailable: number, rng: () => number = Math.random): Roll {
  const first = d20(rng);
  if (Math.floor(luckAvailable) < LUCK_PER_ADVANTAGE) {
    return { face: first, crit: critOf(first), luckSpent: 0 };
  }
  const second = d20(rng); // the backend die — never shown
  const face = Math.max(first, second); // advantage: keep the higher
  return { face, crit: critOf(face), luckSpent: LUCK_PER_ADVANTAGE };
}

/**
 * Roll the universal d20 against the durable save. `useLuck` (default true) gates
 * the luck economy: a STAKES roll (the dice-monster, the grass goblin) reads your
 * current luck and, if you have any, rolls with advantage and debits the one luck
 * it spent. A LOW-STAKES roll — the jukebox/dice MUSIC selector, where a "high"
 * roll means nothing — passes `useLuck: false` so it's a plain d20 that never burns
 * your luck (it still reports nat 20 / crit fail for flavour). Crits stay 3× either way.
 */
export function rollD20(useLuck = true): Roll {
  const luck = useLuck ? selectLuck(useProgressStore.getState()) : 0;
  const r = rollLuckyD20(luck);
  if (r.luckSpent > 0) useProgressStore.getState().spendLuck(r.luckSpent);
  return r;
}

/** Short label for a crit, for the announce toast / signage. */
export function critLabel(crit: Crit): string | null {
  return crit === 'nat20' ? 'NAT 20' : crit === 'nat1' ? 'CRIT FAIL' : null;
}
