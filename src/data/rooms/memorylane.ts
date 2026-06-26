// src/data/rooms/memorylane.ts — the digital-nostalgia branch off the classified
// file room: the CRT corridor of old-web ghosts, opening into the server void where
// "all my friends live on the internet".
import { EYE, type Room } from './types';

export const MEMORYLANE_ROOMS: Room[] = [
  {
    id: 'memorylane',
    kind: 'memorylane',
    title: 'Memory Lane',
    // A long, narrow corridor — you walk the length of it past the screens.
    dims: { halfW: 4, halfD: 11, height: 4, eye: EYE },
    // CRT dusk: deep indigo black washed in monitor glow, close fog so the far end
    // is just a smear of light down the hall.
    palette: { background: '#140d22', fog: '#1b1330', fogNear: 4, fogFar: 30 },
    song: 'memory-lan',
    // The one CRT in the corridor of dead web that still PLAYS: switch it on and
    // it runs the real MEMORY LAN music video — the very track scoring the room.
    // (Faces -X into the aisle, in the +X-wall row, where a dead prop set used to
    // sit — so the live one stands among its dead siblings.)
    tv: { songSlug: 'memory-lan', position: [3, 0, 1], rotationY: -Math.PI / 2 },
    // A row of old (dead) CRT sets facing in off both walls, humming, mid-corridor.
    props: [
      {
        url: '/models/crt-tv.glb',
        position: [-3, 0, 4],
        fit: 1.3,
        rotationY: Math.PI / 2,
        glow: 0.4,
      },
      {
        url: '/models/crt-tv.glb',
        position: [-3, 0, -3],
        fit: 1.3,
        rotationY: Math.PI / 2,
        glow: 0.4,
      },
      {
        url: '/models/crt-tv.glb',
        position: [3, 0, -6],
        fit: 1.3,
        rotationY: -Math.PI / 2,
        glow: 0.4,
      },
    ],
    spawns: {
      // Step out of the hatch at the +Z end, facing -Z down the corridor toward the
      // far light. Clear of the +Z return door (radius 3.2).
      default: { position: [0, EYE, 7.4], yaw: Math.PI },
      fromClassified: { position: [0, EYE, 7.4], yaw: Math.PI },
      // Back up the cables from the servers: at the -Z end, facing +Z back up the
      // corridor, clear of the -Z door radius.
      fromInternet: { position: [0, EYE, -7.4], yaw: 0 },
    },
    doors: [
      {
        id: 'memorylane-to-classified',
        to: 'classified',
        toSpawn: 'fromMemoryLane',
        position: [0, 0, 10.95], // +Z — back through the hatch
        rotationY: 0,
        label: 'back through the hatch',
        radius: 3.2,
      },
      {
        id: 'memorylane-to-internet',
        to: 'internet',
        toSpawn: 'fromMemoryLane',
        position: [0, 0, -10.95], // -Z — follow the cables down into the servers
        rotationY: Math.PI,
        label: 'follow the cables into the dark',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'internet',
    kind: 'internet',
    title: 'Where the Friends Live',
    // A wide, dark void — server racks fading into the distance.
    dims: { halfW: 9, halfD: 9, height: 5, eye: EYE },
    // Near-black, cool blue; close-ish fog so the racks loom out of the dark and
    // the drifting data motes read as little lights in the void.
    palette: { background: '#05080f', fog: '#070d18', fogNear: 5, fogFar: 34 },
    song: 'all-my-friends-live-on-the-internet',
    // A lone CRT glowing off the aisle in the server void: switch it on for the
    // "All My Friends Live on the Internet" video — the friends made literal.
    tv: {
      songSlug: 'all-my-friends-live-on-the-internet',
      position: [3.4, 0, 1.5],
      rotationY: -Math.PI / 4,
    },
    spawns: {
      // Arrive at the +Z mouth of the hall, facing -Z into the racks. Clear of the
      // +Z door back up the corridor.
      default: { position: [0, EYE, 5], yaw: Math.PI },
      fromMemoryLane: { position: [0, EYE, 5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'internet-to-memorylane',
        to: 'memorylane',
        toSpawn: 'fromInternet',
        position: [0, 0, 8.95], // +Z — back up the cables to memory lane
        rotationY: 0,
        label: 'back up the cables',
        radius: 3.2,
      },
    ],
  },
];
