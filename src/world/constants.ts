import * as THREE from 'three';

// Shared palette for floor one (the beach pizza shop). The plain geometry
// numbers (ROOM / SEA / PS1) live in three-free dims.ts and are re-exported here
// so world code keeps importing them from one place, while the rooms graph + the
// store can import them WITHOUT pulling three.js into the storefront bundle.
export { ROOM, SEA, PS1 } from './dims';

// Underwater "tropical shallow" cyan — scene background + fog + water base.
export const OCEAN = new THREE.Color('#1f8fb5');
export const FOG_NEAR = 6;
export const FOG_FAR = 64;
