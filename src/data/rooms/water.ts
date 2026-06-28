// src/data/rooms/water.ts — the watery descent below the music: the poolrooms hub,
// the liminal + abandoned-pool GLB levels, the Mobius corridor, the dice pit, the
// two locked side nooks, and the sunken-gallery wing off the pool.
import { EYE, type Room } from './types';

export const WATER_ROOMS: Room[] = [
  {
    id: 'poolrooms',
    kind: 'poolrooms',
    title: 'The Poolrooms',
    // Bigger + a touch lower-ceilinged than the shop; room to skirt the pool.
    dims: { halfW: 9, halfD: 9, height: 4.5, eye: EYE },
    // Pale aqua, over-lit, close-ish fog — liminal is BRIGHT and empty, not dark.
    palette: { background: '#bfe3ea', fog: '#cfe9ef', fogNear: 5, fogFar: 38 },
    // A broken greek statue standing in the false water — vaporwave-liminal.
    // Off-centre so it never blocks the centre door down.
    props: [
      { url: '/models/greek-statue.glb', position: [3.4, 0, -2.6], fit: 3.4, rotationY: -0.6 },
    ],
    spawns: {
      // Arrive on the deck just past the +Z wall (clear of the return door),
      // facing -Z across the still pool toward the far wall.
      default: { position: [0, EYE, 5], yaw: Math.PI },
      // Arriving DOWN the stairs from the jukebox (the level above), on the deck.
      fromAbove: { position: [0, EYE, 5], yaw: Math.PI },
      // Climbing back up out of the liminal level — you surface near the centre
      // door, a step clear of its radius, facing the room (-Z).
      fromLiminal: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Stumbling back out of the looping corridor: by the +X door, facing into
      // the room (-X), clear of every door radius.
      fromMobius: { position: [4.5, EYE, 5], yaw: -Math.PI / 2 },
      // Back out of the dice pit: by the -X door, facing into the room (+X).
      fromDicepit: { position: [-4.5, EYE, 5], yaw: Math.PI / 2 },
      // Surfacing back from the wayside shrine: by the -Z torii door, a step
      // clear of its radius, facing into the room (+Z).
      fromJapan: { position: [0, EYE, -4.5], yaw: 0 },
      // Stepping back out of the staff locker room: by the -X locker door (far
      // end), facing +X into the room, clear of its radius.
      fromLocker: { position: [-4.45, EYE, -5], yaw: Math.PI / 2 },
      // Surfacing back up from the sunken gallery: by the +X gallery door (far
      // end), facing -X into the room, clear of every door radius.
      fromGallery: { position: [4.45, EYE, -5], yaw: -Math.PI / 2 },
    },
    // The rusted locker key rests on the deck — pocket it to open the STAFF ONLY
    // door in the far -X wall. Off the main descent (a side reward), so it never
    // gates the way deeper (friction budget). A cassette sits further along the deck.
    pickups: [
      { itemId: 'pool-locker-key', position: [-3, 0.5, 2] },
      { itemId: 'tape-japan', position: [3.5, 0.7, -2] },
    ],
    doors: [
      {
        id: 'pool-to-juke',
        to: 'jukebox',
        toSpawn: 'fromPool',
        position: [0, 0, 8.95], // +Z wall — back UP the stairs to the music
        rotationY: 0,
        label: 'back up the stairs to the music',
        radius: 3.2,
      },
      // NOTE: there is no down-door here in the lobby. The way DOWN to the liminal
      // is FOUND by going deep into the long corridor (mobius) and breaking the
      // loop — its 'mobius-onward' door drops you down. (Luke's rule: the lobby
      // sends you up; you earn down by going deeper.)
      {
        id: 'pool-to-mobius',
        to: 'mobius',
        toSpawn: 'fromPool',
        position: [8.95, 0, 5], // +X wall, near the entry end
        rotationY: -Math.PI / 2,
        label: 'down the long corridor',
        radius: 3.2,
      },
      {
        id: 'pool-to-dicepit',
        to: 'dicepit',
        toSpawn: 'default',
        position: [-8.95, 0, 5], // -X wall, near the entry end
        rotationY: Math.PI / 2,
        label: 'duck into the back room',
        radius: 3.2,
      },
      {
        id: 'pool-to-locker',
        to: 'lockerroom',
        toSpawn: 'fromPool',
        // The "DEEP END · STAFF ONLY" door in the far end of the -X wall (the
        // dicepit door is the near end). LOCKED until you pick up the rusted key
        // off the deck — a self-contained side puzzle (key + lock one room apart),
        // never on the way down.
        position: [-8.95, 0, -5],
        rotationY: Math.PI / 2, // in the -X wall, opening faces +X into the room
        label: 'open the STAFF ONLY door',
        requiresKey: 'pool-locker-key',
        radius: 3.0,
      },
      {
        id: 'pool-to-japan',
        to: 'shrine',
        toSpawn: 'default',
        // A torii half-sunk in the false water on the far (-Z) wall — HIDDEN
        // until the rat has shown you the building keeps secrets (secretRevealed,
        // same reveal as the classified panel). The country on the other side.
        position: [0, 0, -8.95],
        rotationY: Math.PI,
        label: 'step through the half-sunk torii',
        hidden: true,
        revealOn: 'secret',
        radius: 3.0,
      },
      {
        id: 'pool-to-gallery',
        to: 'gallery',
        toSpawn: 'fromPool',
        // A flooded archway at the far end of the +X wall (the mobius door is the
        // near end) — down into a sunken hall of statuary. A side branch, visible
        // (not hidden) and unlocked: the greek statue in the pool is the wink.
        position: [8.95, 0, -5],
        rotationY: -Math.PI / 2, // +X wall, opening faces -X into the room
        label: 'wade into the sunken gallery',
        radius: 3,
      },
    ],
  },
  {
    id: 'liminal',
    kind: 'liminal',
    title: 'Liminal Space',
    // A real (wide-permission) GLB environment, crunched + lazy-loaded behind the
    // loader minigame. Provenance tracked in THIRD_PARTY_NOTICES.md.
    glb: {
      url: '/models/liminal-other-space.glb',
      fit: 18,
      // If the model fails to load, send the player back up to the pool.
      recoverTo: { to: 'poolrooms', spawn: 'fromLiminal' },
    },
    // You rode the waterfall down — water drips from this ceiling (CeilingDrips).
    drips: true,
    dims: { halfW: 8.5, halfD: 8.5, height: 6, eye: EYE },
    // Pale beige nothing — the backrooms register.
    palette: { background: '#d6cfb8', fog: '#d6cfb8', fogNear: 6, fogFar: 34 },
    spawns: {
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromPool: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Climbing back up out of the abandoned pool — by the -Z door, facing +Z.
      fromDeep: { position: [0, EYE, -4.5], yaw: 0 },
      // Back out of the overgrown Grassrooms — by the -X door, facing +X into the
      // beige nothing, clear of every door radius.
      fromGrass: { position: [-4.5, EYE, 0], yaw: Math.PI / 2 },
    },
    // A couple of wanderers drift the beige nothing — they emerge from the fog and
    // dance when you reach them (the relief beat).
    entities: [
      { id: 'liminal-blob', body: 'blob', spawn: [-3.5, -2] },
      { id: 'liminal-mop', body: 'mop', spawn: [3.5, -4] },
    ],
    doors: [
      {
        id: 'liminal-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromLiminal',
        position: [0, 0, 8.45], // +Z wall (dims.halfD)
        rotationY: 0,
        label: 'back up to the pool',
        radius: 3.2,
      },
      {
        id: 'liminal-to-deep',
        to: 'deeppool',
        toSpawn: 'fromLiminal',
        position: [0, 0, -8.45], // far (-Z) wall — deeper still (GLB → GLB)
        rotationY: Math.PI,
        label: 'go down to the deep end',
        radius: 3.2,
      },
      {
        id: 'liminal-to-grass',
        to: 'grassrooms',
        toSpawn: 'fromLiminal',
        // A side door in the -X wall — visible (not hidden), a SWEET breather you
        // FIND by wandering the beige nothing: step through and the backrooms have
        // gone to grass + open sky. Off the descent, so no key gates it.
        position: [-8.45, 0, 0],
        rotationY: Math.PI / 2, // -X wall, opening faces +X into the room
        label: 'push through the overgrown door',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'grassrooms',
    kind: 'grassrooms',
    title: 'The Grassrooms',
    // A low-ceilinged white interior gone to grass (the photo's vibe). Wide enough
    // to wander the pillars; the central skylight breaks the low ceiling open.
    dims: { halfW: 9, halfD: 9, height: 4.2, eye: EYE },
    // Soft warm-white interior haze — bright, airy, endless-feeling fog.
    palette: { background: '#eef1ea', fog: '#eef1ea', fogNear: 6, fogFar: 40 },
    // The space owns its own audio (wind pad + furin chimes off the indoor trees);
    // the carried jukebox voice fades out (RoomEnvironment). A SWEET relief beat.
    musicRoom: true,
    spawns: {
      // Step in from the liminal at the +Z end, a clear stride from the return
      // door, facing -Z into the grass under the skylight.
      default: { position: [0, EYE, 5], yaw: Math.PI },
      fromLiminal: { position: [0, EYE, 5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'grass-to-liminal',
        to: 'liminal',
        toSpawn: 'fromGrass',
        position: [0, 0, 8.9], // +Z wall — back into the empty backrooms
        rotationY: 0,
        label: 'back into the empty backrooms',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'deeppool',
    kind: 'liminal',
    title: 'The Abandoned Pool',
    // The bitter bottom of the water descent — a heavy (52 MB → 5 MB crunched)
    // GLB environment, lazy-loaded behind the loader minigame (this is the load
    // the minigame earns its keep on). A GLB → GLB hop down from the liminal.
    glb: {
      url: '/models/abandoned-pool.glb',
      fit: 22,
      recoverTo: { to: 'liminal', spawn: 'fromDeep' },
    },
    drips: true, // still dripping, deeper down
    dims: { halfW: 9, halfD: 9, height: 6.5, eye: EYE },
    // Cold drained teal-black — the deep end, lights long dead.
    palette: { background: '#0a1518', fog: '#0e1c1f', fogNear: 5, fogFar: 30 },
    spawns: {
      default: { position: [0, EYE, 5], yaw: Math.PI },
      fromLiminal: { position: [0, EYE, 5], yaw: Math.PI },
    },
    // One lurker haunts the drained deep end — slower, a single big eye.
    entities: [{ id: 'deep-lurker', body: 'lurker', spawn: [-2, -3], speed: 1.6 }],
    doors: [
      {
        id: 'deep-to-liminal',
        to: 'liminal',
        toSpawn: 'fromDeep',
        position: [0, 0, 8.95], // +Z wall
        rotationY: 0,
        label: 'climb back up',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'mobius',
    kind: 'mobius',
    title: 'The Long Corridor',
    // A long narrow hall — the Scooby-Doo loop. Walk to the far door and you come
    // out the near one, the same corridor scrolling by (toSpawn 'loop' re-enters
    // at the start). Always a way out: turn around, the way back is right there.
    dims: { halfW: 2.6, halfD: 14, height: 4, eye: EYE },
    // Faded motel green — nostalgic, OVER-lit, a beat wrong (bright is the comic
    // register). MobiusRoom dims it and tightens the dressing as unease rises.
    palette: { background: '#3a4630', fog: '#4a573a', fogNear: 6, fogFar: 40 },
    // A real Möbius strip turning mid-corridor — the album motif made literal.
    // Glows so it reads against the dim corridor.
    props: [
      { url: '/models/mobius-strip.glb', position: [0, 2.3, -2], fit: 1.8, spin: 0.5, glow: 0.55 },
    ],
    spawns: {
      // Fresh arrival from the pool, AND the loop re-entry, both land at the +Z
      // start facing -Z down the corridor — so a forward lap drops you right back
      // here. MobiusRoom tells them apart by the spawn id (fresh resets the lap
      // count; 'loop' counts another lap), not the pose.
      default: { position: [0, EYE, 10], yaw: Math.PI },
      fromPool: { position: [0, EYE, 10], yaw: Math.PI },
      loop: { position: [0, EYE, 10], yaw: Math.PI },
    },
    doors: [
      {
        id: 'mobius-out',
        to: 'poolrooms',
        toSpawn: 'fromMobius',
        position: [0, 0, 13.9], // +Z (start) end — the way back, always there
        rotationY: 0,
        label: 'go back to the pool',
        radius: 3.2,
      },
      {
        id: 'mobius-loop',
        to: 'mobius',
        toSpawn: 'loop',
        position: [0, 0, -13.9], // far (-Z) end — walk forward → loop to the start
        rotationY: Math.PI,
        label: 'keep going',
        radius: 3.2,
      },
      {
        id: 'mobius-onward',
        to: 'liminal',
        toSpawn: 'fromPool',
        // A door in the -X wall near the far end that ISN'T there until the loop
        // breaks (MOBIUS_BREAK laps) — then the wall opens onto a stair DOWN to the
        // liminal. This is the level's way down: you FIND it by going deep into the
        // corridor and breaking the loop, not from the pool lobby (Luke's rule).
        // The "walk far enough and the floor drops away" beat.
        position: [-2.5, 0, -9],
        rotationY: Math.PI / 2,
        label: 'step through the door that wasn’t there',
        hidden: true,
        revealOn: 'mobius',
        radius: 2.8,
      },
    ],
  },
  {
    id: 'dicepit',
    kind: 'dicepit',
    title: 'The Back Room',
    // A dim felt-and-stone gambling nook. Big enough to walk AROUND the monster
    // once it bloats to its stuck size; tall enough it never bursts the ceiling.
    dims: { halfW: 6, halfD: 6, height: 5.5, eye: EYE },
    // Warm dark plum — a back-room card table, the opposite of the bright pool.
    palette: { background: '#1a1018', fog: '#241620', fogNear: 4, fogFar: 26 },
    spawns: {
      // Just inside the +Z door, facing -Z toward the table + the thing.
      default: { position: [0, EYE, 2.5], yaw: Math.PI },
      fromPool: { position: [0, EYE, 2.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'dicepit-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromDicepit',
        position: [0, 0, 5.9], // +Z wall
        rotationY: 0,
        label: 'back out to the pool',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'lockerroom',
    kind: 'lockerroom',
    title: 'Staff Locker Room',
    // The little reward behind the poolrooms' locked STAFF ONLY door: a damp,
    // tiled changing room, lights half-dead. A SAFE side nook (off the descent),
    // so it stays sweet — the payoff for noticing the key, not a dread beat. On
    // first entry the room hums you a soft chord and tips a little luck (the
    // reward IS sound; the clap-ritual luck faucet's quiet cousin).
    dims: { halfW: 5, halfD: 5, height: 3.2, eye: EYE },
    // Pale poolside teal gone dim + enclosed — a sibling of the bright poolrooms.
    palette: { background: '#16302f', fog: '#1b3a38', fogNear: 3, fogFar: 18 },
    spawns: {
      // A clear stride in from the +Z door (radius 2.6), facing -Z at the lockers.
      default: { position: [0, EYE, 1.4], yaw: Math.PI },
      fromPool: { position: [0, EYE, 1.4], yaw: Math.PI },
    },
    doors: [
      {
        id: 'locker-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromLocker',
        position: [0, 0, 4.95], // +Z wall — back out to the pool deck
        rotationY: 0,
        label: 'back out to the pool',
        radius: 2.6,
      },
    ],
  },
  {
    id: 'closet',
    kind: 'closet',
    title: 'Supply Closet',
    // The little reward behind the hallway's locked SUPPLY door: a cramped utility
    // cupboard — shelves, a mop bucket, a forgotten tip jar. Safe side nook (off
    // the descent); first entry hums a chord + tips luck (ClosetRoom).
    dims: { halfW: 3.5, halfD: 3.5, height: 3, eye: EYE },
    // Dim dusty amber — a back-of-house cupboard.
    palette: { background: '#1c160e', fog: '#241d12', fogNear: 3, fogFar: 16 },
    spawns: {
      // A clear stride in from the +Z door (radius 2.4), facing -Z at the shelves.
      default: { position: [0, EYE, 0.6], yaw: Math.PI },
      fromHall: { position: [0, EYE, 0.6], yaw: Math.PI },
    },
    doors: [
      {
        id: 'closet-to-hall',
        to: 'hallway',
        toSpawn: 'fromCloset',
        position: [0, 0, 3.4], // +Z wall — back out to the corridor
        rotationY: 0,
        label: 'back out to the hall',
        radius: 2.4,
      },
    ],
  },
  {
    id: 'gallery',
    kind: 'gallery',
    title: 'The Sunken Gallery',
    dims: { halfW: 10, halfD: 10, height: 6, eye: EYE },
    // Submerged museum teal — dim, close-ish fog, statues looming out of the murk.
    palette: { background: '#0f2e34', fog: '#123c42', fogNear: 5, fogFar: 36 },
    drips: true, // it's flooded — water drips from the vaulted dark
    song: 'underwater',
    // A colonnade of crunched greek columns (doric + ionic alternating) down both
    // sides, a sculpture on the centre line, a broken statue + amphorae in the
    // murk. All lazy GLB props (each its own Suspense) — provenance in
    // THIRD_PARTY_NOTICES.md. The IP-flagged trove models are NOT used.
    props: [
      { url: '/models/ionic-column.glb', position: [-5.5, 0, -6], fit: 5.2 },
      { url: '/models/greek-doric-column.glb', position: [5.5, 0, -6], fit: 5.2 },
      { url: '/models/ionic-column.glb', position: [-5.5, 0, 0], fit: 5.2 },
      { url: '/models/greek-doric-column.glb', position: [5.5, 0, 0], fit: 5.2 },
      { url: '/models/ionic-column.glb', position: [-5.5, 0, 6], fit: 5.2 },
      { url: '/models/greek-doric-column.glb', position: [5.5, 0, 6], fit: 5.2 },
      {
        url: '/models/classical-greek-sculpture.glb',
        position: [0, 0, -3.5],
        fit: 3.6,
        rotationY: Math.PI,
      },
      { url: '/models/greek-statue.glb', position: [-2.8, 0, 2.5], fit: 3.2, rotationY: 0.5 },
      { url: '/models/greek-jar.glb', position: [3, 0, 3.5], fit: 1.4, rotationY: -0.4 },
      { url: '/models/greek-jar.glb', position: [2.2, 0, -7], fit: 1.2, rotationY: 0.8 },
    ],
    spawns: {
      // Wade in from the poolrooms at the +Z end, facing -Z down the colonnade
      // toward the light at the far end. Clear of the +Z return door.
      default: { position: [0, EYE, 5.5], yaw: Math.PI },
      fromPool: { position: [0, EYE, 5.5], yaw: Math.PI },
      // Back from the daydream: at the -Z end, facing +Z back up the hall.
      fromDaydream: { position: [0, EYE, -5.5], yaw: 0 },
    },
    doors: [
      {
        id: 'gallery-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromGallery',
        position: [0, 0, 9.9], // +Z — back up to the poolrooms
        rotationY: 0,
        label: 'wade back up to the poolrooms',
        radius: 3.2,
      },
      {
        id: 'gallery-to-daydream',
        to: 'daydream',
        toSpawn: 'fromGallery',
        position: [0, 0, -9.9], // -Z far end — toward the light
        rotationY: Math.PI,
        label: 'step toward the light',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'daydream',
    kind: 'daydream',
    title: 'Daydream',
    dims: { halfW: 9, halfD: 9, height: 8, eye: EYE },
    // Pastel watercolor sky — soft lavender, bright, far gentle fog. The sweet
    // breather after the murk (taste guardrail: the contrast is the point).
    palette: { background: '#c4b6ea', fog: '#dccff4', fogNear: 9, fogFar: 64 },
    song: 'watercolor-sky',
    spawns: {
      // Surface onto the cloud deck, facing out into the pastel haze (-Z), clear
      // of the +Z door back down into the gallery.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromGallery: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'daydream-to-gallery',
        to: 'gallery',
        toSpawn: 'fromDaydream',
        position: [0, 0, 8.95], // +Z — back down into the gallery
        rotationY: 0,
        label: 'back down into the gallery',
        radius: 3.2,
      },
    ],
  },
];
