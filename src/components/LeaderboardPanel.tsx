import { useEffect, useState } from 'react';
import '../styles/leaderboard.css';
import {
  fetchLeaderboard,
  submitScore,
  type ScoreEntry,
  type RankWindow,
  type LeaderWindow,
} from '../lib/leaderboard';
import { cleanInitials, RANKED_TOP } from '../lib/leaderboardCore';
import { buildYouRows } from '../lib/youStrip';

// The time-boxing tabs (full-board view only). All-Time is the default first paint.
const WINDOW_TABS: { key: LeaderWindow; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'all', label: 'All-Time' },
];

// The arcade leaderboard, reused in the pause menu (compact, with a "full board"
// link) and on the /leaderboard page. Sign your best with three letters; the board
// loads from /api/score. Fully graceful: if the backend isn't there (local preview,
// a self-host without a Blob store), it just says so, your best is kept locally.
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
   *  /api/score, important offline (and so a 404 in local preview / CI isn't logged
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
  // Which time-boxed board to show (full-board view only). 'all' keeps the current
  // first paint; switching re-fetches entries + `you` for that UTC calendar window.
  const [win, setWin] = useState<LeaderWindow>('all');

  useEffect(() => {
    if (!loadBoard) return;
    let live = true;
    // Pass the local best so the board comes back with THIS player's window, not just the
    // top-N — the motivate-the-90% view (a player far down still sees their standing).
    fetchLeaderboard(rows, score, win).then((b) => {
      if (!live) return;
      setEntries(b ? b.entries : null);
      setYou(b?.you ?? null);
    });
    return () => {
      live = false;
    };
  }, [rows, loadBoard, score, win]);

  const canSubmit = score > 0 && cleanInitials(initials).length === 3 && status !== 'submitting';
  // A real submit landed this session → the player's own row is now on the board, so the
  // "you" strip should dedup it against the synthetic YOU row. Before that (the preview
  // GET path) it must NOT dedup, or typed initials could hide a real, unrelated neighbor.
  const submitted = status === 'ranked' || status === 'unranked';

  const onSubmit = async () => {
    if (!canSubmit) return;
    setStatus('submitting');
    const r = await submitScore(initials, score);
    if (r.ok) {
      setRank(r.rank);
      setStatus(r.ranked ? 'ranked' : 'unranked');
      if (r.you) setYou(r.you);
      if (loadBoard) {
        // The POST returns the ALL-TIME board; re-fetch the ACTIVE tab so the list + `you`
        // match the selected window (a fresh submit counts toward Today / This Week too).
        fetchLeaderboard(rows, score, win).then((b) => {
          setEntries(b ? b.entries : null);
          if (b?.you) setYou(b.you);
        });
      } else if (r.entries && r.entries.length) {
        setEntries(r.entries.slice(0, rows));
      }
    } else {
      // Initials problem vs backend down, show the right thing, not "bad initials"
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
        <p className="hud-board__msg">Couldn&rsquo;t reach the board, your best is saved here.</p>
      )}
      {status === 'badletters' && (
        <p className="hud-board__msg">
          Those initials didn&rsquo;t take, try three (different) letters.
        </p>
      )}

      {loadBoard && (
        <div className="hud-board__tabs" role="tablist" aria-label="leaderboard time range">
          {WINDOW_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={win === t.key}
              className={`hud-board__tab${win === t.key ? ' hud-board__tab--on' : ''}`}
              onClick={() => setWin(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>
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
            {buildYouRows(you, score, cleanInitials(initials), submitted).map((r, i) => (
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
          <p className="hud-board__msg">No scores yet, be the first.</p>
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
