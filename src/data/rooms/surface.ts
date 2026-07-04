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
      // Back out of the botanical garden: by the -X gate (level with the spawn
      // row, like the boardwalk's side gates), facing +X into the park.
      fromGarden: { position: [-4.45, EYE, 4.5], yaw: Math.PI / 2 },
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
      {
        id: 'balboa-to-garden',
        to: 'garden',
        toSpawn: 'fromBalboa',
        // -X gate, level with the spawn row (the boardwalk's side-gate pattern) —
        // a straight walk left from the path goes through the hedges.
        position: [-8.95, 0, 4.5],
        rotationY: Math.PI / 2,
        label: 'into the botanical garden',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'garden',
    kind: 'garden',
    title: 'The Botanical Garden',
    // Big + open — room for the hedge quadrants, the palm scatter, and the tube
    // slide's corkscrew in the NW corner. An outdoor room (no closed walls).
    dims: { halfW: 10, halfD: 10, height: 7, eye: EYE },
    // Lush garden noon: warm green-tinged sky, soft far fog into the greenery.
    palette: { background: '#a3cf94', fog: '#bfe0ab', fogNear: 12, fogFar: 80 },
    // A musicRoom: the garden sings for itself (birdsong + breeze + the resident
    // bullfrog — see GardenRoom) while the carried song fades out.
    musicRoom: true,
    spawns: {
      // Step in off the park at the +X gate, facing -X down the pink-brick path
      // toward the frog. Clear of the gate's radius, facing away from it.
      default: { position: [5.45, EYE, 0], yaw: -Math.PI / 2 },
      fromBalboa: { position: [5.45, EYE, 0], yaw: -Math.PI / 2 },
      // Back out of the grotto (-Z, x=6 — the gap in the north hedge), angled
      // slightly across the garden so the +X park gate isn't dead ahead.
      fromGrotto: { position: [5.5, EYE, -5.45], yaw: -0.25 },
      // Back through the lion moon-gate (+Z, x=-5), facing -Z into the garden.
      fromBamboo: { position: [-5, EYE, 5.45], yaw: Math.PI },
      // Crawled back out of the tube warren: a step clear of the slide mouth
      // (well outside its ~1.35 re-trigger reach), facing +Z into the garden so
      // you don't immediately slide again.
      fromTubes: { position: [-1, EYE, -2], yaw: 0 },
    },
    doors: [
      {
        id: 'garden-to-balboa',
        to: 'balboa',
        toSpawn: 'fromGarden',
        position: [9.95, 0, 0], // +X — back out to the park path
        rotationY: -Math.PI / 2,
        label: 'back to the park path',
        radius: 3.2,
      },
      {
        id: 'garden-to-grotto',
        to: 'grotto',
        toSpawn: 'fromGarden',
        position: [6, 0, -9.95], // -Z, through the gap in the north hedge
        rotationY: Math.PI,
        label: 'duck into the grotto',
        radius: 3.2,
      },
      {
        id: 'garden-to-bamboo',
        to: 'bamboo',
        toSpawn: 'fromGarden',
        position: [-5, 0, 9.95], // +Z — the stone LION moon-gate
        rotationY: 0,
        label: 'step through the lion gate',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'grotto',
    kind: 'grotto',
    title: 'The Grotto',
    // A small dark cave — tight on purpose (the mouth's glow is the whole show).
    dims: { halfW: 7, halfD: 7, height: 5, eye: EYE },
    // Near-black cool dark; close fog so the rock dissolves fast, while the
    // unlit "outside" planes at the mouth burn bright through it.
    palette: { background: '#141210', fog: '#191713', fogNear: 5, fogFar: 30 },
    // A musicRoom: the waterfall hush + echoey drips own the space.
    musicRoom: true,
    spawns: {
      // Arrive just inside, facing -Z at the glowing mouth (the photo's view).
      default: { position: [0, EYE, 2.45], yaw: Math.PI },
      fromGarden: { position: [0, EYE, 2.45], yaw: Math.PI },
    },
    doors: [
      {
        id: 'grotto-to-garden',
        to: 'garden',
        toSpawn: 'fromGrotto',
        position: [0, 0, 6.95], // +Z — back out into the light
        rotationY: 0,
        label: 'back out to the garden',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'bamboo',
    kind: 'bamboo',
    title: 'The Bamboo Grove',
    dims: { halfW: 9, halfD: 9, height: 8, eye: EYE },
    // Dappled green everywhere — the grove closes around you (nearer fog than
    // the open garden), gold-green light through the culms.
    palette: { background: '#86b26c', fog: '#9cc37d', fogNear: 8, fogFar: 48 },
    // A musicRoom: wind in the leaves + the shishi-odoshi keeping time (klok).
    musicRoom: true,
    spawns: {
      // Step out of the moon-gate at the -Z edge, facing +Z into the stand.
      default: { position: [0, EYE, -4.45], yaw: 0 },
      fromGarden: { position: [0, EYE, -4.45], yaw: 0 },
    },
    doors: [
      {
        id: 'bamboo-to-garden',
        to: 'garden',
        toSpawn: 'fromBamboo',
        position: [0, 0, -8.95], // -Z — back through the lion gate
        rotationY: Math.PI,
        label: 'back through the lion gate',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'tubes',
    kind: 'tubes',
    title: 'The Tubes',
    // A soft, enclosed PlayPlace warren — walls close (nearer fog), padded floor.
    dims: { halfW: 8, halfD: 8, height: 6, eye: EYE },
    // Warm plastic dusk: a green-tinged glow, the translucent tubes catching light.
    palette: { background: '#3b6b52', fog: '#4a7d60', fogNear: 7, fogFar: 40 },
    // A musicRoom: soft squeaky-tube bloops own the space (see TubesRoom).
    musicRoom: true,
    spawns: {
      // You SLID in: land at the -Z end, facing +Z into the warren toward the
      // ball pit + the crawl-out mouth. Clear of the +Z exit door radius.
      default: { position: [0, EYE, -5], yaw: 0 },
      fromSlide: { position: [0, EYE, -5], yaw: 0 },
    },
    doors: [
      {
        id: 'tubes-to-garden',
        to: 'garden',
        toSpawn: 'fromTubes',
        position: [0, 0, 7.95], // +Z — the crawl-out tube mouth back to the garden
        rotationY: 0,
        label: 'crawl back out to the garden',
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
    // A little CRT off to the left plays the song's own video (the "TV spots" gag) —
    // clear of the corner palms, angled back toward the entrance view.
    tv: { songSlug: 'best-day-ever', position: [-3.5, 0, 0.5], rotationY: 0.4 },
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
    // A CRT off to the right plays the song's video (album fallback) — clear of the
    // single left palm and the scattered tide rocks.
    tv: { songSlug: 'daydreaming', position: [3.6, 0, 0.6], rotationY: -0.4 },
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
    // A CRT off to the left-front plays the song's own video — clear of the corner
    // palms and the flamingo pond (which sits further back toward -Z).
    tv: { songSlug: 'my-friend-scoobert', position: [-3.8, 0, 0.6], rotationY: 0.4 },
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
      // Back out of the old venue: by the -X door, angled up the street so the
      // zoo gate isn't dead ahead.
      fromTurtle: { position: [-5.45, EYE, 2], yaw: Math.PI / 2 - 0.3 },
      // Back off Main Street: by the +X corner, facing -X back onto the block.
      fromMainstreet: { position: [5.45, EYE, -2], yaw: -Math.PI / 2 },
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
      {
        id: 'northpark-to-turtle',
        to: 'turtle',
        toSpawn: 'fromNorthPark',
        position: [-9.95, 0, 2], // -X — the dark doorway under the dead marquee
        rotationY: Math.PI / 2,
        label: 'slip into the old venue',
        radius: 3.2,
      },
      {
        id: 'northpark-to-mainstreet',
        to: 'mainstreet',
        toSpawn: 'fromNorthPark',
        position: [9.95, 0, -2], // +X — the block thins out toward the edge of town
        rotationY: -Math.PI / 2,
        label: 'wander down the empty main street',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'turtle',
    kind: 'turtle',
    title: 'The Jumping Turtle',
    // One long dark hall: the bar down one side, the little stage at the far end
    // under the leaping-turtle sign, the loft over the door. Venue-sized.
    dims: { halfW: 9, halfD: 10, height: 7, eye: EYE },
    // Lights long cut: near-black with the old green paint barely holding on;
    // close fog so the far corners stay swallowed until you walk them.
    palette: { background: '#0e120e', fog: '#131812', fogNear: 6, fogFar: 36 },
    // A musicRoom: the room's own ghost-soundcheck owns the space (a hum, a
    // far-off thump, the sign's buzz) — the carried song politely steps out.
    musicRoom: true,
    spawns: {
      // In through the flyer-crusted double door at the +X end, facing -X down
      // the hall toward the stage.
      default: { position: [4.45, EYE, 0], yaw: -Math.PI / 2 },
      fromNorthPark: { position: [4.45, EYE, 0], yaw: -Math.PI / 2 },
    },
    doors: [
      {
        id: 'turtle-to-northpark',
        to: 'northpark',
        toSpawn: 'fromTurtle',
        position: [8.95, 0, 0], // +X — back out to the street
        rotationY: -Math.PI / 2,
        label: 'back out to the street',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'mainstreet',
    kind: 'mainstreet',
    title: 'Main Street',
    // A long empty small-town street at dead of night. Runs along Z.
    dims: { halfW: 7, halfD: 10, height: 8, eye: EYE },
    // Deep sodium-lit night: near-black blue, a warm lamp-glow haze, close-ish fog
    // so the far end of the street stays swallowed (the liminal emptiness).
    palette: { background: '#0c1020', fog: '#141a2e', fogNear: 8, fogFar: 46 },
    // A musicRoom: a low night hum + a lone cricket + the traffic light's tick
    // own the space (see MainStreetRoom). Eerie-warm, never a scare.
    musicRoom: true,
    spawns: {
      // Arrive at the +Z end (off the North Park corner), facing -Z down the dark
      // street toward the diner's glow. Clear of the +Z gate back to the block.
      default: { position: [0, EYE, 6.5], yaw: Math.PI },
      fromNorthPark: { position: [0, EYE, 6.5], yaw: Math.PI },
      // Back out of the diner: by the -X door, facing +X back onto the street.
      fromDiner: { position: [-2.5, EYE, -2], yaw: Math.PI / 2 },
    },
    doors: [
      {
        id: 'mainstreet-to-northpark',
        to: 'northpark',
        toSpawn: 'fromMainstreet',
        position: [0, 0, 9.95], // +Z — back toward the North Park block
        rotationY: 0,
        label: 'back toward the block',
        radius: 3.2,
      },
      {
        id: 'mainstreet-to-diner',
        to: 'diner',
        toSpawn: 'fromMainstreet',
        position: [-6.95, 0, -2], // -X — the only lit doorway on the street
        rotationY: Math.PI / 2,
        label: 'step into the all-night diner',
        radius: 3.2,
      },
    ],
  },
  {
    id: 'diner',
    kind: 'diner',
    title: 'The All-Night Diner',
    dims: { halfW: 8, halfD: 7, height: 5, eye: EYE },
    // Warm but wrong: amber diner light held close by dark fog — cozy, a little
    // too still (the animal heads watching from the wall).
    palette: { background: '#1a1206', fog: '#241a0c', fogNear: 7, fogFar: 34 },
    // A musicRoom: a fridge hum, a ceiling-fan tick, the sign's neon buzz.
    musicRoom: true,
    spawns: {
      // In the door at the +X end, facing -X across the counter into the booths.
      default: { position: [3.45, EYE, 0], yaw: -Math.PI / 2 },
      fromMainstreet: { position: [3.45, EYE, 0], yaw: -Math.PI / 2 },
      // Back out of the kitchen: by the -Z swing door, facing +Z into the room.
      fromKitchen: { position: [-3, EYE, -3.5], yaw: 0 },
    },
    doors: [
      {
        id: 'diner-to-mainstreet',
        to: 'mainstreet',
        toSpawn: 'fromDiner',
        position: [7.95, 0, 0], // +X — back out onto Main Street
        rotationY: -Math.PI / 2,
        label: 'back out onto the street',
        radius: 3.2,
      },
      {
        id: 'diner-to-kitchen',
        to: 'kitchen',
        toSpawn: 'fromDiner',
        position: [-3, 0, -6.95], // -Z swing door behind the counter — "the kitchen"
        rotationY: 0,
        label: 'through to the kitchen',
        radius: 3.0,
      },
    ],
  },
  {
    id: 'mainstreetday',
    kind: 'mainstreet',
    title: 'Main Street',
    // The SAME street as `mainstreet`, but the kitchen's back door drops you out
    // here at a hazy, overexposed, just-as-empty NOON — the liminal day/night
    // flip (MainStreetRoom renders the day variant off this id).
    dims: { halfW: 7, halfD: 10, height: 8, eye: EYE },
    // Overexposed noon: pale near-white sky, soft far haze.
    palette: { background: '#c8d2d6', fog: '#d8e0e2', fogNear: 13, fogFar: 78 },
    musicRoom: true,
    spawns: {
      // Step out of the kitchen's back door onto the -X sidewalk, facing +X into
      // the sunstruck empty street.
      default: { position: [-2.5, EYE, -2], yaw: Math.PI / 2 },
      fromKitchen: { position: [-2.5, EYE, -2], yaw: Math.PI / 2 },
    },
    doors: [
      {
        id: 'mainstreetday-to-kitchen',
        to: 'kitchen',
        toSpawn: 'fromMainstreetDay',
        position: [-6.95, 0, -2], // -X — back in the kitchen's back door
        rotationY: Math.PI / 2,
        label: 'back in the kitchen door',
        radius: 3.2,
      },
      {
        id: 'mainstreetday-to-northpark',
        to: 'northpark',
        toSpawn: 'fromMainstreet',
        position: [0, 0, 9.95], // +Z — up the daylit block, back toward North Park
        rotationY: 0,
        label: 'up the block, into the day',
        radius: 3.2,
      },
    ],
  },
];
