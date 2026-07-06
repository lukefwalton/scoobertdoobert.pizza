import type { RankWindow } from './leaderboardCore';

// ───────────────────────────────────────────────────────────────────────────
// buildYouRows — the rows for the leaderboard's "you" strip: the real neighbors
// (competition rank) with a synthetic YOU row spliced in at score order, so a player
// outside the top-N sees exactly where they land.
//
// The one subtlety is dedup. After a real submit the player's OWN row is on the board
// (the API's neighbors include the just-written score), so the synthetic YOU row would
// DUPLICATE it — drop the matching real row THEN. But on the preview path (a GET
// ?around=<best> before signing) NOTHING is stored, so there is nothing to dedup:
// matching a typed-initials neighbor there would wrongly hide a real, unrelated row
// (initials are 3 letters and scores are ints, so an initials+score collision is
// plausible). Hence dedup is gated on `submitted`. Before a submit the self row is just
// "YOU"; after, it wears the signed initials. Pure + unit-tested (youStrip.test.ts).
// ───────────────────────────────────────────────────────────────────────────

export type YouRow = { rank: number; initials: string; score: number; self?: boolean };

export function buildYouRows(
  you: RankWindow,
  score: number,
  mine: string,
  submitted: boolean,
): YouRow[] {
  // Only after a successful POST is the player's own row actually on the board, so only
  // then can the synthetic YOU row duplicate a real one. Drop the FIRST exact match
  // (initials+score); if a DIFFERENT player happens to share both, the extra identical
  // row simply stays — visually indistinguishable, never a lost distinct neighbor.
  let dropped = false;
  const near =
    submitted && mine
      ? you.neighbors.filter((n) => {
          if (!dropped && n.initials === mine && n.score === score) {
            dropped = true;
            return false;
          }
          return true;
        })
      : you.neighbors;
  const rows: YouRow[] = [];
  const self: YouRow = {
    rank: you.rank,
    initials: submitted && mine ? mine : 'YOU',
    score,
    self: true,
  };
  let inserted = false;
  for (const n of near) {
    if (!inserted && n.score < score) {
      rows.push(self);
      inserted = true;
    }
    rows.push(n);
  }
  if (!inserted) rows.push(self);
  return rows;
}
