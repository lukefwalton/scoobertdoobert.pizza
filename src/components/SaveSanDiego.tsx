import { useState } from 'react';

// ───────────────────────────────────────────────────────────────────────────
// SaveSanDiego — the cabinet that plays "1101 (Save San Diego)," Scoobert's real
// Twine/Harlowe interactive-fiction quest (it ships as public/1101.html; the
// hidden terminal `1101` egg opens the same file). This surfaces it as a proper
// arcade cabinet — an in-world one (rolled by ArcadeModal) AND a standalone
// /save-san-diego route (ArcadeCabinetPage), so the deepest ARG payoff finally
// has a front door in the arcade instead of only the command line.
//
// The Twine story fires a name `prompt()` the instant it loads, so we gate it
// behind a real PRESS-START button: the iframe (and its prompt) only mount on
// click. Unlike the canvas cabinets there's no score — it's a story, so the HUD
// reads QUEST, not SCORE. It's Luke's own content (© Scoobert Doobert), already
// a shipped asset, so no new provenance burden.
// ───────────────────────────────────────────────────────────────────────────
export function SaveSanDiego() {
  const [started, setStarted] = useState(false);
  return (
    <div className="arcade-screen">
      <div className="arcade-hud">
        <span>QUEST</span>
        <span>SAVE SAN DIEGO</span>
        <span>◈</span>
      </div>
      <div className="arcade-stage arcade-stage--tall">
        {started ? (
          <iframe className="arcade-iframe" src="/1101.html" title="1101 (Save San Diego)" />
        ) : (
          <button
            type="button"
            className="arcade-overlay arcade-start"
            onClick={() => setStarted(true)}
          >
            <span className="arcade-title">1101</span>
            <span className="arcade-sub">a warlock is making the burritos disappear</span>
            <span className="arcade-blink">▸ PRESS START</span>
          </button>
        )}
      </div>
    </div>
  );
}
