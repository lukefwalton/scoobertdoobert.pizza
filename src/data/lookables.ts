// ───────────────────────────────────────────────────────────────────────────
// src/data/lookables.ts — "lookables": small clickable curios sprinkled through
// the world. Unlike hotspots (which point at a real links.ts destination), a
// lookable goes nowhere — it just tells you a SHORT story. Flavor, not navigation.
//
// One-per-room minimum is a guarantee, enforced by lookables.test.ts: every room
// in ROOMS has at least one. Adding one is a data entry here — never scene code.
// Position is resolved from the room's own dims at render time via an ANCHOR
// preset (see resolveLookablePos), so a new room's curio can't float outside a
// small room or need hand-tuned coordinates.
//
// `kind: 'animalHead'` renders a little mounted head whose EYES TRACK YOU as you
// pass (Luke's ask). Everything else is a soft, bobbing curio marker.
// ───────────────────────────────────────────────────────────────────────────

export type LookableKind = 'prop' | 'animalHead';

/** Where in the room to hang it — resolved against the room's dims so it always
 *  sits a safe inset off a real wall, whatever the room's size. */
export type LookableAnchor =
  | 'back'
  | 'back-left'
  | 'back-right'
  | 'left'
  | 'right'
  | 'front-left'
  | 'front-right'
  | 'center';

export type Lookable = {
  /** Stable, unique id. */
  id: string;
  /** The room this lives in (a ROOMS id). */
  room: string;
  kind?: LookableKind; // default 'prop'
  anchor?: LookableAnchor; // default 'back'
  /** Height override (world units). Default 1.7 for a prop, 2.5 for a head. */
  height?: number;
  /** Dialog title — the thing itself, lowercase-cute ("a mounted buck"). */
  label: string;
  /** Emoji shown on the curio + in the dialog. */
  glyph: string;
  /** The short story. Keep it terse — a line or two. */
  story: string;
  /** Proximity prompt. Default "Press E to look". */
  prompt?: string;
  /** Tint for an animalHead's eyes (default a warm amber). */
  eyeColor?: string;
};

