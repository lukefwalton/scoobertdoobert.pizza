// ───────────────────────────────────────────────────────────────────────────
// src/data/items.ts — the inventory catalog (three-free, like links.ts/rooms.ts).
//
// An item is just data: an id, what it IS (a cassette or a scroll), and how it
// reads in the pause-menu "Pockets" list. WHICH items you're holding lives in the
// durable progressStore (itemsHeld); this file is what each id MEANS.
//
// (2026-10, complexity cut: the two KEY items + their locked side doors were
// removed — "interact → the way opens" is the one progression grammar now. An old
// save may still hold a key id in itemsHeld; itemById returns undefined for it and
// the Pockets list skips it.)
// ───────────────────────────────────────────────────────────────────────────

export type ItemKind = 'trinket' | 'tome';

export type Item = {
  /** Stable id, persisted in progressStore.itemsHeld and referenced by a
   *  Room.pickups entry. */
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
  /** ESCAPE-ROOM reveal: pocketing this item banks a DURABLE secret (findSecret),
   *  which reveals a door with a matching `revealSecret` — "pick something up →
   *  the way opens." Durable (you found it, it stays found). Used by the "1101"
   *  master reel → the Save San Diego level door. */
  revealsSecret?: string;
  /** MASTER tapes: holding the studio master IS the restoration — its `track`
   *  counts as restored (plays hi-fi) the moment it's pocketed, no bench rite
   *  needed. Derived in data/restoration.ts off itemsHeld, so it's retroactive
   *  for saves that already hold a master. Only meaningful with `track` set. */
  master?: true;
};

export const ITEMS: Item[] = [
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
    blurb: 'A reel-to-reel box, “INFORMATION: MASTER” in grease pencil. Heavy.',
    glyph: '📼',
    track: 'information',
    master: true,
  },
  {
    id: 'tape-1101',
    kind: 'trinket',
    label: 'Master: “1101”',
    blurb: 'A cassette labeled only 1101. Seven-bit ASCII, sung, it decodes to a URL.',
    glyph: '📼',
    track: '1101',
    master: true,
    // Pocketing the 1101 reel decodes the URL and opens the way IN — a doorway hums
    // open in the vault wall onto the "Save San Diego" text-adventure level.
    revealsSecret: 'save-san-diego',
  },
  {
    id: 'tape-jolly-roger-bay',
    kind: 'trinket',
    label: 'Master: “Jolly Roger Bay”',
    blurb: 'A water-warped shell with a doodled pirate flag. Side B is just tape hiss.',
    glyph: '📼',
    track: 'jolly-roger-bay',
    master: true,
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
