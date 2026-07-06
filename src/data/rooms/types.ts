// ───────────────────────────────────────────────────────────────────────────
// src/data/rooms/types.ts — the 3D world's TYPES + shared constants.
//
// Split out of rooms.ts so the per-wing room files (core/water/japan/surface/
// memorylane) and the rooms.ts assembler all share ONE definition of Room, its
// parts, and the geometry constants — with no import cycle (this is the leaf both
// the wings and rooms.ts import). Three-free, like the rest of the rooms graph.
// rooms.ts re-exports everything here, so external code keeps importing from
// '../data/rooms' unchanged.
// ───────────────────────────────────────────────────────────────────────────
import { ROOM } from '../../world/dims';

// Re-export the dims constant + the eye height so the wing files import both
// geometry helpers from one place ('./types').
export { ROOM };

export type RoomKind =
  | 'shop'
  // The Kitchen — the pizza shop's back-of-house off the shop's -X wall ("EMPLOYEES
  // ONLY"): a warm, goofy SURFACE relief room (stays sweet). The pizza→music thesis
  // made into a place — a rack of tuned pizza pans you can play (reuses PizzaPanChimes).
  | 'kitchen'
  | 'hallway'
  | 'jukebox'
  | 'classified'
  | 'poolrooms'
  | 'liminal'
  | 'mobius'
  | 'dicepit'
  | 'shrine'
  | 'metro'
  | 'practice'
  | 'grass'
  | 'grassbattle'
  // The Grassrooms (草の間) — the backrooms after nature won: a white office
  // interior gone to grass + indoor trees + blue wildflowers, the low ceiling
  // broken open to an impossible blue sky. A FULLY SWEET liminal breather off the
  // liminal level (a relief exhale; baseUnease below SAFE). musicRoom (its own
  // wind + furin ambient). Hosts the ghost kart-battle minigame.
  | 'grassrooms'
  | 'grove'
  | 'frutiger'
  | 'lockerroom'
  | 'closet'
  // The Boardwalk wing — a sweet SoCal surface branch off the shop (NOT the
  // descent): a golden-hour pier, a moonlit beach, a park path. Each plays its
  // own Scoobert song (Room.song) — the reward for wandering out is the music.
  | 'boardwalk'
  | 'oceanview'
  | 'balboa'
  // The Sunken Gallery wing — a submerged vaporwave-classical hall of crunched
  // greek statuary off the poolrooms (funny-uncanny, never traumatic), opening
  // onto a sweet pastel daydream breather. Each plays its own song (Room.song).
  | 'gallery'
  | 'daydream'
  // The Aerial (テルミン) — a hushed cosmic chamber deep off the liminal level with
  // one theremin you play BY PROXIMITY (walk toward it → it sings higher + louder).
  // The deep "play it" instrument ROOM (vs. the surface cabinets); a SWEET relief
  // beat (musicRoom — it owns the space). The first sustained/continuous voice on
  // the music ladder (every other instrument is struck/plucked).
  | 'theremin'
  // The Void (虚空) — the cosmic 3D-screensaver deep off the theremin: a wordless
  // black gulf where blue RINGED PLANETS drift in slow orbits over a dark, rippling,
  // reflective void-floor, under a full dome of stars. Pure 90s-screensaver wonder —
  // SWEET, hypnotic, below SAFE (a cosmic exhale, never a scare). Drift + ripple
  // freeze under reduced motion.
  | 'void'
  // The Waiting Room (待合室) — a liminal municipal lobby through a door in the
  // drained deep end: rows of bolted-down chairs facing a shuttered reception
  // window, a dead CRT hissing dim static, a NOW SERVING sign stuck on 404, all
  // under a flickering drop-ceiling. Funny-UNCANNY (the dread is the endless wait,
  // never a scare — the taste line holds); an atmospheric dead-end off deeppool.
  | 'waitingroom'
  // The Memory Lane wing — a digital-nostalgia branch off the classified file
  // room: a corridor of glowing CRTs showing old-web fragments, opening into a
  // dark server-void where drifting data motes are "all my friends." Mildly
  // eerie-warm, NOT dread. Each plays its own song (Room.song).
  | 'memorylane'
  | 'internet'
  // The Moonlight wing — a sweet night→day pair extending the boardwalk's SoCal
  // surface: a moonlit dance plaza out on the pier, opening onto a bright "best
  // day ever" carnival end. Pure surface goof (taste-safe). Each plays its own
  // song (Room.song) — the reward for strolling further is the music.
  | 'moonlight'
  | 'bestday'
  // The California wing — a sweet golden-hour pair up the park path: a coastal
  // overlook on the road, drifting down into a hazy tidepool daydream. Pure
  // surface goof (taste-safe). Each plays its own song (Room.song).
  | 'california'
  | 'tidepools'
  // The San Diego wing — Balboa Park spills into the city: the San Diego Zoo (a
  // flock of low-poly flamingos in a pond) opening onto a North Park dusk street
  // under the iconic NORTH PARK sign, where you can drink little beers (too many
  // and the screen goes goofily blurry). Pure surface goof (taste-safe). Each
  // plays its own song (Room.song).
  | 'zoo'
  | 'northpark'
  // The Botanical Garden (植物園) — a lush formal garden off the Park Path:
  // trimmed hedges, pink-brick paths, seeded-random palms, the verdigris frog
  // statue with its lily-pad parasol (click → ribbit; a nat 20 winks +1 luck),
  // and a fast-food play-place TUBE SLIDE you actually ride (walk into the
  // mouth → the camera is carried through the corkscrew; points per ride).
  // Pure surface sweetness (taste-safe); a musicRoom — birdsong, breeze, and a
  // distant bullfrog own the space.
  | 'garden'
  // The Tubes (チューブ) — a hidden PlayPlace crawl-warren the garden's tube slide
  // DROPS you into (the ride is the entrance): translucent green tube walls,
  // bubble portholes of coloured light, a padded floor, and a low-poly BALL PIT
  // payoff. Sweet + nostalgic (below SAFE); a musicRoom (soft bloops). A tube
  // mouth crawls back out to the garden.
  | 'tubes'
  // The Grotto (洞窟) — the little cave behind the garden's north hedge: dark
  // boulders inside, the mouth framing bright pond water + a waterfall + a palm.
  // A cool hushed nook (still sweet — below SAFE); echoey drips ("extra reverb").
  | 'grotto'
  // The Bamboo Grove (竹林) — through the garden's stone LION moon-gate: a dense
  // stand of tall bamboo in dappled green light, a stone lantern, and a
  // shishi-odoshi keeping time (klok). Sweet; a musicRoom (wind + the knocker).
  | 'bamboo'
  // Main Street — a liminal small-town-America street off North Park at dead of
  // night: dark storefronts, a lone blinking traffic light, empty sidewalks, a
  // flickering lamp. Eerie-WARM (the uncanny of an empty hometown, never a
  // scare). A door leads into the diner.
  | 'mainstreet'
  // The Diner — an all-night small-town diner off Main Street: counter + stools,
  // booths, a pie case, checker floor, buzzing sign — and a row of low-poly
  // TAXIDERMY animal heads that watch the room. Warm-uncanny (funny, not grim).
  | 'diner'
  // Doobert's — a warm PS1 dive bar at the dark far end of Main Street: a long bar
  // under a bottle-wall backbar + a dead MIRROR that reflects nothing (PS1 has no
  // reflections — the gag), buzzing pink neon, red-vinyl stools, string lights, a
  // dartboard, and a hardcover of RAY TRACING propped among the liquor (deadpan).
  // A cozy-WARM relief beat off the eerie street — never a scare (the taste holds).
  | 'bar'
  // The Jumping Turtle — the defunct all-ages pub / music venue off North Park
  // (San Marcos, where he played in high school). Abandoned-venue register:
  // flyer-covered doors, a small stage under the leaping-turtle sign, left-behind
  // concert gear you can still PLAY (the drum kit), a broken CRT that never turns
  // on. Eerie-WARM nostalgia, never dread — the room remembers the shows.
  | 'turtle'
  // The Basement Sessions — a recording-studio wing off the practice room (deeper
  // backstage, where the music actually gets MADE). A live room you can PLAY (a
  // drum kit + a keyboard), the control room's mixing desk + tape machines, a tape
  // vault of collectible master demos, and a sweet lounge breather (the rat naps
  // here). Each room plays its own Scoobert track (Room.song). Surface-sweet,
  // taste-safe — the warm heart of a musician's site.
  | 'liveroom'
  | 'controlroom'
  | 'tapevault'
  | 'lounge';

