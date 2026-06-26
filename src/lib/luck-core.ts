// ───────────────────────────────────────────────────────────────────────────
// Luck core — the PURE d20 math, split out from luck.ts so store-free modules can
// roll without pulling in zustand / the progress store. The terminal's `roll`
// command (commands.ts is deliberately store-free) is the first such consumer.
// luck.ts re-exports everything here and adds the store-bound `rollD20`, so every
// existing importer of '../lib/luck' is unchanged.
// ───────────────────────────────────────────────────────────────────────────

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
  /**
   * How much luck this roll cost: 1 if it bought advantage, else 0. DESCRIPTIVE
   * only — the pure roll never touches save state. PERSISTING the debit is the
   * store-bound caller's job (luck.ts `rollD20` writes it back); store-free
   * consumers like the terminal `roll` read this purely to explain the roll and
   * deliberately don't spend. So "spent" means "spent on THIS roll's math," never
   * "already written to the save."
   */
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

/** Short label for a crit, for the announce toast / signage. */
export function critLabel(crit: Crit): string | null {
  return crit === 'nat20' ? 'NAT 20' : crit === 'nat1' ? 'CRIT FAIL' : null;
}

/** The framed crit banner for signage / the terminal — a STAR for a nat 20, a SKULL
 *  for a crit fail, null otherwise. One source for the framing so nat20 vs nat1
 *  signage can't drift apart (a star fail would read wrong). */
export function critBanner(crit: Crit): string | null {
  return crit === 'nat20' ? '★ NAT 20 ★' : crit === 'nat1' ? '☠ CRIT FAIL ☠' : null;
}
