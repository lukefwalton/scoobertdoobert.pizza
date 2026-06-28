// ───────────────────────────────────────────────────────────────────────────
// src/lib/leaderboard.ts — the client side of the arcade leaderboard.
//
// Talks to /api/score (GET board · POST submit). EVERYTHING degrades gracefully:
// there's no serverless runtime in local `vite preview` (and a self-host might not
// wire a Blob store), so a failed fetch just means "the board is offline" — never a
// thrown error, never a blocked UI. Your best is always kept locally regardless
// (progressStore.pizzaPointsBest); the leaderboard is a bonus on top.
// ───────────────────────────────────────────────────────────────────────────

export type ScoreEntry = { initials: string; score: number; ts?: string };

export type SubmitResult = {
  ok: boolean;
  rank?: number;
  /** Did the score crack the top 50? false = stored but "keep climbing." */
  ranked?: boolean;
  /** Failure reason: 'offline'/'unavailable' = backend down; 'bad_initials'/
   *  'rejected'/'invalid' = the initials; 'bad_score'/'error' = other. */
  reason?: string;
  entries?: ScoreEntry[];
};

/** Three A–Z letters, uppercased — the classic arcade tag. */
export function sanitizeInitials(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
}

function asEntries(v: unknown): ScoreEntry[] {
  if (!Array.isArray(v)) return [];
  return v.filter(
    (e): e is ScoreEntry => !!e && typeof e.initials === 'string' && typeof e.score === 'number',
  );
}

/** The top board, or null when it can't be reached. null = unavailable (offline /
 *  no backend / storage down); [] = a reachable but empty board — distinct, so the
 *  UI can say "offline" vs "no scores yet." */
export async function fetchLeaderboard(limit = 25): Promise<ScoreEntry[] | null> {
  try {
    const res = await fetch(`/api/score?limit=${limit}`, {
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { ok?: boolean; entries?: unknown };
    // ok:false (e.g. 'unavailable') is a reachable endpoint reporting a down
    // backend — treat it as offline, not as an empty board.
    if (!data?.ok) return null;
    return asEntries(data.entries);
  } catch {
    return null;
  }
}

/** Submit initials + score. Never throws; reason 'offline' means no backend. */
export async function submitScore(initials: string, score: number): Promise<SubmitResult> {
  const ini = sanitizeInitials(initials);
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
    };
    if (!data?.ok) return { ok: false, reason: data?.error ?? 'error' };
    return { ok: true, rank: data.rank, ranked: data.ranked, entries: asEntries(data.entries) };
  } catch {
    return { ok: false, reason: 'offline' };
  }
}
