import { useScoreStore, MAX_TALLNESS } from '../state/scoreStore';

// The arcade SCORE readout — top-right, out of the way. PIZZA POINTS this run, a
// live COMBO meter while a streak is going, and a "how tall the snacks made you"
// pip. Hidden during pause / room wipes (the pause menu shows the totals there).
export function ScoreHud({ hidden }: { hidden?: boolean }) {
  const score = useScoreStore((s) => s.score);
  const combo = useScoreStore((s) => s.combo);
  // Select the ROUNDED percent, not the raw height: tallness now decays a hair
  // every frame (it wears off), so subscribing to the raw value would re-render
  // this HUD 60×/sec. Bucketing to an integer % re-renders only on a real step.
  const heightPct = useScoreStore((s) =>
    Math.round((Math.min(s.tallness, MAX_TALLNESS) / MAX_TALLNESS) * 100),
  );
  if (hidden) return null;
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
      {heightPct > 1 && <div className="hud-score__tall">📏 {heightPct}% tall</div>}
    </div>
  );
}
