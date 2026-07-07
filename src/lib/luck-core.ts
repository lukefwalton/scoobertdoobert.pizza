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
  /**
   * The NATURAL die — the first d20, before advantage. What you'd have rolled with
   * no luck. Equals `face` on a plain roll (and even under advantage when the first
   * die was already the higher). Lets a caller SHOW luck's work: `raw` → `face`.
   */
  raw: number;
  /**
   * True when luck bought advantage AND it actually improved the result (the kept
   * second die beat the natural one). This is the signal for the "🍀 luck tipped it"
   * payoff — the whole point of making luck legible (Luke: "turn luck into clear
   * outcomes"). False on a plain roll, and false even under advantage if the first
   * die already stood — so a nudge toast only fires when luck genuinely changed the
   * outcome, never on a roll luck didn't touch.
   */
  lucky: boolean;
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
    return { face: first, crit: critOf(first), luckSpent: 0, raw: first, lucky: false };
  }
  const second = d20(rng); // the backend die — never shown
  const face = Math.max(first, second); // advantage: keep the higher
  // `lucky` only when advantage genuinely moved the result up off the natural die —
  // so the "luck tipped it" beat can't fire on a roll luck didn't actually change.
  return {
    face,
    crit: critOf(face),
    luckSpent: LUCK_PER_ADVANTAGE,
    raw: first,
    lucky: face > first,
  };
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

/**
 * The "🍀 luck tipped it" tag to append to an announce toast — NON-EMPTY only when
 * advantage actually improved the roll (`roll.lucky`). It shows the natural die →
 * the kept face, so the player SEES luck pay off instead of it happening invisibly
 * in the backend (Luke: "turn luck into clear outcomes"). Returns '' for a plain
 * roll, a roll luck didn't move, or `undefined` (a forced/test roll with no luck
 * info) — so a caller can unconditionally append it. One source for the phrasing so
 * every consumer's luck payoff reads the same.
 */
export function luckTag(roll?: Roll): string {
  return roll?.lucky ? ` · 🍀 luck tipped it (${roll.raw}→${roll.face})` : '';
}
