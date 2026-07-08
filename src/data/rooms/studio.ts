// src/data/rooms/studio.ts — THE BASEMENT SESSIONS: a recording-studio wing off
// the practice room (deeper backstage, where the music actually gets MADE). A hub
// LIVE ROOM you can play (a drum kit + a keyboard), branching to the CONTROL ROOM
// (mixing desk + tape machines) → the TAPE VAULT (collectible master demos), and a
// sweet LOUNGE breather off the live room. Surface-sweet, taste-safe. The two
// "playing" rooms ring with music (Room.song); the two "working" rooms (mix desk
// + archive) stay hushed so their tracks remain jukebox seeds you collect as
// master tapes. The entrance door is added to the practice room in core.ts
// (practice-to-studio + a fromStudio spawn).
import { EYE, type Room } from './types';

export const STUDIO_ROOMS: Room[] = [
  {
    id: 'liveroom',
    kind: 'liveroom',
    title: 'The Live Room',
    // The biggest studio room — headroom + floor for the kit and the keys.
    dims: { halfW: 7, halfD: 7, height: 4.5, eye: EYE },
    // Cosy basement dark, warm amber from a couple of practice lamps — a sibling to
    // the jukebox womb, deliberately sweet (it's where the records are tracked).
    palette: { background: '#140f0a', fog: '#1d150d', fogNear: 5, fogFar: 30 },
    // "Mystery Machine" tracked here — the band's van made into a song.
    song: 'mystery-machine',
    spawns: {
      // Step down from the practice room at the +Z door, facing -Z into the room
      // (the kit + keys are along the far -Z wall). Clear of the +Z door (r3.2).
      default: { position: [0, EYE, 3.5], yaw: Math.PI },
      fromPractice: { position: [0, EYE, 3.5], yaw: Math.PI },
      // Back in from the control room (-X door): by that wall, facing +X into the
      // room, a step clear of the door radius (3.0).
      fromControl: { position: [-3.5, EYE, 0], yaw: Math.PI / 2 },
      // Back in from the lounge (+X door): by that wall, facing -X into the room.
      fromLounge: { position: [3.5, EYE, 0], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'liveroom-to-practice',
        to: 'practice',
        toSpawn: 'fromStudio',
        position: [0, 0, 6.95], // +Z — back up to the practice room
        rotationY: 0,
        label: 'back up to the practice room',
        radius: 3.2,
      },
      {
        id: 'liveroom-to-control',
        to: 'controlroom',
        toSpawn: 'fromLive',
        position: [-6.95, 0, 0], // -X wall, opening faces +X into the room
        rotationY: Math.PI / 2,
        label: 'into the control room',
        radius: 3.0,
      },
      {
        id: 'liveroom-to-lounge',
        to: 'lounge',
        toSpawn: 'fromLive',
        position: [6.95, 0, 0], // +X wall, opening faces -X into the room
        rotationY: -Math.PI / 2,
        label: 'into the lounge',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'controlroom',
    kind: 'controlroom',
    title: 'The Control Room',
    // Narrower — a console room, a window through to the live room.
    dims: { halfW: 6, halfD: 5, height: 3.6, eye: EYE },
    // Cool console dark washed in meter-glow — bluish, dim, focused.
    palette: { background: '#0c1016', fog: '#121823', fogNear: 4, fogFar: 26 },
    // No forced Room.song: this is the MIXING room — faders down, you monitor
    // whatever you carried in. "Information" stays a jukebox seed (always on the
    // dial); its master tape is collectible next door in the vault.
    spawns: {
      // In from the live room (+X door): by that wall, facing -X toward the desk on
      // the far -X side. Clear of the +X door (r3.0).
      default: { position: [2.5, EYE, 0], yaw: -Math.PI / 2 },
      fromLive: { position: [2.5, EYE, 0], yaw: -Math.PI / 2 },
      // Back up from the tape vault (-Z door): facing +Z into the room, clear of the
      // door radius (2.8).
      fromVault: { position: [0, EYE, -2], yaw: 0 },
    },
    doors: [
      {
        id: 'control-to-liveroom',
        to: 'liveroom',
        toSpawn: 'fromControl',
        position: [5.95, 0, 0], // +X wall, opening faces -X into the room
        rotationY: -Math.PI / 2,
        label: 'back into the live room',
        radius: 3.0,
      },
      {
        id: 'control-to-vault',
        to: 'tapevault',
        toSpawn: 'fromControl',
        position: [0, 0, -4.95], // -Z wall — into the archive
        rotationY: Math.PI,
        label: 'into the tape vault',
        radius: 2.8,
      },
    ],
  },
  {
    id: 'tapevault',
    kind: 'tapevault',
    title: 'The Tape Vault',
    // Small, dusty, archival — shelves of reels and the master demos.
    dims: { halfW: 5, halfD: 5, height: 3.4, eye: EYE },
    // Dim amber-brown, motes in the lamp — a warm archive, not a cold one.
    palette: { background: '#100c08', fog: '#1a140c', fogNear: 4, fogFar: 22 },
    // No forced Room.song: a hushed archive (just the shelves + the lamp-hum) — the
    // contrast against the ringing live room. The music here is what you COLLECT:
    // "1101" stays a jukebox seed, and its master tape sits on these very shelves.
    // The MASTER TAPES: pocket one and the unreleased demo plays (the music ladder's
    // "find it = hear it" reward) + it joins the lost-cassettes collectathon.
    pickups: [
      { itemId: 'tape-information', position: [-3.2, 0.9, -1.5] },
      { itemId: 'tape-1101', position: [0, 0.9, -3.2] },
      { itemId: 'tape-jolly-roger-bay', position: [3.2, 0.9, -1.5] },
    ],
    spawns: {
      // In from the control room (+Z door), facing -Z down the shelves. Clear of the
      // door radius (2.8).
      default: { position: [0, EYE, 2], yaw: Math.PI },
      fromControl: { position: [0, EYE, 2], yaw: Math.PI },
      // Back up from the Listening Room (-X door): facing +X into the vault, clear
      // of both visible door radii (listening r2.6 at x -4.95; control r2.8 at +Z).
      fromListening: { position: [-1.8, EYE, 1.5], yaw: Math.PI / 2 },
    },
    doors: [
      {
        id: 'vault-to-control',
        to: 'controlroom',
        toSpawn: 'fromVault',
        position: [0, 0, 4.95], // +Z — back to the control room
        rotationY: 0,
        label: 'back to the control room',
        radius: 2.8,
      },
      {
        // Into the LISTENING ROOM (視聴室) — the museum wing: the vault archives
        // the masters, next door CURATES them. On the -X wall, forward of the -X
        // shelf (the shelf spans z ≈ -2.95..-0.05; the door frame sits at z 1.5).
        id: 'vault-to-listening',
        to: 'listening',
        toSpawn: 'default',
        position: [-4.95, 0, 1.5], // -X wall, opening faces +X into the vault
        rotationY: Math.PI / 2,
        label: 'into the listening room',
        radius: 2.6,
      },
      {
        // THE 1101 LEVEL DOOR (Luke, 2026-07): pocket the "1101" master reel (the
        // pickup on the -Z shelf) and a doorway hums open in the back wall behind
        // it — step through into the full-screen text-adventure LEVEL ("1101 / Save
        // San Diego," public/1101.html). opensLevel raises the overlay in place
        // instead of wiping to a room. revealSecret is DURABLE (you found the ARG —
        // it stays found), fired by collecting tape-1101 (items.ts revealsSecret).
        id: 'vault-to-1101',
        to: 'tapevault', // conceptual origin (the level overlays in place)
        position: [0, 0, -4.95], // -Z back wall, behind the 1101 reel
        rotationY: Math.PI, // opening faces +Z into the room
        label: 'step into the transmission',
        radius: 3,
        hidden: true,
        revealSecret: 'save-san-diego',
        opensLevel: 'save-san-diego',
      },
    ],
  },
  {
    id: 'listening',
    kind: 'listening',
    title: 'The Listening Room',
    // THE MUSEUM WING (視聴室) — a long, hushed gallery nave off the Tape Vault:
    // one framed exhibit per catalog track down each long wall (cover art + a
    // placard: title · year · meaning). A song you haven't FOUND yet hangs as an
    // empty "???" frame (the collection you're still assembling — the itch); a
    // RESTORED one wears a gold HI-FI chip. Click a discovered exhibit and it
    // plays (and becomes your station) — a museum where every piece is playable.
    dims: { halfW: 5.5, halfD: 9.5, height: 3.8, eye: EYE },
    // Deep museum dusk — cool violet-dark, long sightline (the fog opens so the
    // far frames read as a receding colonnade of little lights).
    palette: { background: '#0f0d12', fog: '#171420', fogNear: 5, fogFar: 30 },
    // No Room.song and NOT a musicRoom: the exhibits themselves are the sound —
    // a musicRoom would fade the very track a clicked frame just started.
    spawns: {
      // In from the vault (-Z door), facing +Z down the nave of exhibits.
      default: { position: [0, EYE, -6.3], yaw: 0 },
    },
    doors: [
      {
        id: 'listening-to-vault',
        to: 'tapevault',
        toSpawn: 'fromListening',
        position: [0, 0, -9.45], // -Z end wall — back into the archive
        rotationY: Math.PI,
        label: 'back into the tape vault',
        radius: 2.8,
      },
    ],
  },
  {
    id: 'lounge',
    kind: 'lounge',
    title: 'The Lounge',
    // A sweet breather off the live room: couch, lava lamp, a CRT, the napping rat.
    dims: { halfW: 5, halfD: 5, height: 3.4, eye: EYE },
    // Warm, soft, cosy — the most relaxed room in the building (a relief beat).
    palette: { background: '#16100c', fog: '#231811', fogNear: 5, fogFar: 26 },
    // "Jolly Roger Bay" — a chill, watery deep cut for the put-your-feet-up room.
    song: 'jolly-roger-bay',
    // The lounge TV plays a SESSION clip: "Finding SD" (the album written, recorded,
    // mixed + mastered in a single day) — the studio's own mythology on the screen.
    tv: { albumSlug: 'finding-sd', position: [4.7, 0, -2], rotationY: -Math.PI / 2 },
    spawns: {
      // In from the live room (-X door): by that wall, facing +X into the lounge.
      // Clear of the door radius (2.8).
      default: { position: [-2, EYE, 0], yaw: Math.PI / 2 },
      fromLive: { position: [-2, EYE, 0], yaw: Math.PI / 2 },
    },
    doors: [
      {
        id: 'lounge-to-liveroom',
        to: 'liveroom',
        toSpawn: 'fromLounge',
        position: [-4.95, 0, 0], // -X wall, opening faces +X into the room
        rotationY: Math.PI / 2,
        label: 'back into the live room',
        radius: 2.8,
      },
    ],
  },
];
