// src/data/rooms/japan.ts — the shrine breather and what it opens onto: the tall
// grass + goblin battle + grove + Frutiger pocket, and the undersea metro line down
// to the end-of-the-line terminus.
import { EYE, type Room } from './types';

export const JAPAN_ROOMS: Room[] = [
  {
    id: 'shrine',
    kind: 'shrine',
    musicRoom: true, // the furin breather owns the space — the carried song fades out here
    title: 'Wayside Shrine',
    // The one OUTDOOR, *sweet* deep room — a rural dusk: a torii path, a little
    // shrine, a country railway crossing. A breather among the bitter depths
    // (taste guardrail: the contrast is the point). Procedural scaffold for now;
    // the tracks run off into the fog toward a future metro-tunnel GLB hookup
    // (Luke: "connect to the tunnel GLB cuz of trains"). Reached via the hidden
    // torii in the poolrooms — discovered, not on the main path.
    dims: { halfW: 11, halfD: 15, height: 9, eye: EYE },
    // Warm hazy golden-hour; fog dissolves the open edges so no walls are needed.
    palette: { background: '#e6c08a', fog: '#e6c08a', fogNear: 8, fogFar: 58 },
    spawns: {
      // Step out from under the entrance torii at the near (+Z) end, facing down
      // the path (-Z) toward the shrine. Clear of the return door's 3.2 radius.
      default: { position: [0, EYE, 11], yaw: Math.PI },
      fromPool: { position: [0, EYE, 11], yaw: Math.PI },
      // Climbing back up out of the metro tunnel — beside the +X portal where the
      // tracks go under, a step clear of its door radius, facing back into the
      // room (-X) toward the shrine.
      fromTunnel: { position: [6.8, EYE, 2], yaw: -Math.PI / 2 },
      // Coming back in from the tall grass — beside the -X torii, a step clear of
      // its door radius, facing +X back into the shrine grounds.
      fromGrass: { position: [-6.8, EYE, 6], yaw: Math.PI / 2 },
    },
    doors: [
      {
        id: 'shrine-to-pool',
        to: 'poolrooms',
        toSpawn: 'fromJapan',
        position: [0, 0, 14.95], // +Z (entrance) wall — back through the torii
        rotationY: 0,
        label: 'step back through the torii',
        radius: 3.2,
      },
      {
        id: 'shrine-to-tunnel',
        to: 'metro-tunnel',
        toSpawn: 'fromShrine',
        // The +X end of the level crossing, where the rails run underground —
        // follow them down into the metro tunnel (Luke: "connect to the tunnel
        // cuz of trains"). The shrine breather's one way DEEPER. The portal
        // geometry that frames this sits at the same spot in ShrineRoom.
        position: [10.6, 0, 2], // TRACK_Z = 2 in ShrineRoom
        rotationY: -Math.PI / 2, // in the +X wall, opening faces -X into the room
        label: 'follow the tracks into the tunnel',
        radius: 3.2,
      },
      {
        id: 'shrine-to-grass',
        to: 'grassfield',
        toSpawn: 'fromShrine',
        // A little vermilion torii on the open -X side frames a path off into an
        // overgrown field. NOT hidden — once you've found the shrine, the grass
        // (and the wild thing in it) is an easy step away (Luke: "shouldn't be
        // that hard to get a goblin fight").
        position: [-10.6, 0, 6],
        rotationY: Math.PI / 2, // in the -X edge, opening faces +X into the room
        label: 'wander into the tall grass',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'grassfield',
    kind: 'grass',
    title: 'The Tall Grass',
    // An overgrown lot off the shrine's torii (Luke: "it's off the torii gates").
    // Knee-high grass you wade through under the same golden-hour haze as the
    // shrine — and sometimes it rustles and a wild GOBLIN leaps out (the
    // dice-filtered encounter; DiceMonster + the d20 roll-off, screen-to-black
    // Pokémon-style). A SWEET surface space (taste guardrail): goofy grass, the
    // ambush is a game, losing never hard-fails. Winning opens a new room.
    dims: { halfW: 14, halfD: 16, height: 9, eye: EYE },
    palette: { background: '#e6c08a', fog: '#d8b87f', fogNear: 7, fogFar: 46 },
    spawns: {
      // Step out from under the torii at the +Z (shrine) end, facing into the
      // field (-Z), a step clear of the return door's radius.
      default: { position: [0, EYE, 11.5], yaw: Math.PI },
      fromShrine: { position: [0, EYE, 11.5], yaw: Math.PI },
      // Back in the field's heart after a lost/fled battle — a beat to breathe
      // before the grass can rustle again.
      fromBattle: { position: [0, EYE, 2], yaw: Math.PI },
      // Stepping back out of the hidden grove.
      fromGrove: { position: [0, EYE, 5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'grass-to-shrine',
        to: 'shrine',
        toSpawn: 'fromGrass',
        position: [0, 0, 15.5], // +Z (entrance) torii — back to the shrine grounds
        rotationY: 0,
        label: 'step back through the torii',
        radius: 3.2,
      },
      {
        id: 'grass-to-grove',
        to: 'grove',
        toSpawn: 'default',
        // Opens FOR GOOD once you've beaten the grass goblin (the 'grass-cleared'
        // unlock) — a trodden path at the field's far edge, so the new room is
        // durably yours, not a one-shot you can only reach by re-fighting.
        position: [0, 0, -15.5], // -Z far edge of the field
        rotationY: Math.PI, // faces +Z back into the field
        label: 'take the opened path to the grove',
        hidden: true,
        revealSecret: 'grass-cleared',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'grassbattle',
    kind: 'grassbattle',
    title: 'A Wild Goblin!',
    // The Pokémon beat: the grass rustled and a wild GOBLIN leapt out. You're
    // dropped here (via the screen-to-black room fade) to roll the d20 against it —
    // the SAME dice-monster as the pit (shared monsterStore; it's the one goblin,
    // bigger every time it wins). Win → a path opens (the grove). Lose/flee → back
    // to the field, no penalty (taste guardrail: losing never hard-fails).
    dims: { halfW: 9, halfD: 10, height: 8, eye: EYE },
    palette: { background: '#c9a765', fog: '#b08f51', fogNear: 6, fogFar: 30 },
    spawns: {
      // Facing the goblin across the trampled grass.
      default: { position: [0, EYE, 5.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'battle-flee',
        to: 'grassfield',
        toSpawn: 'fromBattle',
        position: [0, 0, 9.4], // behind you — turn tail and bolt back into the field
        rotationY: 0,
        label: 'flee back into the grass',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'grove',
    kind: 'grove',
    musicRoom: true, // the sound garden owns the space — the carried song fades out here
    title: 'The Hidden Grove',
    // The reward for beating the goblin (Luke: "winning gives you a new room"). A
    // hush after the bright field — dusk settling cool and blue, a single glowing
    // thing at the centre, and the reward-is-sound spine: a soft chord on arrival.
    dims: { halfW: 8, halfD: 9, height: 8, eye: EYE },
    palette: { background: '#33514c', fog: '#27433f', fogNear: 5, fogFar: 30 },
    spawns: {
      // A clear stride past the +Z door you arrive through (radius 3.0), facing
      // -Z into the sound garden toward the painting — never standing ON the exit.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Stepping back out of the bright vista — past the orb at the far end,
      // facing +Z back across the sound garden, clear of the door radius.
      fromFrutiger: { position: [0, EYE, -5], yaw: 0 },
    },
    doors: [
      {
        id: 'grove-to-grass',
        to: 'grassfield',
        toSpawn: 'fromGrove',
        position: [0, 0, 8.4],
        rotationY: 0,
        label: 'leave the grove',
        radius: 3.0,
      },
      {
        id: 'grove-to-frutiger',
        to: 'frutiger',
        toSpawn: 'default',
        // Past the sound garden, at the grove's far end: an album-cover PAINTING you
        // DIVE INTO (the SM64 portal) — the deeper reward beyond the reward (the
        // Frutiger pocket), earned by clearing the goblin. The cover lunges at you
        // as you step through (CoverArt.FramedCover, Doors.tsx).
        position: [0, 0, -8.4],
        rotationY: Math.PI,
        label: 'dive into the painting',
        // Moonlight Beach — its cover matches the glossy beach-paradise behind it,
        // and diving plays its track (Ocean View) as the world's soundtrack.
        albumSlug: 'moonlight-beach',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'frutiger',
    kind: 'frutiger',
    title: 'Aqua Hill',
    // The Frutiger Aero pocket (Luke, 2026-06-22: "frutiger levels") — an
    // impossibly optimistic glossy-2008 hillside found through a too-clean door in
    // the beige backrooms: blue sky, puffy clouds, rolling green Bliss hills, a low
    // sun + lens flare, floating glossy aqua bubbles, and a serene gel "media-
    // player creature." The ONE zone where the PS1 crunch is LIFTED (Luke's call):
    // it renders clean + glossy (FrutigerRoom bumps the pixel ratio while mounted),
    // the sweet opposite of the wrong depths next door — the contrast is the point.
    dims: { halfW: 14, halfD: 14, height: 16, eye: EYE },
    palette: { background: '#86c5ef', fog: '#cfe8fb', fogNear: 18, fogFar: 95 },
    // A CRT on the hillside plays Moonlight Beach's videos — the album whose cover
    // is the painting you dove through to get here (its track is already playing).
    tv: { position: [5.5, 0, 5], rotationY: 0.5, albumSlug: 'moonlight-beach' },
    spawns: {
      // Step out onto the hillside a clear stride past the +Z (door) end (radius
      // 3.2), facing -Z down the slope into the open blue vista — not standing in
      // the return door's prompt the instant you dive through.
      default: { position: [0, EYE, 9.5], yaw: Math.PI },
      fromGrove: { position: [0, EYE, 9.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'frutiger-to-grove',
        to: 'grove',
        toSpawn: 'fromFrutiger',
        position: [0, 0, 13.5], // +Z wall — back through into the grove
        rotationY: 0,
        label: 'back through into the grove',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'metro-tunnel',
    kind: 'metro',
    title: 'Metro Tunnel',
    // Deeper than the sweet shrine breather: the country tracks run underground
    // into an abandoned transit tunnel — a real (wide-permission) GLB level,
    // crunched (46 MB → 1.4 MB) + lazy-loaded behind the loader minigame, like
    // the abandoned pool. Provenance in THIRD_PARTY_NOTICES.md. Reached by
    // following the shrine's rails (Luke: "connect to the tunnel cuz of trains").
    glb: {
      url: '/models/metro-tunnel.glb',
      fit: 26,
      // If the model fails to load, send the player back up to the shrine.
      recoverTo: { to: 'shrine', spawn: 'fromTunnel' },
    },
    drips: true, // underground damp, deep down — the flooded undersea tunnel
    dims: { halfW: 9, halfD: 12, height: 6.5, eye: EYE },
    // Cold dead-transit dark, tinted deep-sea teal — the Seikan is UNDERSEA, so
    // this is where the line meets the water (MetroTunnelFx floods the floor).
    palette: { background: '#08161c', fog: '#0b2630', fogNear: 5, fogFar: 28 },
    spawns: {
      // Arrive at the +Z mouth, facing -Z down the length of the tunnel.
      default: { position: [0, EYE, 8.5], yaw: Math.PI },
      fromShrine: { position: [0, EYE, 8.5], yaw: Math.PI },
      // Climbing back UP the line from the terminus — by the -Z end door, facing
      // +Z back up the tunnel toward the shrine.
      fromEnd: { position: [0, EYE, -8.5], yaw: 0 },
    },
    // Something shuffles along the flooded platform.
    entities: [{ id: 'tunnel-mop', body: 'mop', spawn: [-3, -1], speed: 1.8 }],
    doors: [
      {
        id: 'tunnel-to-shrine',
        to: 'shrine',
        toSpawn: 'fromTunnel',
        position: [0, 0, 11.9], // +Z wall — climb back up to the surface crossing
        rotationY: 0,
        label: 'climb back up to the shrine',
        radius: 3.2,
      },
      {
        id: 'tunnel-to-end',
        to: 'terminus',
        toSpawn: 'fromTunnel',
        // The far (-Z) end, where the rails run off into the fog — follow the
        // line to where it stops. The tunnel's one way DEEPER.
        position: [0, 0, -11.9],
        rotationY: Math.PI, // in the -Z wall, opening faces +Z into the tunnel
        label: 'follow the tracks to the end of the line',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'terminus',
    kind: 'liminal',
    title: 'End of the Line',
    // Where the undersea metro line finally stops — it lets out into the
    // backrooms. A real (wide-permission) GLB level, crunched (19.8 MB → 0.83 MB)
    // + lazy-loaded behind the loader minigame, like the deep pool. Provenance in
    // THIRD_PARTY_NOTICES.md. The bitter bottom of the train thread.
    glb: {
      url: '/models/backrooms-vr.glb',
      fit: 24,
      recoverTo: { to: 'metro-tunnel', spawn: 'fromEnd' },
    },
    drips: true, // the flooded undersea tunnel leaks in down here too
    dims: { halfW: 10, halfD: 10, height: 5.5, eye: EYE },
    // The sickly fluorescent yellow-beige of the backrooms, gone dim + damp.
    palette: { background: '#15140a', fog: '#262212', fogNear: 5, fogFar: 26 },
    spawns: {
      // Step off the platform a clear stride past the return door, facing -Z into
      // the endless rooms.
      default: { position: [0, EYE, 6.5], yaw: Math.PI },
      fromTunnel: { position: [0, EYE, 6.5], yaw: Math.PI },
    },
    // The backrooms are not as empty as they look — two dancers in the yellow.
    entities: [
      { id: 'terminus-blob', body: 'blob', spawn: [-4, -3] },
      { id: 'terminus-lurker', body: 'lurker', spawn: [4, -5], speed: 1.8 },
    ],
    doors: [
      {
        id: 'end-to-tunnel',
        to: 'metro-tunnel',
        toSpawn: 'fromEnd',
        position: [0, 0, 9.9], // +Z wall — back up the line
        rotationY: 0,
        label: 'back up the tunnel',
        radius: 3.2,
      },
    ],
  },
];
