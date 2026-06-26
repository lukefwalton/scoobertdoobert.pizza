// src/data/rooms/surface.ts — the sweet SoCal SURFACE wings off the shop (never the
// descent): the boardwalk/moonlight pier, the Balboa park path up to the California
// coast + tidepools, and the San Diego zoo into North Park. All taste-safe + goofy.
import { EYE, type Room } from './types';

export const SURFACE_ROOMS: Room[] = [
  {
    id: 'boardwalk',
    kind: 'boardwalk',
    title: 'The Boardwalk',
    // Open + airy, room to stroll the pier. No closed walls (an outdoor room, like
    // the shrine): the sea is out past the -Z edge, the town up the +X path.
    dims: { halfW: 9, halfD: 9, height: 6, eye: EYE },
    // Golden hour: warm peach sky, soft far fog so the sea fades into the dusk.
    palette: { background: '#e7b27a', fog: '#f0cb98', fogNear: 12, fogFar: 80 },
    // Potted palms by the rail. (The boardwalk arcade cabinet is procedural — an
    // <ArcadeCabinet> in BoardwalkRoom, a real CRT + joystick.)
    props: [
      { url: '/models/palm-tree.glb', position: [-6.2, 0, -4], fit: 4.6, rotationY: 0.4 },
      { url: '/models/palm-tree.glb', position: [6.4, 0, -3], fit: 4.2, rotationY: -0.7 },
    ],
    // The boardwalk plays its namesake track.
    song: 'boardwalk',
    // A CRT on the pier opposite the arcade cabinet — switch it on for the
    // "Boardwalk" music video (the song is literally about this place). A fun
    // anachronism, like the Frutiger set.
    tv: { songSlug: 'boardwalk', position: [-3, 0, 0.5], rotationY: 0.4 },
    spawns: {
      // Step out of the shop onto the pier, facing the sea (-Z) — the establishing
      // view down the boardwalk toward the water. Clear of the +Z shop door. Coming
      // back up off the beach lands here too: you're back on the pier facing the sea.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromShop: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromOcean: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Back from the park path: by the -X gate (mid-pier), facing +X into the
      // boardwalk, clear of every door radius.
      fromBalboa: { position: [-4.45, EYE, 4.5], yaw: Math.PI / 2 },
      // Back off the moonlight plaza: by the +X gate (mid-pier), facing -X into the
      // boardwalk, clear of every door radius.
      fromMoonlight: { position: [4.45, EYE, 4.5], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'boardwalk-to-shop',
        to: 'shop',
        toSpawn: 'fromBoardwalk',
        position: [0, 0, 8.95], // +Z — back inside the shop
        rotationY: 0,
        label: 'back inside the shop',
        radius: 3.2,
      },
      {
        id: 'boardwalk-to-ocean',
        to: 'oceanview',
        toSpawn: 'fromBoardwalk',
        position: [0, 0, -8.95], // -Z — straight down the pier to the tide line
        rotationY: Math.PI,
        label: 'walk down to the tide',
        radius: 3.2,
      },
      {
        id: 'boardwalk-to-balboa',
        to: 'balboa',
        toSpawn: 'fromBoardwalk',
        position: [-8.95, 0, 4.5], // -X gate, level with the spawn — up to the park
        rotationY: Math.PI / 2,
        label: 'follow the path to the park',
        radius: 3.2,
      },
      {
        id: 'boardwalk-to-moonlight',
        to: 'moonlight',
        toSpawn: 'fromBoardwalk',
        position: [8.95, 0, 4.5], // +X gate, level with the spawn — out to the plaza
        rotationY: -Math.PI / 2,
        label: 'out onto the dance floor',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'oceanview',
    kind: 'oceanview',
    title: 'Moonlight Beach',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Nocturnal contrast to the golden boardwalk: deep moonlit blue, the tide
    // line out past the -Z edge. Sweet, still — a sit-and-watch breather.
    palette: { background: '#123150', fog: '#173a5e', fogNear: 10, fogFar: 70 },
    song: 'ocean-view',
    spawns: {
      // Arrive at the top of the beach, facing the moonlit water (-Z). Clear of the
      // +Z steps back up.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromBoardwalk: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'ocean-to-boardwalk',
        to: 'boardwalk',
        toSpawn: 'fromOcean',
        position: [0, 0, 8.95], // +Z — back up the steps to the boardwalk
        rotationY: 0,
        label: 'back up to the boardwalk',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'balboa',
    kind: 'balboa',
    title: 'Park Path',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // A bright SoCal park midday — sky blue, palms, a little fountain. Sweet + open.
    palette: { background: '#86b6d6', fog: '#a6cce0', fogNear: 11, fogFar: 80 },
    // Palms line the path.
    props: [
      { url: '/models/palm-tree.glb', position: [-5.6, 0, -3.5], fit: 5, rotationY: 0.3 },
      { url: '/models/palm-tree.glb', position: [5.8, 0, -5], fit: 4.6, rotationY: -0.5 },
    ],
    song: 'walking-balboa',
    spawns: {
      // Arrive on the path, facing up into the park (-Z). Clear of the +Z gate back.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromBoardwalk: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Back down off the coast road: by the -Z gate, facing +Z back into the park,
      // clear of every door radius.
      fromCalifornia: { position: [0, EYE, -4.5], yaw: 0 },
    },
    doors: [
      {
        id: 'balboa-to-boardwalk',
        to: 'boardwalk',
        toSpawn: 'fromBalboa',
        position: [0, 0, 8.95], // +Z — back down to the boardwalk
        rotationY: 0,
        label: 'back to the boardwalk',
        radius: 3.2,
      },
      {
        id: 'balboa-to-california',
        to: 'california',
        toSpawn: 'fromBalboa',
        position: [0, 0, -8.95], // -Z — up the path to the coast road
        rotationY: Math.PI,
        label: 'up to the coast road',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'moonlight',
    kind: 'moonlight',
    title: 'Moonlight Plaza',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Moonlit, but festive — a warmer indigo than the cold ocean beach, lit by
    // string bulbs. Soft far fog so the sea fades into the night.
    palette: { background: '#1b1d3e', fog: '#262a52', fogNear: 11, fogFar: 75 },
    props: [
      { url: '/models/palm-tree.glb', position: [-6.2, 0, -3], fit: 4.4, rotationY: 0.5 },
      { url: '/models/palm-tree.glb', position: [6.4, 0, -2], fit: 4, rotationY: -0.6 },
    ],
    song: 'dancing-in-the-moonlight',
    spawns: {
      // Step onto the plaza at the -Z (seaward) end, facing +Z up the pier across
      // the dance floor toward the morning gate. Clear of every door radius.
      default: { position: [0, EYE, -4.5], yaw: 0 },
      fromBoardwalk: { position: [0, EYE, -4.5], yaw: 0 },
      // Back from the morning: by the +Z gate, facing -Z back across the plaza,
      // clear of every door radius.
      fromBestday: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'moonlight-to-boardwalk',
        to: 'boardwalk',
        toSpawn: 'fromMoonlight',
        position: [0, 0, -8.95], // -Z gate (seaward end) — back to the boardwalk
        rotationY: Math.PI,
        label: 'back to the boardwalk',
        radius: 3.2,
      },
      {
        id: 'moonlight-to-bestday',
        to: 'bestday',
        toSpawn: 'fromMoonlight',
        position: [0, 0, 8.95], // +Z gate — inland, toward the morning
        rotationY: 0,
        label: 'chase the morning',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'bestday',
    kind: 'bestday',
    title: 'The Best Day Ever',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Bright cheerful day — sky blue, warm sun, gentle far fog. The sweet daytime
    // counterpart to the moonlit plaza (the contrast is the point).
    palette: { background: '#8fc7e8', fog: '#b6dcf0', fogNear: 12, fogFar: 85 },
    props: [
      { url: '/models/palm-tree.glb', position: [-6.5, 0, -3], fit: 5, rotationY: 0.3 },
      { url: '/models/palm-tree.glb', position: [6.6, 0, -4], fit: 4.6, rotationY: -0.6 },
    ],
    song: 'best-day-ever',
    spawns: {
      // Arrive at the north edge facing -Z out into the sunny morning. Clear of the
      // +Z door back into the night.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromMoonlight: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'bestday-to-moonlight',
        to: 'moonlight',
        toSpawn: 'fromBestday',
        position: [0, 0, 8.95], // +Z — back into the moonlight
        rotationY: 0,
        label: 'back into the moonlight',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'california',
    kind: 'california',
    title: 'I Live in California',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Golden hour on the coast highway: warm amber sky, soft far fog so the sea
    // melts into the haze.
    palette: { background: '#f0b274', fog: '#f6cf9c', fogNear: 12, fogFar: 82 },
    props: [
      { url: '/models/palm-tree.glb', position: [-6.4, 0, -2], fit: 5.2, rotationY: 0.4 },
      // a foreground palm framing the tower from the right (clear of its dome)
      { url: '/models/palm-tree.glb', position: [8, 0, -0.5], fit: 4.6, rotationY: -0.5 },
    ],
    song: 'i-live-in-california',
    // (The California Tower itself is procedural — see CaliforniaRoom.)
    // A CRT off to the side of the overlook plays the "I Live in California" music
    // video — the song this golden-hour coast is named for. Clear of the centre tower.
    tv: { songSlug: 'i-live-in-california', position: [-4.5, 0, 1], rotationY: -0.6 },
    spawns: {
      // Arrive at the +Z (park) end of the overlook, facing -Z out toward the sea
      // + the lower tidepool gate. Clear of every door radius.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromBalboa: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Back up from the tidepools: by the -Z gate, facing +Z back up the road,
      // clear of every door radius.
      fromTidepools: { position: [0, EYE, -4.5], yaw: 0 },
      // Back from the zoo: by the +X gate, facing -X back into the overlook, clear
      // of every door radius.
      fromZoo: { position: [4.45, EYE, 3.5], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'california-to-balboa',
        to: 'balboa',
        toSpawn: 'fromCalifornia',
        position: [0, 0, 8.95], // +Z — back down the path to the park
        rotationY: 0,
        label: 'back down to the park',
        radius: 3.2,
      },
      {
        id: 'california-to-tidepools',
        to: 'tidepools',
        toSpawn: 'fromCalifornia',
        position: [0, 0, -8.95], // -Z — down to the tidepools
        rotationY: Math.PI,
        label: 'down to the tidepools',
        radius: 3.2,
      },
      {
        id: 'california-to-zoo',
        to: 'zoo',
        toSpawn: 'fromCalifornia',
        position: [8.95, 0, 3.5], // +X gate — into the park / the zoo
        rotationY: -Math.PI / 2,
        label: 'into the zoo',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'tidepools',
    kind: 'tidepools',
    title: 'Daydreaming',
    dims: { halfW: 9, halfD: 9, height: 7, eye: EYE },
    // Hazy bright noon over a shallow lagoon — soft mint + cream, a shimmer on the
    // still water. The sweet drift at the bottom of the wing.
    palette: { background: '#bfe3d6', fog: '#d6efe6', fogNear: 11, fogFar: 78 },
    props: [{ url: '/models/palm-tree.glb', position: [-6.6, 0, -3], fit: 4.6, rotationY: 0.6 }],
    song: 'daydreaming',
    spawns: {
      // Arrive at the +Z edge of the lagoon, facing -Z out across the still water.
      // Clear of the +Z gate back up the road.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromCalifornia: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'tidepools-to-california',
        to: 'california',
        toSpawn: 'fromTidepools',
        position: [0, 0, 8.95], // +Z — back up the coast road
        rotationY: 0,
        label: 'back up the coast road',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'zoo',
    kind: 'zoo',
    title: 'The San Diego Zoo',
    dims: { halfW: 10, halfD: 9, height: 7, eye: EYE },
    // Bright lush midday — warm green, soft far fog.
    palette: { background: '#a9cf7e', fog: '#c2e0a0', fogNear: 12, fogFar: 80 },
    props: [
      { url: '/models/palm-tree.glb', position: [-7, 0, -4], fit: 5.2, rotationY: 0.3 },
      { url: '/models/palm-tree.glb', position: [7.2, 0, -5], fit: 4.8, rotationY: -0.6 },
    ],
    song: 'my-friend-scoobert',
    spawns: {
      // Step in at the +Z (park) end, facing -Z down the enclosure toward the
      // flamingo pond + the North Park gate. Clear of every door radius.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromCalifornia: { position: [0, EYE, 4.5], yaw: Math.PI },
      // Back from North Park: by the -Z gate, facing +Z back into the zoo, clear
      // of every door radius.
      fromNorthPark: { position: [0, EYE, -4.5], yaw: 0 },
    },
    doors: [
      {
        id: 'zoo-to-california',
        to: 'california',
        toSpawn: 'fromZoo',
        position: [0, 0, 8.95], // +Z — back to the overlook
        rotationY: 0,
        label: 'back to the overlook',
        radius: 3.2,
      },
      {
        id: 'zoo-to-northpark',
        to: 'northpark',
        toSpawn: 'fromZoo',
        position: [0, 0, -8.95], // -Z — out the gate into North Park
        rotationY: Math.PI,
        label: 'out into North Park',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'northpark',
    kind: 'northpark',
    title: 'North Park',
    dims: { halfW: 10, halfD: 10, height: 8, eye: EYE },
    // Golden-hour dusk on the boulevard under the sign — warm amber sky, soft fog.
    palette: { background: '#d99a5e', fog: '#e6b884', fogNear: 13, fogFar: 80 },
    song: 'velma-what-a-night',
    spawns: {
      // Arrive at the +Z end of the block, facing -Z down the street toward the
      // NORTH PARK sign. Clear of the +Z gate back to the zoo.
      default: { position: [0, EYE, 4.5], yaw: Math.PI },
      fromZoo: { position: [0, EYE, 4.5], yaw: Math.PI },
    },
    doors: [
      {
        id: 'northpark-to-zoo',
        to: 'zoo',
        toSpawn: 'fromNorthPark',
        position: [0, 0, 8.95], // +Z — back to the zoo gate
        rotationY: 0,
        label: 'back to the zoo',
        radius: 3.2,
      },
    ],
  },
];
