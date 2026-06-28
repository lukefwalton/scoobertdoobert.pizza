import { useRaceStore, RACE_LAPS, lapOf } from '../state/raceStore';

// ───────────────────────────────────────────────────────────────────────────
// RaceHud — the DOM overlay for the Grassrooms ghost race (ゴーストレース):
// the 3·2·1·GO countdown, a live LAP + standing readout while racing, and the
// sweet win/lose card. Reads raceStore (the in-canvas GhostRace drives it).
// Renders nothing when idle, so it's free off the race. WCAG-safe: the countdown
// is a scale-pop per number (keyed remount), never a flash/strobe.
// ───────────────────────────────────────────────────────────────────────────
export function RaceHud({ hidden }: { hidden?: boolean }) {
  const phase = useRaceStore((s) => s.phase);
  const countdown = useRaceStore((s) => s.countdown);
  const playerProgress = useRaceStore((s) => s.playerProgress);
  const ghostProgress = useRaceStore((s) => s.ghostProgress);

  // Gate it like the other HUDs (ScoreHud/ObjectiveHud): off under the pause menu
  // / a room wipe / a dialog / a modal overlay, so it never sits over a menu.
  if (hidden || phase === 'idle') return null;

  if (phase === 'countdown') {
    return (
      <div className="hud-race" aria-hidden="true">
        <div className="hud-race__count" key={countdown}>
          {countdown > 0 ? countdown : 'GO!'}
        </div>
      </div>
    );
  }

  if (phase === 'won' || phase === 'lost') {
    const won = phase === 'won';
    return (
      <div className="hud-race" role="status">
        <div className={`hud-race__card hud-race__card--${won ? 'win' : 'lose'}`}>
          <p className="hud-race__title">{won ? 'YOU WIN! しょうり！' : 'BOO! まけた'}</p>
          <p className="hud-race__sub">
            {won
              ? 'the ghost twirls a victory lap for you · +3 luck'
              : 'the ghost giggles — no harm done. rematch? もういっかい？'}
          </p>
        </div>
      </div>
    );
  }

  // racing
  const ahead = playerProgress >= ghostProgress;
  return (
    <div className="hud-race hud-race--live" aria-hidden="true">
      <div className="hud-race__lap">
        LAP {lapOf(playerProgress)}/{RACE_LAPS}
      </div>
      <div className={`hud-race__place hud-race__place--${ahead ? 'lead' : 'behind'}`}>
        {ahead ? '🏁 1st — hold SHIFT!' : '👻 2nd — hold SHIFT!'}
      </div>
    </div>
  );
}
