import * as THREE from 'three';

// A tiny fire-and-forget bus for COLLECT BURSTS — the little pop of light + sparks
// that plays wherever you grab something (loot, an item, a skill orb). Decoupled
// like cameraRig: the pickup meshes (which unmount the instant they're taken)
// just emit a position + colour here, and a single long-lived <CollectBursts>
// component in the world renders the actual particles. That way the burst
// outlives the thing that spawned it, and every collect path (click / walk-over /
// P / a skill orb) gets the same juice for free by emitting on the same signal.

export type Burst = { position: [number, number, number]; color: string };

type Listener = (b: Burst) => void;
const listeners = new Set<Listener>();

/** Spawn a collect burst at a world position (defaults to a warm gold). */
export function emitBurst(position: [number, number, number], color = '#ffd24a'): void {
  for (const l of listeners) l({ position, color });
}

/** Subscribe the renderer; returns an unsubscribe. */
export function subscribeBursts(cb: Listener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// Shared scratch colour so callers can pass a THREE.Color-derived hex without
// each allocating (the pickups already hold their own colour strings, so this is
// only used by the odd caller that has a Color in hand).
export const _scratchColor = new THREE.Color();
