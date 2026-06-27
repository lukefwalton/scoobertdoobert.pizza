import { useScoreStore, MAX_TALLNESS } from '../state/scoreStore';

// The arcade SCORE readout — top-right, out of the way. PIZZA POINTS this run, a
// live COMBO meter while a streak is going, and a "how tall the snacks made you"
// pip. Hidden during pause / room wipes (the pause menu shows the totals there).
export function ScoreHud({ hidden }: { hidden?: boolean }) {
  const score = useScoreStore((s) => s.score);
  const combo = useScoreStore((s) => s.combo);
  const tallness = useScoreStore((s) => s.tallness);
  if (hidden) return null;
  const heightPct = Math.round((tallness / MAX_TALLNESS) * 100);
  return (
    <div className="hud-score" aria-hidden="true">
      <div className="hud-score__pts">🍕 {score.toLocaleString()}</div>
      {/* key={combo} remounts the chip each increment so it re-pops (a scale, not a
          flash — WCAG-safe; disabled under reduced motion). */}
      {combo > 1 && (
        <div className="hud-score__combo" key={combo}>
          COMBO ×{combo}
        </div>
      )}
      {tallness > 0.02 && <div className="hud-score__tall">📏 {heightPct}% tall</div>}
    </div>
  );
}
