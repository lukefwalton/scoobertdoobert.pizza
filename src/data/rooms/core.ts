// src/data/rooms/core.ts — the spine: the shop lobby, the back hall gallery, the
// jukebox payoff, the practice room backstage, and the classified file room.
import { ROOM, EYE, type Room } from './types';

export const CORE_ROOMS: Room[] = [
  {
    id: 'shop',
    kind: 'shop',
    title: 'Beach Pizza Shop',
    dims: { halfW: ROOM.halfW, halfD: ROOM.halfD, height: ROOM.height, eye: EYE },
    // The tropical-shallow cyan of floor one (unchanged — the shop is ROOMS[0]).
    palette: { background: '#1f8fb5', fog: '#1f8fb5', fogNear: 6, fogFar: 64 },
    // A potted palm by the window — it IS a beach pizza shop.
    props: [{ url: '/models/palm-tree.glb', position: [5.6, 0, -5.4], fit: 4.4, rotationY: 0.5 }],
    // A lost cassette sits on the counter — the first rung of the music ladder.
    pickups: [{ itemId: 'tape-mystery-machine', position: [-4, 0.7, 0] }],
    spawns: {
      // The establishing shot: facing the window/sea (-Z), the boids out the
      // glass. Kept clear of the back-hall door's 3.2 radius so the door is
      // something you discover by turning around, not an instant prompt at spawn.
      default: { position: [0, EYE, ROOM.halfD - 3.5], yaw: Math.PI },
      // Arriving back from the hall: a step clear of the back door (outside its
      // 3.2 radius) so you land IN the room, not on its prompt, and a held E
      // can't immediately bounce you back through it. Faces the sea.
      fromHall: { position: [0, EYE, ROOM.halfD - 4.5], yaw: Math.PI },
      // Stepping back IN off the boardwalk: by the +X side door, a step clear of
      // its radius, facing into the shop (-X). The wing is a LATERAL surface exit
      // (out to the beach), not a way down — the descent rule is untouched.
      fromBoardwalk: { position: [ROOM.halfW - 4.5, EYE, 3], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'shop-to-hall',
        to: 'hallway',
        toSpawn: 'fromShop',
        // Back wall (+Z), opposite the window. "EMPLOYEES ONLY." The shop is the
        // TOP lobby — its only way on is INTO the building (the hall → the music),
        // never a stairwell down right here. You FIND the way down by going
        // deeper (past the jukebox), not from the lobby. (Luke's descent rule.)
        position: [0, 0, ROOM.halfD - 0.05],
        rotationY: 0,
        label: 'enter the back hall',
        radius: 3.2,
      },
      {
        id: 'shop-to-boardwalk',
        to: 'boardwalk',
        toSpawn: 'fromShop',
        // A screen door in the +X wall — OUT back onto the boardwalk. A sweet
        // surface side-trip (the literal "pizza shop off the coast"), never the
        // way down. The visitor finds it by turning from the sea-window.
        position: [ROOM.halfW - 0.05, 0, 3],
        rotationY: -Math.PI / 2, // +X wall, opening faces -X into the shop
        label: 'step out onto the boardwalk',
        radius: 3,
      },
    ],
  },
  {
    id: 'hallway',
    kind: 'hallway',
    title: 'Back Hall',
    // Long, narrow, low — a corridor, not a maze (3D-Maze red brick).
    dims: { halfW: 2.6, halfD: 16, height: 4, eye: EYE },
    palette: { background: '#150c0c', fog: '#2a0f0f', fogNear: 3, fogFar: 24 },
    // A gallery corridor — Scoobert's covers hung large down both walls (the SM64
    // grammar; Luke: "places throughout, large on the walls with borders").
    paintings: [
      { slug: 'moonlight-beach', position: [2.45, 2.0, 9], rotationY: -Math.PI / 2, size: 1.8 },
      { slug: 'swamis', position: [2.45, 2.0, 3.5], rotationY: -Math.PI / 2, size: 1.8 },
      { slug: 'koan', position: [2.45, 2.0, -6.5], rotationY: -Math.PI / 2, size: 1.8 },
      { slug: 'to-sleep', position: [2.45, 2.0, -11.5], rotationY: -Math.PI / 2, size: 1.8 },
      { slug: 'i', position: [-2.45, 2.0, 9], rotationY: Math.PI / 2, size: 1.8 },
      { slug: 'dragon-ball-sd', position: [-2.45, 2.0, -8.5], rotationY: Math.PI / 2, size: 1.8 },
    ],
    spawns: {
      default: { position: [0, EYE, 12.5], yaw: Math.PI },
      // Arriving from the shop: a step into the hall (clear of the return door's
      // 3.2 radius), facing down the corridor (-Z) toward the music.
      fromShop: { position: [0, EYE, 12.5], yaw: Math.PI },
      // Arriving back from the jukebox: at the far (-Z) end, facing the shop (+Z).
      fromJuke: { position: [0, EYE, -12.5], yaw: 0 },
      // Stepping back out of the classified room: in the hall by the panel,
      // facing on toward the music (clear of the hidden door's radius).
      fromClassified: { position: [0, EYE, -5.5], yaw: Math.PI },
      // Stepping back out of the supply closet: mid-corridor, facing on down toward
      // the music (clear of the +X closet door's radius — narrow hall, so face
      // ALONG it, not at the near wall).
      fromCloset: { position: [0, EYE, 6], yaw: Math.PI },
    },
    // The brass closet key sits on the corridor floor by the +X wall — pocket it
    // to open the SUPPLY door a few steps down. A side reward off the hall, never
    // on the way deeper (friction budget; key + lock in the same room). A cassette
    // rests against the other wall, further down the gallery.
    pickups: [
      { itemId: 'hall-closet-key', position: [1.6, 0.5, 9] },
      { itemId: 'tape-internet', position: [-1.6, 0.7, -3] },
    ],
    doors: [
      {
        id: 'hall-to-shop',
        to: 'shop',
        toSpawn: 'fromHall',
        // Shop end (+Z).
        position: [0, 0, 15.9],
        rotationY: 0,
        label: 'return to the shop',
        radius: 3.2,
      },
      {
        id: 'hall-to-juke',
        to: 'jukebox',
        toSpawn: 'fromHall',
        // Far end (-Z) — where the music's coming from.
        position: [0, 0, -15.9],
        rotationY: Math.PI,
        label: 'follow the music',
        radius: 3.2,
      },
      {
        id: 'hall-to-classified',
        to: 'classified',
        toSpawn: 'fromHall',
        // A blank panel in the left (-X) wall, mid-hall. Hidden until the rat
        // knocks it open (secretRevealed). Faces +X into the corridor.
        position: [-2.5, 0, -2],
        rotationY: Math.PI / 2,
        label: 'slip through the gap',
        hidden: true,
        radius: 2.8,
      },
      {
        id: 'hall-to-closet',
        to: 'closet',
        toSpawn: 'fromHall',
        // A "SUPPLY" door in the +X wall, mid-hall. LOCKED until you pocket the
        // brass key off the corridor floor. Faces -X into the corridor.
        position: [2.5, 0, 4],
        rotationY: -Math.PI / 2,
        label: 'open the SUPPLY closet',
        requiresKey: 'hall-closet-key',
        radius: 2.4,
      },
    ],
  },
  {
    id: 'jukebox',
    kind: 'jukebox',
    title: 'The Jukebox',
    // Taller than the other rooms: headroom for the marquee, and the extra
    // volume makes the payoff room feel like a little shrine.
    dims: { halfW: 6, halfD: 7, height: 5.5, eye: EYE },
    // Warm, dim, womb-like — the payoff room. Deep magenta dark, close fog.
    palette: { background: '#190b1d', fog: '#2a1233', fogNear: 4, fogFar: 28 },
    // The arcade cabinet humming in the corner is procedural now (an <ArcadeCabinet>
    // in JukeboxRoom — a real CRT + joystick, not the old generic GLB).
    // A cassette left on the jukebox's side — fitting that the music room hides one.
    pickups: [{ itemId: 'tape-moonlight', position: [3.6, 0.7, -3] }],
    spawns: {
      // Enter near the door (+Z), a step clear of its radius, facing the jukebox
      // across the room (-Z) so you walk toward it and the song swells.
      default: { position: [0, EYE, 3.5], yaw: Math.PI },
      fromHall: { position: [0, EYE, 3.5], yaw: Math.PI },
      // Stepping back out of the practice room: by the -X stage door, facing into
      // the room (+X), clear of every door radius.
      fromPractice: { position: [-2.5, EYE, 0], yaw: Math.PI / 2 },
      // Climbing back UP from the pool: by the +X stair door, a step clear of its
      // radius, facing into the room (-X).
      fromPool: { position: [2.5, EYE, 0], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'juke-to-hall',
        to: 'hallway',
        toSpawn: 'fromJuke',
        position: [0, 0, 6.95],
        rotationY: 0,
        label: 'back to the hall',
        radius: 3.2,
      },
      {
        id: 'juke-to-practice',
        to: 'practice',
        toSpawn: 'fromJuke',
        // A STAGE DOOR in the -X wall — backstage, where the music gets made.
        position: [-5.95, 0, 0],
        rotationY: Math.PI / 2, // in the -X wall, opening faces +X into the room
        label: 'slip backstage',
        radius: 3.0,
      },
      {
        id: 'juke-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromAbove',
        // A STAIRWELL DOWN in the +X wall — the way deeper is found PAST the music,
        // not back in the shop lobby (Luke's descent rule). The level below.
        position: [5.95, 0, 0],
        rotationY: -Math.PI / 2, // in the +X wall, opening faces -X into the room
        label: 'take the stairs down to the pool',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'practice',
    kind: 'practice',
    title: 'The Practice Room',
    // Backstage from the jukebox shrine: where the music gets MADE — and now where
    // the MAGIC is learned. A warm, SAFE relief room (a "play it" reward, kept
    // sweet) — a wall of pads you can actually play, and the Scroll of Fireball on
    // a stand by the pad wall (find it = earn the spell). Procedural PS1.
    dims: { halfW: 6, halfD: 6, height: 4.5, eye: EYE },
    // Warm amber, cosy — a sibling to the jukebox's womb, deliberately sweet.
    palette: { background: '#1c130a', fog: '#2a1d0e', fogNear: 5, fogFar: 30 },
    // The spell scroll waits on a stand by the pad wall — ahead-and-right as you
    // step in. Pocketing it teaches Fireball (ItemPickup reads item.teachesSpell).
    pickups: [{ itemId: 'fireball-scroll', position: [1.8, 0.95, -1.2] }],
    spawns: {
      // Just inside the +Z door, clear of its radius, facing the pad wall (-Z).
      default: { position: [0, EYE, 2.5], yaw: Math.PI },
      fromJuke: { position: [0, EYE, 2.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'practice-to-juke',
        to: 'jukebox',
        toSpawn: 'fromPractice',
        position: [0, 0, 5.95], // +Z wall — back out to the jukebox
        rotationY: 0,
        label: 'back to the jukebox',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'classified',
    kind: 'classified',
    title: 'Classified',
    // Tiny, cold, claustrophobic — the X-Files file room of rejected demos.
    dims: { halfW: 4, halfD: 4, height: 3.2, eye: EYE },
    palette: { background: '#0a1410', fog: '#0c1812', fogNear: 2, fogFar: 15 },
    // A dead CRT in the corner of the file room (the surveillance tell).
    props: [
      {
        url: '/models/crt-tv.glb',
        position: [-2.5, 0, -2.9],
        fit: 1.2,
        rotationY: 0.6,
        glow: 0.35,
      },
    ],
    spawns: {
      // Just inside the door, facing the cabinets at the back (-Z).
      default: { position: [0, EYE, 0.6], yaw: Math.PI },
      fromHall: { position: [0, EYE, 0.6], yaw: Math.PI },
      // Back out of memory lane: by the -X service door, facing +X into the room,
      // clear of the door radius (and the cabinets, which sit further back in -Z).
      fromMemoryLane: { position: [-1.6, EYE, 0.4], yaw: Math.PI / 2 },
    },
    doors: [
      {
        id: 'classified-to-hall',
        to: 'hallway',
        toSpawn: 'fromClassified',
        position: [0, 0, 3.95],
        rotationY: 0,
        label: 'back out to the hall',
        radius: 2.6,
      },
      // A service hatch behind the filing cabinets — the wing's mouth. Off the main
      // descent; no key (a side branch, never gating the way down).
      {
        id: 'classified-to-memorylane',
        to: 'memorylane',
        toSpawn: 'fromClassified',
        position: [-3.95, 0, 0], // -X wall, mid-room
        rotationY: Math.PI / 2,
        label: 'a hatch into the back wiring',
        radius: 1.8,
      },
    ],
  },
];
