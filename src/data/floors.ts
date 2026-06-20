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
import { MENU_DESTINATIONS, destById } from './links';

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
const ALL_MENU = MENU_DESTINATIONS.map((d) => d.id);

export const FLOORS: Floor[] = [
  {
    id: 'storefront',
    era: '1996',
    template: 'plain',
    title: 'Scoobert Doobert’s Electronic Pizza Storefront',
    copy: 'A pizza shop off the coast of San Diego. (It is actually a solo music project by a philosopher.)',
    links: ALL_MENU,
    descendLabel: 'Down to the basement',
  },
  {
    id: 'y1999',
    era: '1999',
    template: 'starburst',
    title: 'Scoobert Doobert ONLINE!!',
    copy: 'Now serving six unreleased demos under one roof. Best viewed in Netscape.',
    links: ALL_MENU,
    descendLabel: 'THE NEXT STEP ▶',
  },
  {
    id: 'y2000',
    era: '2000',
    template: 'tableLayout',
    title: 'Scoobert Doobert :: Welcome',
    copy: 'Please select your party.',
    links: ALL_MENU,
    descendLabel: 'Down to the freezer ▾',
  },
  {
    id: 'machine',
    era: 'SGI',
    template: 'machineRoom',
    title: 'SILICON SLICE™',
    copy: 'see what’s possible',
    links: ALL_MENU,
    descendLabel: 'Install ▶',
  },
];

export const FLOOR_COUNT = FLOORS.length;
export const BOTTOM_FLOOR = FLOORS.length - 1;

// Dev guardrail: every floor's link ids must resolve, or the nav silently
// shrinks (resolveLinks drops unknown ids). Fail loudly in development so a
// FLOORS typo surfaces at the source instead of as a missing nav item.
if (import.meta.env?.DEV) {
  for (const f of FLOORS) {
    for (const id of f.links) {
      if (!destById(id)) {
        console.warn(`[floors] FLOORS["${f.id}"] references unknown link id "${id}"`);
      }
    }
  }
}
