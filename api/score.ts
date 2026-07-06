import { put, list } from '@vercel/blob';
import type { IncomingMessage, ServerResponse } from 'node:http';
import {
  SCORE_PREFIX,
  RANKED_TOP,
  scorePath,
  parseScorePath,
  windowAround,
  windowCutoff,
  asWindow,
  validateSubmission,
} from '../src/lib/leaderboardCore';

// The arcade high-score LEADERBOARD — 3 initials + a PIZZA POINTS score, no login.
// One route does both: GET /api/score → the top board; POST /api/score → submit.
//
// STORAGE (race-free, append-only): each submission is its OWN blob, keyed by
// score in the pathname (src/lib/leaderboardCore). Concurrent POSTs can't overwrite
// each other (the old single-blob read-modify-write could), and a read is a single
// `list()` that parses pathnames — no per-row fetch. The board blobs are public
// (initials + score aren't PII); reads still go through this function.
//
// Local Vercel req/res types (we don't depend on @vercel/node — see api/order.ts).
// SETUP: needs a Blob store on the Vercel project (injects BLOB_READ_WRITE_TOKEN).
// In local `vite preview` there's no serverless runtime, so the client degrades
// gracefully (see src/lib/leaderboard.ts).
type VercelRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[]>;
};
type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (jsonBody: unknown) => VercelResponse;
};

type Entry = { initials: string; score: number; ts?: string };

/** Coerce a blob's `uploadedAt` (a Date from @vercel/blob) to an ISO string, tolerating a
 *  string or absent value so a shape change never throws mid-read. */
function toIso(v: unknown): string | undefined {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'string') return v;
  return undefined;
}

// One list call returns up to 1000 blobs. Because the inverted-score key sorts the
// TOP scores first, the first page always holds the board even past 1000 lifetime
// submissions (those beyond aren't top-50 anyway). Append-only growth is fine at
// this scale; a periodic prune can come later if it ever matters.
const LIST_LIMIT = 1000;

/** Read every submitted score (one list, parse pathnames, sort desc). Returns null
 *  ONLY on a backend failure (so callers can distinguish "unavailable" from the
 *  empty board, which is a successful []). */
async function readScores(): Promise<Entry[] | null> {
  try {
    const { blobs } = await list({ prefix: SCORE_PREFIX, limit: LIST_LIMIT });
    const out: Entry[] = [];
    for (const b of blobs) {
      const parsed = parseScorePath(b.pathname);
      // `list()` gives the blob's upload time for free (no per-row fetch) — carry it so the
      // GET can time-box (Today / This Week) without reading each blob's body.
      if (parsed) out.push({ ...parsed, ts: toIso(b.uploadedAt) });
    }
    out.sort((a, b) => b.score - a.score);
    return out;
  } catch (err) {
    console.error('[api/score] list failed:', err);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── GET: the top board ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const scores = await readScores();
    if (scores === null) {
      // Distinct from an empty board: the storage is down, not just unpopulated.
      res.status(200).json({ ok: false, error: 'unavailable' });
      return;
    }
    const limRaw = Array.isArray(req.query?.limit) ? req.query?.limit[0] : req.query?.limit;
    const limit = Math.max(1, Math.min(RANKED_TOP, Number(limRaw) || 25));
    // `?window=today|week|all`: time-box the board to a UTC calendar day / ISO week before
    // ranking + slicing (unknown/absent → 'all', the prior behavior). Filtering FIRST means
    // rank/gap/neighbors are all relative to the chosen window.
    const winRaw = Array.isArray(req.query?.window) ? req.query?.window[0] : req.query?.window;
    const cutoff = windowCutoff(asWindow(winRaw), Date.now());
    const board =
      cutoff === null ? scores : scores.filter((s) => s.ts != null && Date.parse(s.ts) >= cutoff);
    // `?around=<score>`: also return THIS player's rank window (own rank + gap-to-next +
    // the real entries around them), so a player outside the top-N still sees where they
    // stand. Works for an unstored just-played score (windowAround ranks by comparison).
    const aroundRaw = Array.isArray(req.query?.around) ? req.query?.around[0] : req.query?.around;
    const around = aroundRaw != null && aroundRaw !== '' ? Number(aroundRaw) : NaN;
    const you =
      Number.isFinite(around) && around > 0 ? windowAround(board, Math.floor(around)) : undefined;
    res.status(200).json({ ok: true, entries: board.slice(0, limit), ...(you ? { you } : {}) });
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  // ── POST: submit a score ───────────────────────────────────────────────────
  let body: Record<string, unknown> = {};
  if (req.body && typeof req.body === 'object') {
    body = req.body as Record<string, unknown>;
  } else if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  // Honeypot (matches the order form): a hidden field no human fills → drop as a
  // 200 that looks like success, so a spam bot learns nothing.
  if (String(body.website ?? '').trim() !== '') {
    res.status(200).json({ ok: true, stored: false });
    return;
  }

  const v = validateSubmission(body.initials, body.score);
  if (!v.ok) {
    res.status(200).json({ ok: false, error: v.error });
    return;
  }

  // Append-only write: a unique blob per submission, so concurrent POSTs never
  // clobber each other.
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  try {
    await put(
      scorePath(v.score, v.initials, id),
      JSON.stringify({ initials: v.initials, score: v.score, ts: new Date().toISOString() }),
      { access: 'public', addRandomSuffix: false, contentType: 'application/json' },
    );
  } catch (err) {
    console.error('[api/score] put failed:', err);
    res.status(200).json({ ok: false, error: 'unavailable' });
    return;
  }

  // Compute the (display-only) rank + whether it cracked the board, and hand back
  // the fresh top for the client to render. A read failure here just means we
  // stored it but can't rank it right now — still a success.
  const scores = await readScores();
  if (scores === null) {
    res.status(200).json({ ok: true, stored: true, rank: 0, ranked: false, entries: [] });
    return;
  }
  // The just-written score is now in `scores`, so this window places the player among
  // real neighbors (own rank + gap-to-next + the entries around them) for the "you" strip.
  const you = windowAround(scores, v.score);
  res.status(200).json({
    ok: true,
    stored: true,
    rank: you.rank,
    ranked: you.rank <= RANKED_TOP,
    you,
    entries: scores.slice(0, 25),
  });
}
