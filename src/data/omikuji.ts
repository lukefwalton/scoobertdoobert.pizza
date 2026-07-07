// ───────────────────────────────────────────────────────────────────────────
// src/data/omikuji.ts — おみくじ, the shrine fortune draw (the game layer's most
// legible BAD↔GREAT roll). Data-only + a pure mapper, like quests.ts: the roll
// lives in the world (a luck-biased universal d20), this just turns a landed face
// into a fortune tier on the traditional ladder — 大吉 (great blessing) down to 凶
// (a curse). Because the die is luck-biased (advantage), a luckier player literally
// draws better fortunes: "turn luck into clear outcomes" made a ritual (Luke).
//
// Taste guardrail: the shrine is a SWEET room, so even 凶 is goofy theatre — the
// real omusubi custom (tie the bad slip to a branch and leave the bad luck behind),
// never a penalty. A GREAT draw pays out luck; a bad one costs you nothing.
// ───────────────────────────────────────────────────────────────────────────

import type { Crit } from '../lib/luck-core';
import type { ToastKind } from '../state/toastStore';

export type Fortune = {
  /** Stable rank id, worst→best: kyo · sue · chu · kichi · daikichi. */
  id: 'kyo' | 'sue' | 'chu' | 'kichi' | 'daikichi';
  /** The kanji rank (shown big on the paper slip). */
  jp: string;
  /** The English gloss. */
  en: string;
  /** A sweet one-line reading, the shrine's voice. */
  line: string;
  /** Luck granted by this fortune (blessings only; the rest give none, taste-safe:
   *  a bad draw never costs luck — losing never hard-fails). */
  luck: number;
  /** How the announce toast reads it — 🍀/★ for a blessing, ☠ for the curse. */
  kind: ToastKind;
};

// The ladder, worst → best. Ordered so a caller can index by tier if ever needed.
export const FORTUNES: Record<Fortune['id'], Fortune> = {
  kyo: {
    id: 'kyo',
    jp: '凶',
    en: 'Curse',
    line: 'Ill fortune. Old custom: tie the slip to a branch and leave the bad luck behind you.',
    luck: 0,
    kind: 'crit-bad',
  },
  sue: {
    id: 'sue',
    jp: '末吉',
    en: 'Future Blessing',
    line: "Fortune's still on its way. Patience — it's coming.",
    luck: 0,
    kind: 'info',
  },
  chu: {
    id: 'chu',
    jp: '中吉',
    en: 'Middling Blessing',
    line: 'Steady fortune. No complaints.',
    luck: 0,
    kind: 'info',
  },
  kichi: {
    id: 'kichi',
    jp: '吉',
    en: 'Blessing',
    line: 'A good sign — the wind is at your back.',
    luck: 1,
    kind: 'luck',
  },
  daikichi: {
    id: 'daikichi',
    jp: '大吉',
    en: 'Great Blessing',
    line: 'The kami are delighted. Everything breaks your way today.',
    luck: 2,
    kind: 'crit-good',
  },
};

/**
 * Map a landed d20 face (+ its crit) to a fortune. The crits pin the extremes so a
 * NAT 20 always draws 大吉 and a NAT 1 always draws 凶 (the BAD/GREAT swing reads);
 * everything between climbs the ladder with the face. Pure + total (every 1..20
 * lands a tier), so it's trivially unit-testable and the world stays a thin caller.
 */
export function fortuneForRoll(face: number, crit: Crit): Fortune {
  if (crit === 'nat20') return FORTUNES.daikichi;
  if (crit === 'nat1') return FORTUNES.kyo;
  if (face >= 17) return FORTUNES.daikichi;
  if (face >= 12) return FORTUNES.kichi;
  if (face >= 8) return FORTUNES.chu;
  if (face >= 4) return FORTUNES.sue;
  return FORTUNES.kyo;
}
