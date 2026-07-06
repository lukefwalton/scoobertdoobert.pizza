// ───────────────────────────────────────────────────────────────────────────
// src/lib/leaderboardCore.ts — the PURE leaderboard contract (no I/O).
//
// Shared by the serverless handler (api/score.ts) and unit-tested directly
// (leaderboardCore.test.ts) — the focused test the review asked for. Keeping the
// path-encoding + ranking here means the race-free storage scheme is verified
// without needing a live Blob store.
//
// STORAGE SCHEME (append-only, race-free): each submission is its OWN blob whose
// pathname encodes the score (inverted, zero-padded, so lexical-ascending == score-
// descending) + the initials. Concurrent POSTs each write a UNIQUE path, so none
// can overwrite another (the old single-blob read-modify-write could). A read is a
// single `list()` that parses pathnames — no per-row fetch — and because the top
// scores sort FIRST, the first list page always holds the board.
// ───────────────────────────────────────────────────────────────────────────

/** Blob key prefix for the per-submission score blobs. */
export const SCORE_PREFIX = 'leaderboard/scores/';
/** Sanity ceiling — reject obviously-forged scores, and the basis for inversion. */
export const MAX_SCORE = 5_000_000;
/** Width of the inverted-score key (MAX_SCORE is 7 digits; pad to 8). */
const KEY_PAD = 8;
/** A score must place within this to count as "on the board." */
export const RANKED_TOP = 50;

/** Inverted, zero-padded score key: higher score → smaller string → sorts first. */
export function invKey(score: number): string {
  return String(MAX_SCORE - Math.floor(score)).padStart(KEY_PAD, '0');
}

/** The blob pathname for one submission. `id` must be unique (caller-provided). */
export function scorePath(score: number, initials: string, id: string): string {
  return `${SCORE_PREFIX}${invKey(score)}-${initials}-${id}.json`;
}

/** Parse a submission pathname back to {initials, score}; null if malformed. */
export function parseScorePath(pathname: string): { initials: string; score: number } | null {
  if (!pathname.startsWith(SCORE_PREFIX)) return null;
  const base = pathname.slice(SCORE_PREFIX.length).replace(/\.json$/, '');
  const parts = base.split('-'); // [invKey, initials, id]
  if (parts.length < 2 || !/^\d+$/.test(parts[0]) || !/^[A-Z]{3}$/.test(parts[1])) return null;
  const score = MAX_SCORE - Number(parts[0]);
  if (!Number.isFinite(score) || score < 0) return null;
  return { initials: parts[1], score };
}

/** 1-based rank for a score among existing scores: (# strictly greater) + 1. Ties
 *  share a rank. Race-tolerant (display only) — needs no exact-entry lookup. */
export function rankFor(scores: { score: number }[], score: number): number {
  return scores.filter((s) => s.score > score).length + 1;
}

export type RankNeighbor = { rank: number; initials: string; score: number };
export type RankWindow = {
  /** 1-based rank this score holds/would hold (ties share; == rankFor). */
  rank: number;
  /** # of entries strictly above (== rank - 1) — the sorted insertion index. */
  index: number;
  /** Points to the next-higher entry (the motivating "gap to climb"); 0 at the top. */
  gap: number;
  /** The real entries immediately around this rank, each with its COMPETITION rank —
   *  ties share a number, the same rule as `rank`/rankFor, so a neighbor tied with the
   *  player reads the player's own number (never an ordinal that drifts past it). */
  neighbors: RankNeighbor[];
};

/** The rank picture for ONE score against the (descending-sorted) board: its rank,
 *  the gap to the next-higher entry, and the handful of real entries around it — so
 *  a player OUTSIDE the top-N still gets a "you're #N, X points to climb, here's who's
 *  near you" strip (the motivate-the-90% view). Pure + unit-tested. `scores` must be
 *  sorted DESC (api/score's readScores already is). Works for an UNSTORED score too
 *  (a just-played run not yet on the board), since it ranks by comparison, not lookup. */
export function windowAround(
  scores: { initials: string; score: number }[],
  score: number,
  radius = 5,
): RankWindow {
  const index = scores.filter((s) => s.score > score).length; // strictly-greater count
  const rank = index + 1;
  const gap = index > 0 ? scores[index - 1].score - score : 0;
  const from = Math.max(0, index - radius);
  const to = Math.min(scores.length, index + radius);
  const neighbors = scores.slice(from, to).map((s) => ({
    // Competition rank (ties SHARE a number), the SAME rule as `rank` above — so a
    // neighbor tied with the player shows the player's own number, not an ordinal that
    // drifts past it. On [100,90,90,50] both 90s are #2 and the 50 is #4 (1-2-2-4).
    rank: rankFor(scores, s.score),
    initials: s.initials,
    score: s.score,
  }));
  return { rank, index, gap, neighbors };
}

/** Three A–Z letters, uppercased — the classic arcade tag (server-side mirror). */
export function cleanInitials(v: unknown): string {
  return String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
}

/** A short blocklist of the obvious 3-letter combos (classic-arcade hygiene). Not
 *  exhaustive — just turns away the lazy ones. */
export const BLOCKED_INITIALS = new Set([
  'ASS',
  'FUK',
  'FUC',
  'FUX',
  'SEX',
  'CUM',
  'FAG',
  'NIG',
  'KKK',
  'TIT',
  'JEW',
  'GAY',
  'DIE',
  'POO',
  'WTF',
]);

/** Validate a submission. Returns the cleaned values or a distinct error reason. */
export function validateSubmission(
  initialsRaw: unknown,
  scoreRaw: unknown,
): { ok: true; initials: string; score: number } | { ok: false; error: string } {
  const initials = cleanInitials(initialsRaw);
  const score = Math.floor(Number(scoreRaw));
  if (initials.length < 3) return { ok: false, error: 'bad_initials' };
  if (BLOCKED_INITIALS.has(initials)) return { ok: false, error: 'rejected' };
  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE)
    return { ok: false, error: 'bad_score' };
  return { ok: true, initials, score };
}
