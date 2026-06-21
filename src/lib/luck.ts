// ───────────────────────────────────────────────────────────────────────────
// Luck & the universal d20 — the game layer's core RNG primitive (Luke, 2026-06-21:
// "let's make a damn game here"; "nat 20 and crit fail as 3x mechanics across the
// board"; luck "spent by the system").
//
// Every chance in the world rolls through here: a d20 where a natural 20 is a
// crit success and a natural 1 is a crit fail, each a 3× swing. LUCK (earned by
// rituals like the shrine clap, see progressStore) buys ADVANTAGE — the system
// quietly spends luck to reroll a bad die and keep the best, so the luckier you
// are the likelier a nat 20 and the rarer a crit fail. You never spend luck by
// hand; the system does it for you.
//
// The core (`rollLuckyD20`) is PURE — it takes the luck available and an rng, so
// it unit-tests deterministically. The thin store-bound `rollD20` reads + spends
// luck from the durable save.
// ───────────────────────────────────────────────────────────────────────────

import { useProgressStore, selectLuck } from '../state/progressStore';

export type Crit = 'nat20' | 'nat1' | null;

/** A crit (nat 20 or crit fail) swings the outcome 3× — "across the board." */
export const CRIT_MULT = 3;

/** The most luck the system will spend to rescue a single roll. */
export const MAX_LUCK_PER_ROLL = 3;

/** Below this, a roll is "bad enough" that the system spends luck to help it —
 *  so luck rescues poor rolls (and crit fails) but isn't wasted on good ones. */
const HELP_BELOW = 15;

export type Roll = {
  /** The face you land on, 1..20. */
  face: number;
  /** nat20 (crit success) / nat1 (crit fail) / null. */
  crit: Crit;
  /** How much luck the system consumed to improve this roll (0 if none). */
  luckSpent: number;
};

const d20 = (rng: () => number): number => 1 + Math.floor(rng() * 20);
const critOf = (face: number): Crit => (face === 20 ? 'nat20' : face === 1 ? 'nat1' : null);

/**
 * Roll a luck-biased d20. Pure: pass the luck available + an rng (Math.random in
 * prod, a seeded sequence in tests). Luck buys advantage — up to MAX_LUCK_PER_ROLL
 * extra dice on a sub-par base roll, keeping the best — and reports how much it
 * spent so the caller can debit the save.
 */
export function rollLuckyD20(luckAvailable: number, rng: () => number = Math.random): Roll {
  const base = d20(rng);
  // Spend luck only to rescue a sub-par roll (never on an already-good one).
  const spend =
    base >= HELP_BELOW ? 0 : Math.max(0, Math.min(MAX_LUCK_PER_ROLL, Math.floor(luckAvailable)));
  let face = base;
  for (let i = 0; i < spend; i++) face = Math.max(face, d20(rng));
  return { face, crit: critOf(face), luckSpent: spend };
}

/**
 * Roll the universal d20 against the durable save. `useLuck` (default true) gates
 * the luck economy: a STAKES roll (the dice-monster, future encounters) reads
 * current luck, rolls with advantage, and debits what the system spent. A
 * LOW-STAKES roll — the jukebox/dice MUSIC selector, where a "high" roll means
 * nothing — passes `useLuck: false` so it's a plain d20 that never burns your luck
 * (it still reports nat 20 / crit fail for flavour). Crits stay 3× either way.
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
