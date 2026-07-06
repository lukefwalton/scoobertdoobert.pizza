// ───────────────────────────────────────────────────────────────────────────
// src/lib/leaderboard.ts — the client side of the arcade leaderboard.
//
// Talks to /api/score (GET board · POST submit). EVERYTHING degrades gracefully:
// there's no serverless runtime in local `vite preview` (and a self-host might not
// wire a Blob store), so a failed fetch just means "the board is offline" — never a
// thrown error, never a blocked UI. Your best is always kept locally regardless
// (progressStore.pizzaPointsBest); the leaderboard is a bonus on top.
// ───────────────────────────────────────────────────────────────────────────

import {
  cleanInitials,
  type RankWindow,
  type RankNeighbor,
  type LeaderWindow,
} from './leaderboardCore';

export type { RankWindow, RankNeighbor, LeaderWindow } from './leaderboardCore';

export type ScoreEntry = { initials: string; score: number; ts?: string };

/** The board plus (optionally) THIS player's rank window — their would-be rank, the
 *  gap to the next-higher score, and the handful of real entries around them. `you` is
 *  present only when a score was passed (GET `?around=` / a POST). */
export type BoardData = { entries: ScoreEntry[]; you?: RankWindow };

export type SubmitResult = {
  ok: boolean;
  rank?: number;
  /** Did the score crack the top 50? false = stored but "keep climbing." */
  ranked?: boolean;
  /** Failure reason: 'offline'/'unavailable' = backend down; 'bad_initials'/
   *  'rejected'/'invalid' = the initials; 'bad_score'/'error' = other. */
  reason?: string;
  entries?: ScoreEntry[];
  /** The player's rank window (own rank + gap-to-next + neighbors), when the backend
   *  returned it — so submit can show "you're #N, X to climb" with context. */
  you?: RankWindow;
};

function asEntries(v: unknown): ScoreEntry[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (e): e is ScoreEntry => !!e && typeof e.initials === 'string' && typeof e.score === 'number',
  );
}

/** Defensively normalize a `you` window from the API (same-origin, but still validate
 *  the shape so a malformed field never throws in render). Returns undefined if absent
 *  or malformed. */
function asWindow(v: unknown): RankWindow | undefined {
  if (!v || typeof v !== 'object') return undefined;
  const w = v as Record<string, unknown>;
  if (typeof w.rank !== 'number' || typeof w.gap !== 'number') return undefined;
  const neighbors: RankNeighbor[] = Array.isArray(w.neighbors)
    ? w.neighbors.filter(
        (n): n is RankNeighbor =>
          !!n &&
          typeof n.rank === 'number' &&
          typeof n.initials === 'string' &&
          typeof n.score === 'number',
      )
    : [];
  return {
    rank: w.rank,
    index: typeof w.index === 'number' ? w.index : Math.max(0, w.rank - 1),
    gap: w.gap,
    neighbors,
  };
}

/** The top board (+ this player's rank window when `score` is given), or null when it
 *  can't be reached. null = unavailable (offline / no backend / storage down);
 *  `{ entries: [] }` = a reachable but empty board — distinct, so the UI can say
 *  "offline" vs "no scores yet." */
export async function fetchLeaderboard(
  limit = 25,
  score?: number,
  window: LeaderWindow = 'all',
): Promise<BoardData | null> {
  try {
    const q = new URLSearchParams({ limit: String(limit) });
    if (typeof score === 'number' && score > 0) q.set('around', String(Math.floor(score)));
    if (window !== 'all') q.set('window', window); // 'all' stays param-free (backward-compatible)
    const res = await fetch(`/api/score?${q.toString()}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; entries?: unknown; you?: unknown };
    // ok:false (e.g. 'unavailable') is a reachable endpoint reporting a down
    // backend — treat it as offline, not as an empty board.
    if (!data?.ok) return null;
    return { entries: asEntries(data.entries), you: asWindow(data.you) };
  } catch {
    return null;
  }
}

/** Submit initials + score. Never throws; reason 'offline' means no backend. */
export async function submitScore(initials: string, score: number): Promise<SubmitResult> {
  const ini = cleanInitials(initials);
  if (ini.length < 3 || !Number.isFinite(score) || score <= 0) {
    return { ok: false, reason: 'invalid' };
  }
  try {
    const res = await fetch('/api/score', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      // website: '' is the honeypot field the server checks (empty = human).
      body: JSON.stringify({ initials: ini, score: Math.floor(score), website: '' }),
    });
    if (!res.ok) return { ok: false, reason: 'offline' };
    const data = (await res.json()) as {
      ok?: boolean;
      rank?: number;
      ranked?: boolean;
      error?: string;
      entries?: unknown;
      you?: unknown;
    };
    if (!data?.ok) return { ok: false, reason: data?.error ?? 'error' };
    return {
      ok: true,
      rank: data.rank,
      ranked: data.ranked,
      entries: asEntries(data.entries),
      you: asWindow(data.you),
    };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}
