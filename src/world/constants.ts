import * as THREE from 'three';

// Shared dimensions + palette for floor one (the beach pizza shop). Kept in one
// place so the room, the water, the boids, and the fog all agree.

// Underwater "tropical shallow" cyan — scene background + fog + water base.
export const OCEAN = new THREE.Color('#1f8fb5');
export const FOG_NEAR = 6;
export const FOG_FAR = 64;

// Room interior (a small box the camera stands inside). Front wall (-Z) holds
// the window that looks out to the sea.
export const ROOM = {
  halfW: 8, // x extent
  halfD: 8, // z extent
  height: 5,
  eye: 2.4, // camera eye height
  frontZ: -8, // window wall
};

// The sea volume out the window (centered beyond the front wall).
export const SEA = {
  z: -34, // center of the water plane / boid volume
  waterY: -1.2,
};

// Default PS1 knobs (leva overrides these live).
export const PS1 = {
  snap: 64, // clip-space grid; lower = chunkier vertices
  dprMin: 0.32, // render resolution multiplier (the low-res crunch)
  dprMax: 0.4,
};
