// ───────────────────────────────────────────────────────────────────────────
// src/data/arcadeGames.ts — the in-world cabinets are SLOT MACHINES of games.
//
// Firing up a cabinet rolls a random title, so it feels alive — you never know
// what you'll get — and it rhymes with the site's d20/luck chaos. Each id maps to
// a real, already-shipped minigame component (rendered by ArcadeModal); the 2D
// /routes keep their own copies for mobile. Three-free so the cabinet + store can
// import it.
// ───────────────────────────────────────────────────────────────────────────
export type ArcadeGameId =
  | 'pizza-run'
  | 'poke'
  | 'chimes'
  | 'cultures'
  | 'crusteroids'
  | 'slice-breaker'
  | 'jazz-snake';

export type ArcadeGame = { id: ArcadeGameId; title: string };

// Order is just display order; the roll is uniform across all of them.
export const ARCADE_GAMES: readonly ArcadeGame[] = [
  { id: 'pizza-run', title: 'PIZZA RUN' },
  { id: 'crusteroids', title: 'CRUSTEROIDS' },
  { id: 'slice-breaker', title: 'SLICE BREAKER' },
  { id: 'jazz-snake', title: 'JAZZ SNAKE' },
  { id: 'poke', title: 'POKE SCOOBERT' },
  { id: 'chimes', title: 'PENDULUM CHIMES' },
  { id: 'cultures', title: 'CULTURES' },
];

/** Roll a random cabinet game — the "what'll it be this time" surprise. */
export const rollArcadeGame = (): ArcadeGame =>
  ARCADE_GAMES[Math.floor(Math.random() * ARCADE_GAMES.length)];

/** The display title for a game id (for the modal chrome / announce). */
export const arcadeGameTitle = (id: ArcadeGameId): string =>
  ARCADE_GAMES.find((g) => g.id === id)?.title ?? 'ARCADE';
