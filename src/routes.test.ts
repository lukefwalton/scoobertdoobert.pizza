import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { ARCADE_GAMES } from './data/arcadeGames';

// The arcade cabinet set lives in several parallel lists. Two of them can't drift:
// ArcadeModal's `Record<ArcadeGameId, ComponentType>` is tsc-exhaustive, and the
// cross-link shelf in ArcadeCabinetPage is DERIVED from ARCADE_GAMES. The one that
// stays hand-maintained is routes.tsx — it has to pair each cabinet with its real
// page component, which TypeScript can't make exhaustive for us. So pin it by
// source-parity: every registered cabinet must have a matching standalone route,
// so adding one to the registry without wiring a /route fails HERE instead of
// 404-ing in production (the omission the review flagged as "easy to miss").
//
// Source-text (not an import) because the unit suite runs in node — importing the
// route table would drag in the whole browser-only page/component tree.
const routesSrc = readFileSync(new URL('./routes.tsx', import.meta.url), 'utf8');

describe('arcade route parity — routes.tsx covers every registered cabinet', () => {
  for (const g of ARCADE_GAMES) {
    it(`registers a standalone route for "${g.id}" at /${g.slug}`, () => {
      // The closing quote in the match guards against a slug matching a longer
      // path as a prefix (e.g. '/slice' inside '/slice-breaker').
      expect(routesSrc).toContain(`path: '/${g.slug}'`);
    });
  }

  it('every cabinet slug is unique', () => {
    const slugs = ARCADE_GAMES.map((g) => g.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('slug equals id for every cabinet except pizza-run (it predates the /arcade route)', () => {
    for (const g of ARCADE_GAMES) {
      if (g.id === 'pizza-run') expect(g.slug).toBe('arcade');
      else expect(g.slug).toBe(g.id);
    }
  });
});
