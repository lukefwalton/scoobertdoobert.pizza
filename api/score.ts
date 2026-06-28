import { put, list } from '@vercel/blob';
import type { IncomingMessage, ServerResponse } from 'node:http';

// The arcade high-score LEADERBOARD — 3 initials + a PIZZA POINTS score, no login.
// One route does both: GET /api/score → the top board; POST /api/score → submit.
//
// Local stand-ins for @vercel/node's request/response types (we don't depend on
// @vercel/node — it only pulled types and a pile of CVEs; see api/order.ts). The
// initials+score are NOT PII, so the board blob is access:'public' (unlike the
// private subscriber blobs); reads go through the function anyway.
//
// SETUP: needs a Blob store on the Vercel project (injects BLOB_READ_WRITE_TOKEN).
// In local `vite preview` there is no serverless runtime, so the client degrades
// gracefully (the score is still kept locally) — see src/lib/leaderboard.ts.
type VercelRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[]>;
};
type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (jsonBody: unknown) => VercelResponse;
};

type Entry = { initials: string; score: number; ts: string };

const BOARD = 'leaderboard/board.json';
const MAX_ENTRIES = 50; // the board keeps the all-time top 50
const MAX_SCORE = 5_000_000; // sanity ceiling — reject obviously-forged scores

// A short blocklist of the obvious 3-letter combos (classic-arcade hygiene). Not
// exhaustive — just turns away the lazy ones; an unlisted slur isn't our liability
// to fully solve with three letters, but we make the easy effort.
const BLOCKED = new Set([
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

function cleanInitials(v: unknown): string {
  return String(v ?? '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
}

async function readBoard(): Promise<Entry[]> {
  try {
    const { blobs } = await list({ prefix: BOARD, limit: 10 });
    const blob = blobs.find((b) => b.pathname === BOARD) ?? blobs[0];
    if (!blob) return [];
    const res = await fetch(blob.downloadUrl ?? blob.url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return data
      .map((d) => d as Record<string, unknown>)
      .filter((d) => typeof d.initials === 'string' && typeof d.score === 'number')
      .map((d) => ({
        initials: cleanInitials(d.initials),
        score: Math.max(0, Math.floor(d.score as number)),
        ts: typeof d.ts === 'string' ? d.ts : '',
      }));
  } catch {
    return [];
  }
}

async function writeBoard(entries: Entry[]): Promise<void> {
  await put(BOARD, JSON.stringify(entries), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ── GET: the top board ─────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const board = await readBoard();
    const limRaw = Array.isArray(req.query?.limit) ? req.query?.limit[0] : req.query?.limit;
    const limit = Math.max(1, Math.min(MAX_ENTRIES, Number(limRaw) || 25));
    res.status(200).json({ ok: true, entries: board.slice(0, limit) });
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

  const initials = cleanInitials(body.initials);
  const score = Math.floor(Number(body.score));
  if (initials.length < 3) {
    res.status(200).json({ ok: false, error: 'bad_initials' });
    return;
  }
  if (!Number.isFinite(score) || score <= 0 || score > MAX_SCORE) {
    res.status(200).json({ ok: false, error: 'bad_score' });
    return;
  }
  if (BLOCKED.has(initials)) {
    res.status(200).json({ ok: false, error: 'rejected' });
    return;
  }

  try {
    const board = await readBoard();
    const entry: Entry = { initials, score, ts: new Date().toISOString() };
    board.push(entry);
    board.sort((a, b) => b.score - a.score);
    const top = board.slice(0, MAX_ENTRIES);
    await writeBoard(top);
    // The submitter's rank on the trimmed board (1-based; 0 if it didn't make it).
    const rank = top.findIndex((e) => e === entry) + 1;
    res.status(200).json({ ok: true, stored: true, rank, entries: top.slice(0, 25) });
  } catch (err) {
    console.error('[api/score] blob write failed:', err);
    res.status(200).json({ ok: false, stored: false, error: 'store_failed' });
  }
}