/** How many forward laps it takes for the Möbius corridor to "break on its own"
 *  and reveal the way onward (the `revealOn: 'mobius'` door). Kept low — the loop
 *  is the bit, not a grind (friction budget). */
export const MOBIUS_BREAK = 3;

/** A GLB level: a (wide-permission, crunched) model loaded as the room geometry,
 *  lazy-loaded behind the loader minigame. See GlbRoom / LevelLoader, and
 *  THIRD_PARTY_NOTICES.md for asset provenance. */
export type RoomGlb = {
  /** Crunched derivative under public/models/ (NOT the raw media/models source). */
  url: string;
  /** Target horizontal footprint (world units) to auto-fit the model into. */
  fit?: number;
  /** Extra yaw to orient the model. */
  rotationY?: number;
  /** Where the loader's TURN BACK bounces the player if the GLB fails to load.
   *  Explicit so recovery isn't coupled to door array order (a reordered/added
   *  door must never silently change the safe exit). Falls back to the first
   *  door, then the shop, if omitted. */
  recoverTo?: { to: string; spawn?: string };
};

/** Where the camera stands when it arrives. yaw is radians about +Y (π faces -Z). */
export type Spawn = { position: [number, number, number]; yaw: number };

/** A wandering, dancing entity (Wanderer) placed in a (GLB) level. */
export type RoomEntity = {
  /** Stable id (the dance test hook keys on it + React keying). */
  id: string;
  /** Which low-poly body to render. */
  body: 'blob' | 'lurker' | 'mop';
  /** Friendly name for the "dance along" prompt + reward (defaults from body). */
  label?: string;
  /** Start position on the floor [x, z] (y is the floor). */
  spawn: [number, number];
  /** Get this close → it stops to dance (default 3). */
  danceRadius?: number;
  /** Roam speed (default 2.2). */
  speed?: number;
};

