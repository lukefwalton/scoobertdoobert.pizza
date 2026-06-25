import { type ComponentType } from 'react';
import '../styles/arcade.css';
import '../styles/poke.css';
import '../styles/chimes.css';
import '../styles/cultures.css';
import { RunnerGame } from './RunnerGame';
import { FaceStretch } from './FaceStretch';
import { ChimesCabinet } from './ChimesCabinet';
import { CulturesCabinet } from './CulturesCabinet';
import { type ArcadeGameId, arcadeGameTitle } from '../data/arcadeGames';

// ───────────────────────────────────────────────────────────────────────────
// ArcadeModal — the far side of an in-world cabinet: the real, already-shipped
// minigame, rendered in a 98.css window (the same modal chrome the album TVs use).
// WHICH game is a random ROLL made when you fire the cabinet up (launchRandomArcade),
// so a cabinet is never the same twice. The 2D /routes keep their own copies for
// mobile; this just surfaces them inside the world. Esc / the ✕ closes it
// (WorldHud), which unmounts the game (its own listeners + audio tear down).
// ───────────────────────────────────────────────────────────────────────────
const GAME: Record<ArcadeGameId, ComponentType> = {
  'pizza-run': RunnerGame,
  poke: FaceStretch,
  chimes: ChimesCabinet,
  cultures: CulturesCabinet,
};

export function ArcadeModal({ id, onClose }: { id: ArcadeGameId; onClose: () => void }) {
  const Game = GAME[id];
  const title = arcadeGameTitle(id);
  return (
    <div className="hud-dialog window hud-dialog--arcade" role="dialog" aria-label={title}>
      <div className="title-bar">
        <div className="title-bar-text">🎲 {title}</div>
        <div className="title-bar-controls">
          <button aria-label="Close" onClick={onClose} />
        </div>
      </div>
      <div className="window-body hud-arcade-body">
        <Game />
      </div>
    </div>
  );
}