export const LOOKABLES: Lookable[] = [
  // ── the shop + descent core ──────────────────────────────────────────────
  {
    id: 'shop-look',
    room: 'shop',
    anchor: 'back-left',
    label: 'the specials board',
    glyph: '🍕',
    story: "Today's special: whatever's already open. It's been today's special since 1997.",
  },
  {
    id: 'kitchen-look',
    room: 'kitchen',
    anchor: 'right',
    label: 'a dented stockpot',
    glyph: '🍲',
    story: "Something's still warm in here. Nobody's cooked in years. Try not to think about it.",
  },
  {
    id: 'hallway-look',
    room: 'hallway',
    anchor: 'right',
    label: 'a crooked frame',
    glyph: '🖼️',
    story:
      'A photo of the shop, empty. You lean in. It becomes a photo of this hallway. You lean back.',
  },
  {
    id: 'closet-look',
    room: 'closet',
    anchor: 'left',
    label: "a coat that isn't yours",
    glyph: '🧥',
    story: 'One coat, one hook. Still your size. Still warm.',
  },
  {
    id: 'classified-look',
    room: 'classified',
    anchor: 'back',
    label: 'a mislabeled drawer',
    glyph: '🗄️',
    story: 'The tab reads YOU. The drawer is empty. For now.',
  },
  {
    id: 'jukebox-look',
    room: 'jukebox',
    anchor: 'right',
    label: 'a scratched 45',
    glyph: '💿',
    story: "The B-side is forty seconds of someone laughing. It's a good laugh.",
  },
  {
    id: 'memorylane-look',
    room: 'memorylane',
    anchor: 'left',
    label: 'a dead monitor',
    glyph: '🖥️',
    story: "It boots for a second when you're not looking. You've decided not to look.",
  },
  {
    id: 'internet-look',
    room: 'internet',
    anchor: 'back-right',
    label: 'a guestbook terminal',
    glyph: '📟',
    story: '347 signatures, all in your handwriting. You remember signing exactly none of them.',
  },
  // ── the studio wing ───────────────────────────────────────────────────────
  {
    id: 'practice-look',
    room: 'practice',
    anchor: 'back-right',
    label: 'a taped-up snare',
    glyph: '🥁',
    story: "The setlist on the wall is all songs you haven't written yet. Good ones, apparently.",
  },
  {
    id: 'liveroom-look',
    room: 'liveroom',
    anchor: 'left',
    label: 'a mic left hot',
    glyph: '🎙️',
    story: "It's still on. It's always still on. Say something nice.",
  },
  {
    id: 'controlroom-look',
    room: 'controlroom',
    anchor: 'right',
    label: 'a fader stuck at 7',
    glyph: '🎚️',
    story: 'Someone gaffer-taped it there. The tape says DO NOT. That is the whole note.',
  },
  {
    id: 'tapevault-look',
    room: 'tapevault',
    anchor: 'back',
    label: 'an unlabeled reel',
    glyph: '📼',
    story:
      'The box says MASTER — DO NOT ERASE. It plays back as pure silence. Or you just can’t hear it yet.',
  },
  {
    id: 'listening-look',
    room: 'listening',
    anchor: 'back',
    label: 'the visitor’s book',
    glyph: '📖',
    story:
      'A museum guest book on a little stand. One entry, over and over, in the same hand: “came back for the songs.” The pen is warm.',
  },
  {
    id: 'lounge-look',
    room: 'lounge',
    kind: 'animalHead',
    anchor: 'back',
    label: 'a mounted buck',
    glyph: '🦌',
    story: 'The plaque calls him a very good listener. His eyes agree. His eyes keep agreeing.',
  },
  // ── the liminal descent ───────────────────────────────────────────────────
  {
    id: 'poolrooms-look',
    room: 'poolrooms',
    anchor: 'right',
    label: 'a NO LIFEGUARD sign',
    glyph: '🚱',
    story: "There's no water either. The sign seems mainly worried about the lifeguard.",
  },
  {
    id: 'gallery-look',
    room: 'gallery',
    anchor: 'back',
    label: 'an untitled painting',
    glyph: '🖼️',
    story: "It's a painting of you looking at it. The paint is still wet. You haven't touched it.",
  },
  {
    id: 'daydream-look',
    room: 'daydream',
    anchor: 'center',
    height: 1.4,
    label: 'a very soft cloud',
    glyph: '☁️',
    story: 'You could nap here forever. That is the trap. It is a nice trap.',
  },
  {
    id: 'dicepit-look',
    room: 'dicepit',
    anchor: 'back-left',
    label: 'a loaded die',
    glyph: '🎲',
    story:
      'It only rolls twenties. The thing in the corner insists it is fair. You agree. You have to.',
  },
  {
    id: 'lockerroom-look',
    room: 'lockerroom',
    anchor: 'left',
    label: 'locker 13',
    glyph: '🔒',
    story: "Your name's on the tape, faded but yours. You never went out for the team.",
  },
  {
    id: 'mobius-look',
    room: 'mobius',
    anchor: 'right',
    label: 'the same door',
    glyph: '🚪',
    story: "You've passed it four times. It's been four different sides of one door.",
  },
  {
    id: 'liminal-look',
    room: 'liminal',
    anchor: 'back',
    height: 2.2,
    label: 'a humming light',
    glyph: '💡',
    story: 'It buzzes in a key. Hum back and it brightens a little. Go on.',
  },
  {
    id: 'deeppool-look',
    room: 'deeppool',
    anchor: 'back',
    label: 'a ladder to nowhere',
    glyph: '🪜',
    story: 'It descends into the deep end. There is no deep end. There is only more down.',
  },
  {
    id: 'waitingroom-look',
    room: 'waitingroom',
    anchor: 'front-right',
    height: 1.3,
    label: 'the take-a-number spool',
    glyph: '🎫',
    story:
      'You pull A-899. The board says NOW SERVING 404. You do the arithmetic, then decide not to. There are chairs. There is time.',
  },
  {
    id: 'grassrooms-look',
    room: 'grassrooms',
    anchor: 'right',
    height: 1.2,
    label: 'a patch of astroturf',
    glyph: '🌱',
    story: "Warm, plastic, and it smells like a birthday. Nobody's birthday. A birthday.",
  },
  {
    id: 'theremin-look',
    room: 'theremin',
    anchor: 'left',
    label: 'a lonely aerial',
    glyph: '📡',
    story: 'Wave near it. It sings your name wrong, then right, then pretends it didn’t.',
  },
  {
    id: 'void-look',
    room: 'void',
    anchor: 'center',
    height: 2.0,
    label: 'a planet close enough to touch',
    glyph: '🪐',
    story:
      "It drifts off the instant you reach. The old machines promised worlds like this in the browser in '96 — navigable, 3D. You're late; it waited for you.",
  },
  // ── the shrine / grass thread ─────────────────────────────────────────────
  {
    id: 'shrine-look',
    room: 'shrine',
    anchor: 'back-right',
    label: 'an offering box',
    glyph: '⛩️',
    story: "Two claps and a wish. It's full of other people's luck. Take a little.",
  },
  {
    id: 'metro-tunnel-look',
    room: 'metro-tunnel',
    anchor: 'left',
    height: 2.2,
    label: 'a service phone',
    glyph: '📞',
    story: 'It rings once, every time you turn away. The next train is always the next train.',
  },
  {
    id: 'terminus-look',
    room: 'terminus',
    anchor: 'back',
    label: 'a punched ticket',
    glyph: '🎫',
    story: "It's a ticket back up, already punched. You don't remember the ride down either.",
  },
  {
    id: 'grassfield-look',
    room: 'grassfield',
    anchor: 'left',
    height: 1.3,
    label: 'a bent stalk',
    glyph: '🌾',
    story: 'Something big walked through here recently. It was humming. It seemed happy.',
  },
  {
    id: 'grassbattle-look',
    room: 'grassbattle',
    anchor: 'right',
    height: 1.2,
    label: 'a foam sword',
    glyph: '🗡️',
    story:
      'Dropped by the last challenger, still warm. They lost — which here just means they got unstuck.',
  },
  {
    id: 'grove-look',
    room: 'grove',
    anchor: 'back-left',
    label: 'a wind chime',
    glyph: '🎐',
    story: 'It only chimes when you leave. You keep turning to catch it. It is very patient.',
  },
  {
    id: 'frutiger-look',
    room: 'frutiger',
    anchor: 'center',
    height: 1.6,
    label: 'a floating bubble',
    glyph: '🫧',
    story: "There's a tiny beach inside it, and a tinier you, waving. Wave back.",
  },
  // ── the surface: boardwalk / parks / beaches ──────────────────────────────
  {
    id: 'boardwalk-look',
    room: 'boardwalk',
    anchor: 'left',
    label: 'a token machine',
    glyph: '🎡',
    story:
      'Takes real quarters, gives fake gold. Nobody has ever once questioned the exchange rate.',
  },
  {
    id: 'balboa-look',
    room: 'balboa',
    anchor: 'right',
    label: 'a coin-op telescope',
    glyph: '🔭',
    story: 'Point it anywhere. It always finds the ocean. It really wants you to see the ocean.',
  },
  {
    id: 'garden-look',
    room: 'garden',
    anchor: 'left',
    height: 1.2,
    label: 'a plant tag',
    glyph: '🌺',
    story: 'Common name: Best Friend. Water twice weekly. Talk to it more often than that.',
  },
  {
    id: 'grotto-look',
    room: 'grotto',
    kind: 'animalHead',
    anchor: 'back',
    height: 1.9,
    eyeColor: '#8fd0e6',
    label: 'a stone koi',
    glyph: '🐟',
    story:
      'Carved into the wall mid-leap. Its eye is wet. It is always mid-leap. It is watching the leap.',
  },
  {
    id: 'bamboo-look',
    room: 'bamboo',
    kind: 'animalHead',
    anchor: 'back-right',
    height: 2.0,
    eyeColor: '#e8d48a',
    label: 'the moon-gate lion',
    glyph: '🦁',
    story: 'Stone, older than the gate. Pat its head for luck. Its eyes follow the luck home.',
  },
  {
    id: 'tubes-look',
    room: 'tubes',
    anchor: 'right',
    height: 1.1,
    label: 'a lost sock',
    glyph: '🧦',
    story:
      'Deep in the plastic warren. Someone came down here once and never fully came back up. Fun, though.',
  },
  {
    id: 'turtle-look',
    room: 'turtle',
    kind: 'animalHead',
    anchor: 'back',
    height: 2.6,
    eyeColor: '#a7d98a',
    label: 'the venue mascot',
    glyph: '🐢',
    story:
      'A taxidermy turtle over the dead stage. The sign said ALL AGES. His eyes have seen every one.',
  },
  {
    id: 'mainstreet-look',
    room: 'mainstreet',
    anchor: 'left',
    height: 2.2,
    label: 'the caution light',
    glyph: '🚦',
    story:
      "It blinks amber over nobody, directing traffic that left in 1994. It's very good at its job.",
  },
  {
    id: 'diner-look',
    room: 'diner',
    kind: 'animalHead',
    anchor: 'back-right',
    height: 2.3,
    eyeColor: '#bfe3ef',
    label: 'a singing bass',
    glyph: '🐠',
    story:
      'Mounted by the register. Press the button. It knows a song you almost remember. Almost.',
  },
  {
    id: 'bar-look',
    room: 'bar',
    anchor: 'back',
    height: 1.5,
    label: 'a book left on the bar',
    glyph: '📖',
    story:
      'RAY TRACING, hardcover, spine uncracked. A mirror that reflects nothing, bottles that never quite line up — someone here is aspirational. Buy them a drink.',
  },
  {
    id: 'mainstreetday-look',
    room: 'mainstreetday',
    anchor: 'right',
    height: 2.2,
    label: 'a shop awning',
    glyph: '🏪',
    story:
      'OPEN, it says, in the hard noon. The door’s been locked since the night side. Same street, wrong light.',
  },
  {
    id: 'oceanview-look',
    room: 'oceanview',
    anchor: 'back',
    label: 'a window seat',
    glyph: '🪟',
    story: 'The sea is out there doing sea things. It waved. You’re fairly sure it waved.',
  },
  {
    id: 'moonlight-look',
    room: 'moonlight',
    anchor: 'right',
    height: 0.9,
    label: 'a beach towel',
    glyph: '🏖️',
    story:
      "Still holds someone's shape, and the sand's still warm. The tide keeps a polite distance.",
  },
  {
    id: 'bestday-look',
    room: 'bestday',
    anchor: 'left',
    label: 'a disposable camera',
    glyph: '📷',
    story: 'One shot left. Point it at the day. Some days are worth the last frame.',
  },
  {
    id: 'california-look',
    room: 'california',
    anchor: 'right',
    height: 1.3,
    label: 'a mile marker',
    glyph: '🛣️',
    story: 'It just says SOON. Every marker says SOON. You are getting closer to SOON.',
  },
  {
    id: 'tidepools-look',
    room: 'tidepools',
    anchor: 'front-left',
    height: 0.7,
    label: 'a curious crab',
    glyph: '🦀',
    story:
      'Holding a tiny pearl and a tinier grudge. Offer it a compliment. It drives a hard bargain.',
  },
  {
    id: 'zoo-look',
    room: 'zoo',
    kind: 'animalHead',
    anchor: 'back',
    height: 2.4,
    eyeColor: '#f0c04a',
    label: 'the trophy wall',
    story:
      'Heads in a row, every one of them, every glass eye pointed at you. They were pointed elsewhere a second ago.',
    glyph: '🦁',
  },
  {
    id: 'northpark-look',
    room: 'northpark',
    anchor: 'left',
    height: 1.8,
    label: 'a stapled flyer',
    glyph: '🎸',
    story:
      'A show tonight, the ink says. Tonight was a long time ago. The band was, briefly, everything.',
  },
];

