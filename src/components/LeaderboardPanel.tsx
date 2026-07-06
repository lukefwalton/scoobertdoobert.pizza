import { useEffect, useState } from 'react';
import '../styles/leaderboard.css';
import {
  fetchLeaderboard,
  submitScore,
  type ScoreEntry,
  type RankWindow,
} from '../lib/leaderboard';
import { cleanInitials, RANKED_TOP } from '../lib/leaderboardCore';

// The "you" strip rows: the real neighbors (true rank) with a synthetic YOU row spliced
// in at score order — so a player OUTSIDE the top-N still sees exactly where they land.
type YouRow = { rank: number; initials: string; score: number; self?: boolean };
function buildYouRows(you: RankWindow, score: number, mine: string): YouRow[] {
  // Drop the player's just-submitted real entry (if it's already among the neighbors) so
  // the synthetic YOU row doesn't duplicate it. `mine` is '' before signing (a preview
  // window has nothing to dedup — the score isn't on the board yet).
  let dropped = false;
  const near = you.neighbors.filter((n) => {
    if (!dropped && mine && n.initials === mine && n.score === score) {
      dropped = true;
      return false;
    }
    return true;
  });
  const rows: YouRow[] = [];
  const self: YouRow = { rank: you.rank, initials: mine || 'YOU', score, self: true };
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

// The arcade leaderboard, reused in the pause menu (compact, with a "full board"
// link) and on the /leaderboard page. Sign your best with three letters; the board
// loads from /api/score. Fully graceful: if the backend isn't there (local preview,
// a self-host without a Blob store), it just says so — your best is kept locally.
//   entries: undefined = loading · null = offline · [] = empty · [...] = the board
export function LeaderboardPanel({
  score,
  rows = 10,
  showFullLink = false,
  loadBoard = true,
}: {
  score: number;
  rows?: number;
  showFullLink?: boolean;
  /** Auto-GET the board on mount + render the ranked list. The pause menu passes
   *  false (submit-only + a "full board" link), so just OPENING the menu never hits
   *  /api/score — important offline (and so a 404 in local preview / CI isn't logged
   *  as a console error by every pause-opening smoke). The /leaderboard page keeps it
   *  true to show the full board. */
  loadBoard?: boolean;
}) {
  const [entries, setEntries] = useState<ScoreEntry[] | null | undefined>(undefined);
  const [initials, setInitials] = useState('');
  // ranked = made the top board · unranked = stored but below it · badletters =
  // initials rejected · offline = backend down. Distinct so the UX never lies.
  const [status, setStatus] = useState<
    'idle' | 'submitting' | 'ranked' | 'unranked' | 'badletters' | 'offline'
  >('idle');
  const [rank, setRank] = useState<number | undefined>(undefined);
  // The player's rank window (own rank + gap-to-next + neighbors). Filled from a GET
  // `?around={score}` on mount (the "where would I land" preview) and from a POST reply
  // after signing. null = not fetched / offline / no score.
  const [you, setYou] = useState<RankWindow | null>(null);

  useEffect(() => {
    if (!loadBoard) return;
    let live = true;
    // Pass the local best so the board comes back with THIS player's window, not just the
    // top-N — the motivate-the-90% view (a player far down still sees their standing).
    fetchLeaderboard(rows, score).then((b) => {
      if (!live) return;
      setEntries(b ? b.entries : null);
      setYou(b?.you ?? null);
    });
    return () => {
      live = false;
    };
  }, [rows, loadBoard, score]);

  const canSubmit = score > 0 && cleanInitials(initials).length === 3 && status !== 'submitting';

  const onSubmit = async () => {
    if (!canSubmit) return;
    setStatus('submitting');
    const r = await submitScore(initials, score);
    if (r.ok) {
      setRank(r.rank);
      setStatus(r.ranked ? 'ranked' : 'unranked');
      if (r.you) setYou(r.you);
      if (r.entries && r.entries.length) setEntries(r.entries.slice(0, rows));
      else if (loadBoard)
        fetchLeaderboard(rows, score).then((b) => {
          setEntries(b ? b.entries : null);
          if (b?.you) setYou(b.you);
        });
    } else {
      // Initials problem vs backend down — show the right thing, not "bad initials"
      // for an outage (the review's failure-semantics fix).
      const initialsProblem =
        r.reason === 'bad_initials' || r.reason === 'rejected' || r.reason === 'invalid';
      setStatus(initialsProblem ? 'badletters' : 'offline');
    }
  };

  return (
    <div className="hud-board">
      <p className="hud-board__title">🏆 High Scores</p>

      {score > 0 ? (
        <div className="hud-board__submit">
          <span className="hud-board__lbl">
            Sign your best <strong>🍕 {score.toLocaleString()}</strong>
          </span>
          <span className="hud-board__entry">
            <input
              className="hud-board__initials"
              value={initials}
              onChange={(e) => setInitials(cleanInitials(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onSubmit();
              }}
              maxLength={3}
              placeholder="AAA"
              aria-label="your three initials"
              spellCheck={false}
              autoComplete="off"
            />
            <button className="hud-board__go" onClick={onSubmit} disabled={!canSubmit}>
              {status === 'submitting' ? '…' : 'ADD'}
            </button>
          </span>
        </div>
      ) : (
        <p className="hud-board__hint">Collect 🍕🌯🍣🛹🏄 for PIZZA POINTS, then sign the board.</p>
      )}

      {status === 'ranked' && (
        <p className="hud-board__msg hud-board__msg--ok">
          {rank ? `You're #${rank} on the board!` : 'You made the board!'}
        </p>
      )}
      {status === 'unranked' && (
        <p className="hud-board__msg hud-board__msg--ok">
          Submitted! Keep climbing to crack the top {RANKED_TOP}.
        </p>
      )}
      {status === 'offline' && (
        <p className="hud-board__msg">Couldn&rsquo;t reach the board — your best is saved here.</p>
      )}
      {status === 'badletters' && (
        <p className="hud-board__msg">
          Those initials didn&rsquo;t take — try three (different) letters.
        </p>
      )}

      {you && score > 0 && (
        <div className="hud-board__you">
          <p className="hud-board__you-head">
            You&rsquo;re <strong>#{you.rank}</strong>
            {you.gap > 0 ? (
              <>
                {' '}
                &middot; <strong>{you.gap.toLocaleString()}</strong> to climb
              </>
            ) : (
              <> &middot; top of the board!</>
            )}
          </p>
          <ol className="hud-board__list hud-board__list--you">
            {buildYouRows(you, score, cleanInitials(initials)).map((r, i) => (
              <li
                key={`${r.initials}-${r.rank}-${i}`}
                className={r.self ? 'hud-board__row--you' : undefined}
              >
                <span className="hud-board__rank">{r.self ? '▸' : r.rank}</span>
                <span className="hud-board__ini">{r.initials}</span>
                <span className="hud-board__sc">{r.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {loadBoard && entries === undefined && <p className="hud-board__msg">loading…</p>}
      {loadBoard && entries === null && status !== 'offline' && (
        <p className="hud-board__msg">The leaderboard is offline right now.</p>
      )}
      {loadBoard &&
        Array.isArray(entries) &&
        (entries.length === 0 ? (
          <p className="hud-board__msg">No scores yet — be the first.</p>
        ) : (
          <ol className="hud-board__list">
            {entries.map((e, i) => (
              <li key={`${e.initials}-${i}`}>
                <span className="hud-board__rank">{i + 1}</span>
                <span className="hud-board__ini">{e.initials}</span>
                <span className="hud-board__sc">{e.score.toLocaleString()}</span>
              </li>
            ))}
          </ol>
        ))}

      {showFullLink && (
        <p className="hud-board__full">
          <a href="/leaderboard">see the full board &raquo;</a>
        </p>
      )}
    </div>
  );
}
