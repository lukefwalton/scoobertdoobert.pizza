// ───────────────────────────────────────────────────────────────────────────
// src/data/hotspots.ts — in-world interaction points. Each hotspot points at a
// links.ts destination by id, so links stay single-source: a hotspot never
// hardcodes a URL, and adding/moving one is a data edit, never scene code.
//
// (The pause menu surfaces the FULL links list regardless, so these three are
// the diegetic shortcuts, not the only way out.)
// ───────────────────────────────────────────────────────────────────────────

export type HotspotMesh = 'jukebox' | 'door' | 'window' | 'poster' | 'pizzaBox';

export type Hotspot = {
  id: string;
  /** -> Dest.id in links.ts */
  destId: string;
  /** world-space position of the interaction point */
  position: [number, number, number];
  /** proximity prompt, e.g. "Press E to listen" */
  prompt: string;
  /** which piece of set dressing this is attached to */
  mesh: HotspotMesh;
  /** how close (world units) the camera must be to interact */
  radius?: number;
};

export const HOTSPOTS: Hotspot[] = [
  {
    id: 'jukebox',
    destId: 'listen',
    position: [-6.8, 1.6, 3],
    prompt: 'Press E to drop a coin',
    mesh: 'jukebox',
    radius: 4.5,
  },
  {
    id: 'window',
    destId: 'videos',
    position: [0, 2.6, -6.5],
    prompt: 'Press E to watch the sea',
    mesh: 'window',
    radius: 5,
  },
  {
    id: 'counter',
    destId: 'catalog',
    position: [5.6, 2.2, -2],
    prompt: 'Press E to read the pizza box',
    mesh: 'pizzaBox',
    radius: 4.5,
  },
];
