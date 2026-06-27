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

export type ItemKind = 'key' | 'trinket' | 'tome';

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
  /** CASSETTE TAPES (trinkets): the jukebox catalog slug this tape carries. When
   *  you pocket it, that track plays (the musical reward — "exploration's reward
   *  is sound") and the radio unlocks. Undefined for non-tape items. */
  track?: string;
  /** TOMES (scrolls): the spell id this item TEACHES (spells.ts). Pocketing it
   *  learns the spell — how you EARN your magic. Undefined for non-tome items. */
  teachesSpell?: string;
};

export const ITEMS: Item[] = [
  {
    id: 'pool-locker-key',
    kind: 'key',
    label: 'Rusted Locker Key',
    blurb: 'Stamped “DEEP END · STAFF ONLY.” Still smells faintly of chlorine.',
    glyph: '🔑',
  },
  {
    id: 'hall-closet-key',
    kind: 'key',
    label: 'Brass Closet Key',
    blurb: 'A stubby brass key on a bottle-cap fob. Tagged “SUPPLY” in marker.',
    glyph: '🗝️',
  },
  // ── Cassette tapes — the music ladder. Hidden in the sweeter rooms; pocket one
  // and its track plays. Collect all four to finish the "lost cassettes" quest.
  {
    id: 'tape-mystery-machine',
    kind: 'trinket',
    label: 'Tape: “Mystery Machine”',
    blurb: 'A scuffed cassette, “MYSTERY MACHINE” in ballpoint. Side A only.',
    glyph: '📼',
    track: 'mystery-machine',
  },
  {
    id: 'tape-moonlight',
    kind: 'trinket',
    label: 'Tape: “Dancing in the Moonlight”',
    blurb: 'Hand-labeled, the ink half worn off. Smells like a glovebox.',
    glyph: '📼',
    track: 'dancing-in-the-moonlight',
  },
  {
    id: 'tape-japan',
    kind: 'trinket',
    label: 'Tape: “Gonna Go To Japan”',
    blurb: 'A clear-shell cassette with a doodle of a bullet train on it.',
    glyph: '📼',
    track: 'gonna-go-to-japan',
  },
  {
    id: 'tape-internet',
    kind: 'trinket',
    label: 'Tape: “All My Friends Live On The Internet”',
    blurb: 'Dubbed twice over; you can almost hear the tape hiss already.',
    glyph: '📼',
    track: 'all-my-friends-live-on-the-internet',
  },
  // ── Master tapes — the unreleased demos in the studio's Tape Vault. Pocket one
  // and the master plays (the music ladder's "find it = hear it"); they extend the
  // lost-cassettes collectathon to the basement sessions.
  {
    id: 'tape-information',
    kind: 'trinket',
    label: 'Master: “Information”',
    blurb: 'A reel-to-reel box, “INFORMATION — MASTER” in grease pencil. Heavy.',
    glyph: '📼',
    track: 'information',
  },
  {
    id: 'tape-1101',
    kind: 'trinket',
    label: 'Master: “1101”',
    blurb: 'A cassette labeled only 1101. Seven-bit ASCII, sung — it decodes to a URL.',
    glyph: '📼',
    track: '1101',
  },
  {
    id: 'tape-jolly-roger-bay',
    kind: 'trinket',
    label: 'Master: “Jolly Roger Bay”',
    blurb: 'A water-warped shell with a doodled pirate flag. Side B is just tape hiss.',
    glyph: '📼',
    track: 'jolly-roger-bay',
  },
  // ── Tomes — the spell scrolls (the RPG layer's magic, earned by finding them).
  {
    id: 'fireball-scroll',
    kind: 'tome',
    label: 'Scroll of Fireball',
    blurb:
      'A singed lyric sheet, the chorus scorched out. The margin note just reads “🔥 press F”.',
    glyph: '📜',
    teachesSpell: 'fireball',
  },
  {
    id: 'light-scroll',
    kind: 'tome',
    label: 'Scroll of Light',
    blurb:
      'A water-stained index card from the file room. In faint pencil: “for the dark parts. press L”.',
    glyph: '📜',
    teachesSpell: 'light',
  },
];

/** The cassette-tape item ids, in find order — the "lost cassettes" collectathon. */
export const CASSETTE_IDS = ITEMS.filter((i) => i.track).map((i) => i.id);

const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

export function itemById(id: string): Item | undefined {
  return BY_ID.get(id);
}
