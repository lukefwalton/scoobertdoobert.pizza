import { ARCADE_GAMES } from '../data/arcadeGames';

// ───────────────────────────────────────────────────────────────────────────
// CabinetShelf — the "More cabinets:" cross-link row shared by every cabinet
// page (/arcade, /poke, /chimes, /cultures, and the ArcadeCabinetPage routes).
// DERIVED from the one registry (arcadeGames.ts) so a new cabinet shows up
// everywhere automatically and the list can never drift out of sync. (It had:
// the older standalone pages each hardcoded a partial list and had silently
// fallen behind, dropping real links to shipped cabinets.)
//
// Renders the inline content only — each page wraps it in its own period
// <p className="…-foot"> so the per-page styling is untouched.
// ───────────────────────────────────────────────────────────────────────────
export function CabinetShelf({ currentSlug }: { currentSlug: string }) {
  const others = ARCADE_GAMES.filter((g) => g.slug !== currentSlug);
  return (
    <>
      &#9654; More cabinets:{' '}
      {others.map((g, i) => (
        <span key={g.slug}>
          {i > 0 ? ' · ' : ''}
          <a href={`/${g.slug}`}>{g.title}</a>
        </span>
      ))}
    </>
  );
}