export type RoomDoor = {
  /** Stable id, unique within the world. */
  id: string;
  /** Target room id. */
  to: string;
  /** Spawn id to arrive at in the target room (defaults to 'default'). */
  toSpawn?: string;
  /** World position of the doorway (sits flush in a wall). */
  position: [number, number, number];
  /** Rotation about +Y so the frame lies in its wall and the opening faces in. */
  rotationY: number;
  /** Verb phrase for the prompt: rendered as `Press E to {label}`. */
  label: string;
  /** Hidden until revealed (the rat's secret panel — Phase 3 ckpt 4). */
  hidden?: boolean;
  /** What makes a `hidden` door appear. 'secret' = the rat knocked
   *  (secretRevealed); 'mobius' = the loop broke (mobiusLoops ≥ MOBIUS_BREAK).
   *  Defaults to 'secret'. */
  revealOn?: 'secret' | 'mobius';
  /** Or reveal — for good — once a durable progress secret is earned
   *  (progressStore.secretsFound includes this id), e.g. the grove path that opens
   *  after you beat the grass goblin. Takes precedence over revealOn when set. */
  revealSecret?: string;
  /** ESCAPE-ROOM reveal (Luke, 2026-07): a `hidden` door that appears once a
   *  matching TRIGGER fires this session — an interactable click (Room.interactables)
   *  or a pickup. Ephemeral (re-armed on a fresh load) so it re-teaches the "do
   *  something → the way opens" grammar each visit. Distinct from revealSecret (that
   *  one is durable). Takes precedence over revealOn. */
  revealOnTrigger?: string;
  /** OPENS A FULL-SCREEN LEVEL instead of traveling to a 3D room: on activation
   *  (E / click) this door raises the named level overlay (e.g. 'save-san-diego' →
   *  the 1101 text-adventure) rather than wiping to `to`. `to` still names the room
   *  you conceptually "came from" for prompts/labels. */
  opensLevel?: string;
  /** If set, this door is a PAINTING PORTAL: it renders as a big framed album cover
   *  (CoverArt.FramedCover) instead of a doorway and LUNGES at you on entry (the
   *  SM64 dive). The slug resolves against src/data/albums. */
  albumSlug?: string;
  /** LOCKED until the player holds this items.ts key id. The door still renders +
   *  prompts (you can SEE it's there); E / click just announces "locked" until you
   *  have the key. SECRET / SIDE TIER ONLY — never a main-descent door (friction
   *  budget); the dev guard below rejects a requiresKey door that targets a
   *  descent room. */
  requiresKey?: string;
  /** How close (world units) to trigger the prompt. */
  radius?: number;
};

/** An ESCAPE-ROOM interactable (Room.interactables) — a small clickable object
 *  (a bell, a switch) whose whole job is to FIRE A TRIGGER, which reveals a
 *  `revealOnTrigger` door somewhere in the room. The site's "do something → the
 *  way opens" grammar (Luke, 2026-07): trivially easy, always signposted (a hover
 *  cursor + a floating label). Click / tap to activate; the reveal is the payoff. */
export type RoomInteractable = {
  /** Stable id (React key + the dance/smoke hooks). */
  id: string;
  /** World position of the clickable object (its base sits here). */
  position: [number, number, number];
  /** Verb phrase shown floating over it + announced on use ("ring the bell"). */
  label: string;
  /** The trigger id this fires — a door with a matching `revealOnTrigger` appears. */
  revealsTrigger: string;
  /** Which little clickable to render (defaults to 'bell'). */
  kind?: 'bell' | 'switch' | 'orb';
  rotationY?: number;
};

/** A decorative album cover hung on a wall (room.paintings) — showcase art, no
 *  interaction (portals are doors with `albumSlug`). Positioned + rotated to sit
 *  flush on a wall; references an album by slug (src/data/albums). */