const BY_ID = new Map(LOOKABLES.map((l) => [l.id, l]));

/** Every lookable in a given room (usually one). */
export function lookablesForRoom(roomId: string): Lookable[] {
  return LOOKABLES.filter((l) => l.room === roomId);
}

export function lookableById(id: string): Lookable | undefined {
  return BY_ID.get(id);
}

/** Resolve an anchor preset to a room-local [x, y, z], a safe inset off the wall,
 *  using the room's own dims so it fits any size. `height` overrides y. */
export function resolveLookablePos(
  l: Lookable,
  dims: { halfW: number; halfD: number },
): [number, number, number] {
  const inset = 0.85;
  const x = dims.halfW - inset;
  const z = dims.halfD - inset;
  const midX = dims.halfW * 0.5;
  const y = l.height ?? (l.kind === 'animalHead' ? 2.5 : 1.7);
  switch (l.anchor ?? 'back') {
    case 'back':
      return [0, y, -z];
    case 'back-left':
      return [-midX, y, -z];
    case 'back-right':
      return [midX, y, -z];
    case 'left':
      return [-x, y, 0];
    case 'right':
      return [x, y, 0];
    case 'front-left':
      return [-midX, y, z];
    case 'front-right':
      return [midX, y, z];
    case 'center':
      return [0, y, 0];
  }
}
