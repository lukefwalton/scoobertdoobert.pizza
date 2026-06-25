import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { exposeTestGlobal } from './testHooks';
import { rollArcadeGame, ARCADE_GAMES } from '../data/arcadeGames';

// Fire up a cabinet: roll a random game and open its in-world modal. Shared by the
// cabinet's CLICK and the world's E action so both paths roll + announce the same
// way. The roll is the whole point — a tiny slot-pull that makes a cabinet feel
// alive (you never know which game you'll get). Mirrors the TV's openTv path.
export function launchRandomArcade() {
  const g = rollArcadeGame();
  useSceneStore.getState().openArcade(g.id);
  announce(`🎲 ${g.title}`, 'luck');
  // For the smoke: which game this pull rolled, plus the full set of valid ids so
  // shoot:cabinet validates against the LIVE registry (never a stale allowlist).
  // Both gated to test entrances (exposeTestGlobal checks isTestEntrance).
  exposeTestGlobal('__sdpArcade', g.id);
  exposeTestGlobal(
    '__sdpArcadeIds',
    ARCADE_GAMES.map((a) => a.id),
  );
}
