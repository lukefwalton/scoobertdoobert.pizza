import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { exposeTestGlobal } from './testHooks';
import {
  rollArcadeGame,
  arcadeGameTitle,
  ARCADE_GAMES,
  type ArcadeGameId,
} from '../data/arcadeGames';

// Open a game's in-world modal + announce it, and publish the test hooks: which
// game opened, plus the full set of valid ids so shoot:cabinet validates against
// the LIVE registry (never a stale allowlist). Both gated to test entrances
// (exposeTestGlobal checks isTestEntrance). Shared by the dedicated + mystery paths.
function openArcadeGame(id: ArcadeGameId, toast: string) {
  useSceneStore.getState().openArcade(id);
  announce(toast, 'luck');
  exposeTestGlobal('__sdpArcade', id);
  exposeTestGlobal(
    '__sdpArcadeIds',
    ARCADE_GAMES.map((a) => a.id),
  );
}

/** Launch a SPECIFIC game — a dedicated cabinet (each machine IS one game, its
 *  marquee = what it plays). Shared by the cabinet's CLICK and the world's E action. */
export function launchArcadeGame(id: ArcadeGameId) {
  openArcadeGame(id, `🕹️ ${arcadeGameTitle(id)}`);
}

/** Fire up the MYSTERY cabinet: roll a random game — a tiny slot-pull that keeps a
 *  cabinet feeling alive (you never know which game you'll get; rhymes with the
 *  site's d20/luck chaos). Shared by that cabinet's CLICK and the E action. */
export function launchRandomArcade() {
  const g = rollArcadeGame();
  openArcadeGame(g.id, `🎲 ${g.title}`);
}
