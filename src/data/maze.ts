// ───────────────────────────────────────────────────────────────────────────
// src/data/maze.ts — the back-of-house link maze (ADDENDUM #8).
//
// A small web of interlinked, crawlable retro pages: the pizza shop's basement
// corridors as HTML. Every node is a REAL prerendered route (one <h1>, real
// anchors, sitemapped) with genuine lore on it — never a thin doorway page.
// Dead-ends sell (a music or hire link from links.ts); exits drop into the 3D
// world via the sanctioned public deep links (/?world, /?room=ID).
//
// LORE RULE: every `lore` line is quoted VERBATIM from lore.ts or whispers.ts —
// never invented here. maze.test.ts enforces membership, so a reworded "fact"
// fails CI. The `intro` is scene dressing (a corridor, a freezer), not biography.
// ───────────────────────────────────────────────────────────────────────────

export type MazeGif = {
  /** Basename in /gifs (animated + `-static` reduced-motion twin both exist). */
  name: 'construction' | 'flames' | 'dancing-pizza' | 'coins' | 'trophy' | 'globe';
  width: number;
  height: number;
  /** Accessible name; '' when purely decorative. */
  alt: string;
};

export type MazeNode = {
  /** Route slug — the page lives at `/${slug}`. */
  slug: string;
  /** Page h1 + <title> lead. */
  title: string;
  /** Unique meta description for the route. */
  description: string;
  /** Scene-setting line(s), original room dressing in the 1997 register. */
  intro: string;
  /** Verbatim lines from lore.ts LORE / whispers.ts ROOM_WHISPERS (tested). */
  lore: string[];
  /** Onward maze doors — slugs of other nodes. */
  onward: { slug: string; label: string }[];
  /** The sell: links.ts dest ids surfaced on this node. */
  pitch: { destId: string; lead: string }[];
  /** Optional exit into the 3D world (a sanctioned public deep link). */
  exit?: { href: string; label: string };
  gif: MazeGif;
};

export const MAZE_ENTRY_SLUG = 'basement-stairs';

