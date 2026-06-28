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
