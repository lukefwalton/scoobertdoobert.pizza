// ───────────────────────────────────────────────────────────────────────────
// src/data/items.ts — the inventory catalog (three-free, like links.ts/rooms.ts).
//
// An item is just data: an id, what it IS (a key or a trinket), and how it reads
// in the pause-menu "Pockets" list. WHICH items you're holding lives in the
// durable progressStore (itemsHeld); this file is what each id MEANS.
//
// The lock→key mapping lives on the DOOR (rooms.ts RoomDoor.requiresKey), not on
// the item, so the door stays the single source of what it needs — exactly like
// it already owns `to`/`toSpawn`/`revealSecret`.
//
// FRICTION-BUDGET RULE (docs/DESIGN.md): keys may only ever gate SECRET / SIDE
// doors, never the main descent, and a key must be findable in the same room or
// the one before its lock. The dev guard in rooms.ts enforces the descent half.
// ───────────────────────────────────────────────────────────────────────────

export type ItemKind = 'key' | 'trinket';

export type Item = {
  /** Stable id — persisted in progressStore.itemsHeld and referenced by a
   *  RoomDoor.requiresKey / a Room.pickups entry. */
  id: string;
  kind: ItemKind;
  /** Pause-menu label (sweet, period-storefront voice). */
  label: string;
  /** One-line flavor, shown as the row's tooltip. */
  blurb: string;
  /** A single emoji/glyph for the pause-menu row (no art asset needed). */
  glyph: string;
};

export const ITEMS: Item[] = [
  {
    id: 'pool-locker-key',
    kind: 'key',
    label: 'Rusted Locker Key',
    blurb: 'Stamped “DEEP END · STAFF ONLY.” Still smells faintly of chlorine.',
    glyph: '🔑',
  },
];

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function itemById(id: string): Item | undefined {
  return BY_ID.get(id);
}
