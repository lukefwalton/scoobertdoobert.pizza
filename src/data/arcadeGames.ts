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
  | 'delivery-dash'
  | 'order-up'
  | 'save-san-diego'
  | 'booth';

// `slug` is the cabinet's standalone route (no leading slash). It's the id for
// every cabinet EXCEPT pizza-run, whose route predates the id and lives at
// /arcade. Carrying it here lets the cross-link shelf + a route-parity test
// derive from this one registry instead of re-listing the cabinets by hand.
// `rollable: false` keeps a cabinet OUT of the slot-machine roll while it
// stays on the shelf/routes — the Pizza Cam is a camera-consent instrument,
// so it's only ever entered deliberately, never dealt as a surprise.
export type ArcadeGame = { id: ArcadeGameId; title: string; slug: string; rollable?: boolean };

// Order is just display order; the roll is uniform across all of them.
export const ARCADE_GAMES: readonly ArcadeGame[] = [
  { id: 'pizza-run', title: 'PIZZA RUN', slug: 'arcade' },
  { id: 'crusteroids', title: 'CRUSTEROIDS', slug: 'crusteroids' },
  { id: 'slice-breaker', title: 'SLICE BREAKER', slug: 'slice-breaker' },
  { id: 'jazz-snake', title: 'JAZZ SNAKE', slug: 'jazz-snake' },
  { id: 'pizza-radar', title: 'PIZZA RADAR 1996', slug: 'pizza-radar' },
  { id: 'burrito-belt', title: 'BURRITO BELT', slug: 'burrito-belt' },
  { id: 'delivery-dash', title: 'DELIVERY DASH', slug: 'delivery-dash' },
  { id: 'order-up', title: 'ORDER UP', slug: 'order-up' },
  { id: 'save-san-diego', title: 'SAVE SAN DIEGO', slug: 'save-san-diego' },
  { id: 'poke', title: 'POKE SCOOBERT', slug: 'poke' },
  { id: 'chimes', title: 'PENDULUM CHIMES', slug: 'chimes' },
  { id: 'cultures', title: 'CULTURES', slug: 'cultures' },
  { id: 'booth', title: 'PIZZA CAM', slug: 'booth', rollable: false },
];

const ROLLABLE = ARCADE_GAMES.filter((g) => g.rollable !== false);

/** Roll a random cabinet game — the "what'll it be this time" surprise.
 *  Non-rollable cabinets (the Pizza Cam) never come up here. */
export const rollArcadeGame = (): ArcadeGame =>
  ROLLABLE[Math.floor(Math.random() * ROLLABLE.length)];

/** The display title for a game id (for the modal chrome / announce). */
export const arcadeGameTitle = (id: ArcadeGameId): string =>
  ARCADE_GAMES.find((g) => g.id === id)?.title ?? 'ARCADE';
