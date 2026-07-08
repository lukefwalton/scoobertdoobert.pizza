import { describe, it, expect } from 'vitest';
import { ARCADE_GAMES, rollArcadeGame, arcadeGameTitle, type ArcadeGameId } from './arcadeGames';

describe('arcade game registry', () => {
  it('lists every cabinet with a unique id and a title', () => {
    const ids = ARCADE_GAMES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length); // no dupes
    for (const g of ARCADE_GAMES) expect(g.title.length).toBeGreaterThan(0);
  });

  it('includes the three new reskins', () => {
    const ids = new Set(ARCADE_GAMES.map((g) => g.id));
    for (const id of ['crusteroids', 'slice-breaker', 'jazz-snake'] as ArcadeGameId[]) {
      expect(ids.has(id), `missing cabinet "${id}"`).toBe(true);
    }
  });

  it('rolls a real registered game every time', () => {
    const ids = new Set(ARCADE_GAMES.map((g) => g.id));
    for (let i = 0; i < 200; i++) expect(ids.has(rollArcadeGame().id)).toBe(true);
  });

  it('never rolls a non-rollable cabinet (the Pizza Cam is entered on purpose)', () => {
    const banned = new Set(ARCADE_GAMES.filter((g) => g.rollable === false).map((g) => g.id));
    expect(banned.has('booth')).toBe(true); // the flag is actually set
    for (let i = 0; i < 500; i++) expect(banned.has(rollArcadeGame().id)).toBe(false);
  });

  it('arcadeGameTitle resolves a known id and falls back for an unknown one', () => {
    expect(arcadeGameTitle('jazz-snake')).toBe('JAZZ SNAKE');
    expect(arcadeGameTitle('nope' as ArcadeGameId)).toBe('ARCADE');
  });
});
