import { create } from 'zustand';
import { CRIT_MULT, type Crit } from '../lib/luck';

// ───────────────────────────────────────────────────────────────────────────
// monsterStore — the dice-MONSTER (Phase 6). You gamble against it with a d20:
// roll higher than it and you WIN (the reward is sound); roll lower or tie and
// you LOSE and IT GROWS. Keep losing and it swells until it's TOO BIG TO MOVE —
// at which point it's just immobile scenery you stroll past. The joke is the
// anticlimax: it is NEVER a fail/death state (taste guardrail), it just gets
// absurd. Session-scoped (resets on reload), so the room remembers your losses
// while you're here.
// ───────────────────────────────────────────────────────────────────────────

/** Losses needed for the monster to bloat to its full, stuck size. */
export const MONSTER_LOSS_CAP = 6;

/** Visual scale for a given loss count: 1 (small + menacing) → ~3.8 (room-filling
 *  but still under the dice-pit ceiling), inert. Clamped at the cap. */
export function monsterScale(losses: number): number {
  return 1 + (Math.min(losses, MONSTER_LOSS_CAP) / MONSTER_LOSS_CAP) * 2.8;
}

export type Bout = { you: number; it: number; won: boolean; crit: Crit };

type MonsterState = {
  losses: number;
  wins: number;
  /** The most recent bout (null before the first roll). */
  last: Bout | null;
  /** True once it's bloated to the cap — too big to move, pure scenery now. */
  maxed: boolean;
  /** Resolve a player roll (1..20, + its crit) against a fresh monster roll;
   *  updates tallies and returns the bout. Ties go to the monster (the house
   *  edge). A NAT 20 auto-wins; a CRIT FAIL auto-loses AND bloats it 3× (the
   *  "3× across the board" swing) — but losing is never a fail state, it just
   *  gets more absurd. */
  resolve: (you: number, crit?: Crit) => Bout;
  reset: () => void;
};

export const useMonsterStore = create<MonsterState>((set, get) => ({
  losses: 0,
  wins: 0,
  last: null,
  maxed: false,
  resolve: (you, crit = null) => {
    const it = 1 + Math.floor(Math.random() * 20);
    // Crit overrides the compare; otherwise strictly-higher wins (ties feed it).
    const won = crit === 'nat20' ? true : crit === 'nat1' ? false : you > it;
    const grow = crit === 'nat1' ? CRIT_MULT : won ? 0 : 1; // crit fail = 3× bloat
    const losses = Math.min(MONSTER_LOSS_CAP, get().losses + grow);
    const wins = won ? get().wins + 1 : get().wins;
    const bout: Bout = { you, it, won, crit };
    set({ losses, wins, last: bout, maxed: losses >= MONSTER_LOSS_CAP });
    return bout;
  },
  reset: () => set({ losses: 0, wins: 0, last: null, maxed: false }),
}));
