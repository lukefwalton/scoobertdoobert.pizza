// ───────────────────────────────────────────────────────────────────────────
// Luck & the universal d20 — the game layer's core RNG primitive (Luke, 2026-06-21:
// "let's make a damn game here"; "nat 20 and crit fail as 3x mechanics across the
// board"; luck "spent by the system"; 2026-06-22: "do it like D&D — it's advantage:
// 2 d20, take the higher").
//
// Every chance in the world rolls through here: a d20 where a natural 20 is a crit
// success and a natural 1 is a crit fail, each a 3× swing. LUCK (earned by rituals
// like the shrine clap, see progressStore) buys ADVANTAGE the D&D way, one point
// of luck upgrades a stakes roll to advantage: roll TWO d20 and keep the HIGHER.
// The second die is rolled in the backend, never shown. The system spends the luck
// for you (1 per advantaged roll), committed before the dice settle, you never
// spend by hand. So the luckier you are, the more of your rolls have advantage:
// a likelier nat 20, a rarer crit fail, while your luck lasts.
//
// The PURE math (`rollLuckyD20`, crits, labels) lives in `./luck-core` so store-free
// modules (the terminal's `roll`) can use it; this file re-exports all of it and
// adds the thin store-bound `rollD20`, which reads + spends luck from the durable
// save. Existing importers of '../lib/luck' are unchanged.
// ───────────────────────────────────────────────────────────────────────────

import { useProgressStore, selectLuck } from '../state/progressStore';
import { rollLuckyD20, type Roll } from './luck-core';

// Re-export the pure core so '../lib/luck' stays the single import site for callers
// that also want the store-bound rollD20 (D20, TrapDoor, …).
export * from './luck-core';

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
