import { describe, it, expect, beforeEach } from 'vitest';
import { launchArcadeGame, launchRandomArcade } from './arcade';
import { useSceneStore } from '../state/sceneStore';
import { ARCADE_GAMES } from '../data/arcadeGames';

// The two cabinet launch paths: a DEDICATED cabinet opens its one fixed game, the
// MYSTERY cabinet rolls a random one. The in-world dedicated flow is smoke-covered
// (shoot:cabinet drives the Boardwalk → Crusteroids via E); this pins the pure
// dispatch for BOTH paths deterministically (the roll can't be reliably smoked).

beforeEach(() => {
  useSceneStore.setState({ arcadeGame: null });
});

describe('arcade launch dispatch', () => {
  it('launchArcadeGame opens the SPECIFIC game (a dedicated cabinet)', () => {
    launchArcadeGame('order-up');
    expect(useSceneStore.getState().arcadeGame).toBe('order-up');
    launchArcadeGame('crusteroids');
    expect(useSceneStore.getState().arcadeGame).toBe('crusteroids');
  });

  it('launchRandomArcade always opens SOME valid registry game (the mystery roll)', () => {
    const ids = ARCADE_GAMES.map((g) => g.id);
    for (let i = 0; i < 40; i++) {
      useSceneStore.setState({ arcadeGame: null });
      launchRandomArcade();
      expect(ids).toContain(useSceneStore.getState().arcadeGame);
    }
  });
});
