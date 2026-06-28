import { useEffect, useState } from 'react';
import '../styles/leaderboard.css';
import {
  fetchLeaderboard,
  submitScore,
  sanitizeInitials,
  type ScoreEntry,
} from '../lib/leaderboard';

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
  const [status, setStatus] = useState<'idle' | 'submitting' | 'ok' | 'err' | 'offline'>('idle');
  const [rank, setRank] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!loadBoard) return;
    let live = true;
    fetchLeaderboard(rows).then((e) => {
      if (live) setEntries(e);
    });
    return () => {
      live = false;
    };
  }, [rows, loadBoard]);

  const canSubmit = score > 0 && sanitizeInitials(initials).length === 3 && status !== 'submitting';

  const onSubmit = async () => {
    if (!canSubmit) return;
    setStatus('submitting');
    const r = await submitScore(initials, score);
    if (r.ok) {
      setStatus('ok');
      setRank(r.rank);
      if (r.entries && r.entries.length) setEntries(r.entries.slice(0, rows));
      else fetchLeaderboard(rows).then(setEntries);
    } else {
      setStatus(r.reason === 'offline' ? 'offline' : 'err');
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
              onChange={(e) => setInitials(sanitizeInitials(e.target.value))}
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

      {status === 'ok' && (
        <p className="hud-board__msg hud-board__msg--ok">
          {rank ? `You're #${rank} on the board!` : 'You made the board!'}
        </p>
      )}
      {status === 'offline' && (
        <p className="hud-board__msg">Couldn&rsquo;t reach the board — your best is saved here.</p>
      )}
      {status === 'err' && <p className="hud-board__msg">Those initials didn&rsquo;t take — try three letters.</p>}

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
