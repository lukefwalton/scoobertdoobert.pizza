// Plain, three-free geometry constants. Kept separate from constants.ts (which
// builds THREE.Color objects) so this data can be imported by the rooms graph
// (src/data/rooms.ts), the scene store, and the HUD WITHOUT dragging three.js
// into the initial storefront bundle. constants.ts re-exports these so existing
// world imports (Room, Controls, Boids…) are unchanged.

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
  dpr: 0.4, // render resolution multiplier — the low-res crunch
};
