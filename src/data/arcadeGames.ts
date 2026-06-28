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
  | 'jazz-snake'
  | 'pizza-radar'
  | 'burrito-belt'
  // A SPECIAL, non-cabinet game: the Grassrooms' ghost kart battle. It uses the
  // same `arcadeGame` modal grammar but is fought at a parked kart in the world,
  // so it's deliberately OUT of ARCADE_GAMES — never in the random cabinet roll,
  // and it needs no standalone /route (see SPECIAL_TITLES).
  | 'ghost-kart';

// `slug` is the cabinet's standalone route (no leading slash). It's the id for
// every cabinet EXCEPT pizza-run, whose route predates the id and lives at
// /arcade. Carrying it here lets the cross-link shelf + a route-parity test
// derive from this one registry instead of re-listing the cabinets by hand.
export type ArcadeGame = { id: ArcadeGameId; title: string; slug: string };

// Order is just display order; the roll is uniform across all of them.
export const ARCADE_GAMES: readonly ArcadeGame[] = [
  { id: 'pizza-run', title: 'PIZZA RUN', slug: 'arcade' },
  { id: 'crusteroids', title: 'CRUSTEROIDS', slug: 'crusteroids' },
  { id: 'slice-breaker', title: 'SLICE BREAKER', slug: 'slice-breaker' },
  { id: 'jazz-snake', title: 'JAZZ SNAKE', slug: 'jazz-snake' },
  { id: 'pizza-radar', title: 'PIZZA RADAR 1996', slug: 'pizza-radar' },
  { id: 'burrito-belt', title: 'BURRITO BELT', slug: 'burrito-belt' },
  { id: 'poke', title: 'POKE SCOOBERT', slug: 'poke' },
  { id: 'chimes', title: 'PENDULUM CHIMES', slug: 'chimes' },
  { id: 'cultures', title: 'CULTURES', slug: 'cultures' },
];

/** Roll a random cabinet game — the "what'll it be this time" surprise. */
export const rollArcadeGame = (): ArcadeGame =>
  ARCADE_GAMES[Math.floor(Math.random() * ARCADE_GAMES.length)];

// Titles for the SPECIAL (non-cabinet) games — the ones that ride the arcade
// modal but aren't in the roll/route registry above.
const SPECIAL_TITLES: Partial<Record<ArcadeGameId, string>> = {
  'ghost-kart': 'GHOST GRAND PRIX',
};

/** The display title for a game id (for the modal chrome / announce). */
export const arcadeGameTitle = (id: ArcadeGameId): string =>
  ARCADE_GAMES.find((g) => g.id === id)?.title ?? SPECIAL_TITLES[id] ?? 'ARCADE';