export const MAZE: MazeNode[] = [
  {
    slug: 'basement-stairs',
    title: 'The Basement Stairs',
    description:
      'The self-guided tour of the pizza shop’s basement: a staircase, a bare bulb, and the first two doors. Part of Scoobert Doobert’s Electronic Pizza Storefront.',
    intro:
      'The door marked STAFF ONLY was open, so technically this is a tour. A bare bulb, a handrail with opinions, and two doors at the bottom. The walls have been reading about the owner:',
    lore: [
      'Scoobert Doobert is the goblin-mode music alias of Luke F. Walton — a San Diego AI-company founder and philosopher who writes, plays, produces, and mixes his own records.',
      'Three names, one person: he records as Scoobert Doobert, takes credits as Luke Francis Walton, and writes as Luke F. Walton.',
    ],
    onward: [
      { slug: 'walk-in-freezer', label: 'The cold door (walk-in freezer)' },
      { slug: 'dry-storage', label: 'The dusty door (dry storage)' },
    ],
    pitch: [{ destId: 'listen', lead: 'The staircase hums something. It’s on Spotify:' }],
    gif: { name: 'construction', width: 104, height: 26, alt: '' },
  },
  {
    slug: 'walk-in-freezer',
    title: 'The Walk-In Freezer',
    description:
      'The pizza shop’s walk-in freezer: shrimp burritos, a tuned pan rack, and a door that should not glow. Part of the basement maze on scoobertdoobert.pizza.',
    intro:
      'Cold enough to see your breath, which is period-accurate for 1997. Someone has alphabetized the shrimp burritos. Taped to a shelf of dough:',
    lore: [
      'a flour-dusted rack of pizza pans, each tuned to a note. The site’s whole joke, here: a pizza shop that’s secretly a one-man music project — where the pies and the songs both get made.',
      'He has the burrito brain bad: a song that’s just "It’s time to eat a shrimp burrito" on loop, and the YouTube handle @ScoobertDoobertBurrito.',
    ],
    onward: [
      { slug: 'break-room', label: 'The warm door (break room)' },
      { slug: 'grease-trap', label: 'The hatch in the floor (grease trap)' },
    ],
    pitch: [
      {
        destId: 'reel',
        lead: 'A frozen demo tape thaws into a playlist — his productions, collabs, and (at the bottom) the mixes:',
      },
    ],
    exit: { href: '/?room=kitchen', label: 'A glowing door: step through into the KITCHEN (3D)' },
    gif: { name: 'dancing-pizza', width: 64, height: 64, alt: 'A pixel pizza slice, dancing.' },
  },
  {
    slug: 'dry-storage',
    title: 'Dry Storage',
    description:
      'The pizza shop’s dry storage: flour, canned tomatoes, and shelf after shelf of master tapes. Part of the basement maze on scoobertdoobert.pizza.',
    intro:
      'Flour, canned tomatoes, and — one shelf deeper — reels. Somebody has been storing a discography in here between the napkins:',
    lore: [
      'shelves of reels, hundreds of them. Every song on his debut LP “Finding SD” was written, recorded, mixed and mastered in a single day.',
      'Muso.AI ranked Scoobert Doobert Top 1% of Artists AND Top 1% of Songwriters — close to 300 registered compositions.',
    ],
    onward: [
      { slug: 'break-room', label: 'The warm door (break room)' },
      { slug: 'service-tunnel', label: 'The long dark (service tunnel)' },
    ],
    pitch: [
      { destId: 'catalog', lead: 'The whole shelf, digitized, name-your-price on Bandcamp:' },
    ],
    exit: {
      href: '/?room=tapevault',
      label: 'Follow the reels down into the TAPE VAULT (3D)',
    },
    gif: { name: 'coins', width: 64, height: 48, alt: '' },
  },
  {
    slug: 'break-room',
    title: 'The Break Room',
    description:
      'The pizza shop break room: a corkboard, a bathrobe, and the webmaster’s rate card. Mixing & production inquiries welcome — beformer@aol.com.',
    intro:
      'A microwave older than the web, a couch that has seen things, and a corkboard. Pinned dead center, between a shift schedule and a bathrobe:',
    lore: [
      'He tracked the whole 2018 LP $WAMI$ alone in a bathrobe — except a few drum-and-bass moments played by Louis Cole.',
    ],
    onward: [{ slug: 'basement-stairs', label: 'Back up the stairs' }],
    pitch: [
      {
        destId: 'contact',
        lead: 'THE RATE CARD (thumbtacked): the webmaster mixes & produces records for hire. Serious inquiries to',
      },
      { destId: 'reel', lead: 'References available immediately, in playlist form:' },
    ],
    gif: { name: 'trophy', width: 48, height: 56, alt: '' },
  },
  {
    slug: 'grease-trap',
    title: 'The Grease Trap',
    description:
      'The pizza shop’s grease trap: the lowest point in the building, philosophically speaking. A dead-end with excellent acoustics.',
    intro:
      'The lowest point in the building, and it knows it. The grease has achieved a kind of stillness. Scratched into the lid, in careful handwriting:',
    lore: [
      '"Derrida Makes a Différance" puns deferred meaning against physics — matter the stuff vs. matters the importance. Verdict: "we do not matter much, if at all."',
      'Its escape hatch: "living in the meaningless, a freedom can come out of it" — landing on a homophone, "to be the sun / to be a son."',
    ],
    onward: [{ slug: 'walk-in-freezer', label: 'Climb back up to the freezer' }],
    pitch: [
      { destId: 'reel', lead: 'Even down here the acoustics are honest. Proof of the work:' },
      { destId: 'contact', lead: 'Your record deserves better than a grease trap. Write to' },
    ],
    gif: { name: 'flames', width: 120, height: 28, alt: '' },
  },
  {
    slug: 'service-tunnel',
    title: 'The Service Tunnel',
    description:
      'The service tunnel under the pizza shop: it goes further than the building does. The end of the basement maze — and the way into the world.',
    intro:
      'It goes further than the building does, which nobody wants to think about. Pipes overhead, a breeze from somewhere that is not San Diego. Stenciled on the wall at the far end:',
    lore: [
      'He interned at Surfdog Records packing Brian Setzer CDs into mailers — then hit #1 on Munich’s egoFM chart with "Don’t Worry" (2021).',
      'His first night ever in Japan landed on his birthday and ended in a four-hour Kanda jam — 20+ songs with local musicians.',
    ],
    onward: [{ slug: 'basement-stairs', label: 'Loop back to the stairs' }],
    pitch: [{ destId: 'listen', lead: 'The breeze is carrying a song. Follow it on Spotify:' }],
    exit: {
      href: '/?world',
      label: 'The tunnel opens: walk out into THE WORLD (3D)',
    },
    gif: { name: 'globe', width: 48, height: 48, alt: '' },
  },
];

export function mazeNodeBySlug(slug: string): MazeNode | undefined {
  return MAZE.find((n) => n.slug === slug);
}
