// ───────────────────────────────────────────────────────────────────────────
// src/data/floors.ts — the descent, as data.
//
// You descend through floors; going DOWN is going FORWARD in web time. Each
// floor is a real, usable links page styled as a later era than the one above
// it, terminating at the SGI-style machine room that "renders" the 3D world.
//
// Adding a floor later = add a FLOORS entry (and, if its look is new, one
// template component in src/floors/). Never special-case a floor in scene code.
// Mirrors the links.ts / hotspots.ts single-source pattern.
// ───────────────────────────────────────────────────────────────────────────
import { MENU_DESTINATIONS } from './links';

export type FloorTemplate = 'plain' | 'starburst' | 'tableLayout' | 'machineRoom';

export type Floor = {
  /** Stable id, e.g. 'y1999'. */
  id: string;
  /** Display label for the era, e.g. '1999'. */
  era: string;
  /** Which reusable template renders this floor. */
  template: FloorTemplate;
  title: string;
  /** Era-voiced hero blurb (optional; some templates bake their own copy). */
  copy?: string;
  /** Dest ids from links.ts — every floor surfaces real, crawlable links. */
  links: string[];
  /** Era-appropriate "go deeper" affordance text. */
  descendLabel: string;
};

// Ordered top → bottom (floor 0 is the front door; the descent goes forward in
// time as it goes down). The 1999 / 2000 / machine-room floors land in later
// Phase 2 checkpoints — the system is built so they're just entries here.
export const FLOORS: Floor[] = [
  {
    id: 'storefront',
    era: '1996',
    template: 'plain',
    title: 'Scoobert Doobert’s Electronic Pizza Storefront',
    copy: 'A pizza shop off the coast of San Diego. (It is actually a solo music project by a philosopher.)',
    links: MENU_DESTINATIONS.map((d) => d.id),
    descendLabel: 'Continue ▶',
  },
];

export const FLOOR_COUNT = FLOORS.length;
export const BOTTOM_FLOOR = FLOORS.length - 1;