export type RoomPainting = {
  slug: string;
  position: [number, number, number];
  /** Rotation about +Y so the cover faces into the room. */
  rotationY?: number;
  /** Edge length in world units (covers are square). Defaults to ~2.4. */
  size?: number;
};

/** A crunched GLB placed as set-dressing in a room (GlbProp renders it). */
export type RoomProp = {
  /** Crunched derivative under public/models/ (NOT the raw media/models source). */
  url: string;
  /** Base position (the model's feet sit here). */
  position: [number, number, number];
  /** Target largest dimension in world units (auto-scales the model). */
  fit?: number;
  rotationY?: number;
  /** Idle Y-spin (rad/s) — e.g. a slowly turning Möbius strip. */
  spin?: number;
  /** Emissive boost (0..1) so a prop reads against a DIM room instead of going
   *  to black under PS1 flat lighting (the Möbius strip in the dark corridor). */
  glow?: number;
};

export type RoomPalette = {
  /** Canvas clear / sky color. */
  background: string;
  /** Fog color (usually == background so geometry dissolves into it). */
  fog: string;
  fogNear: number;
  fogFar: number;
};

export type Room = {
  id: string;
  kind: RoomKind;
  /** Shown in the HUD's quiet corner label. */
  title: string;
  /** Interior half-extents the camera is clamped inside. */
  dims: { halfW: number; halfD: number; height: number; eye: number };
  palette: RoomPalette;
  /** If set, this room IS a GLB level (GlbRoom renders it behind the loader). */
  glb?: RoomGlb;
  /** Render ambient water dripping from the ceiling (the watery descent's
   *  aftermath). Opt-in per room so it isn't coupled to a room kind. */
  drips?: boolean;
  /** A MUSIC room: the room's own audio (a sound garden, the furin) should own the
   *  space, so the loop-voice SONG fades out while you're here (audio.setSongLevel).
   *  Instrument one-shots, which hit master directly, are unaffected. */
  musicRoom?: boolean;
  /** The loop-voice SONG this room plays while you're inside it (a jukebox.catalog
   *  slug). On enter, the room becomes that track; on exit, your preferred pick
   *  returns (musicStore.restorePreferred) — a TEMPORARY override, never a new
   *  collectible or a permanent switch. "Exploration's reward is sound": finding the
   *  place gives you its song. Mutually exclusive with `musicRoom` (which FADES the
   *  carried song out for rooms that own the space with their own bells). Typos +
   *  the song/musicRoom conflict are guarded in music.test.ts. */
  song?: string;
  /** GLB set-dressing placed in the room (GlbProp). Crunched models from the
   *  trove — provenance in THIRD_PARTY_NOTICES.md. */
  props?: RoomProp[];
  /** Album covers hung on the walls as framed showcase paintings (CoverArt). */
  paintings?: RoomPainting[];
  /** A CRT television (TvSet) — click it to play a clip in the modal player. It
   *  resolves what to show through videos.tvVideoFor: a `songSlug` (a jukebox
   *  slug — its own music video, the most specific) wins, else an `albumSlug`
   *  (that record's video). A song-room's CRT should name its `song`, so the set
   *  plays the very track the room is scored to. At least one of the two is set. */
  tv?: {
    position: [number, number, number];
    rotationY?: number;
    albumSlug?: string;
    songSlug?: string;
  };
  /** Collectible items lying in the room (ItemPickup). Durable: each disappears
   *  for good once taken (progressStore.itemsHeld). */
  pickups?: { itemId: string; position: [number, number, number] }[];
  /** Wandering entities (Wanderer) — roam the room and DANCE (never attack) when
   *  you get close. GLB liminal levels ONLY: a funny-uncanny relief beat against
   *  the dread down there (the contrast is the point); the sweet procedural rooms
   *  don't need them. Desktop + motion-OK is automatic (the world only mounts
   *  there). The dev guard warns if this is set on a non-GLB room. */
  entities?: RoomEntity[];
  /** ESCAPE-ROOM interactables: small clickable objects that fire a trigger to
   *  reveal a `revealOnTrigger` door (the "do something → the way opens" grammar). */
  interactables?: RoomInteractable[];
  /** Named arrival points (doors reference these by id). 'default' is required. */
  spawns: Record<string, Spawn> & { default: Spawn };
  doors: RoomDoor[];
};

// Single source for the door-transition timing: the black-wipe commit (JS
// setTimeout in WorldHud) and the overlay's CSS opacity transition both read
// this, injected as the `--room-fade-ms` custom property, so the visual fade and
// the room swap can't drift apart.
export const ROOM_FADE_MS = 230;

export const EYE = ROOM.eye;
