import { create } from 'zustand';
import { BOTTOM_FLOOR } from '../data/floors';

// The world starts in the beach shop. Kept as a bare string (not imported from
// rooms.ts) so the store stays three-free — the rooms graph + its dims live in
// the lazy world chunk, the store only tracks WHICH room/spawn by id.
const FIRST_ROOM = 'shop';

// Scene/game state. Drives the floor descent (currentFloor), the world mount
// (WorldMount), the hotspot prompts + dialogs, the room graph, and the pause menu.
type SceneState = {
  /** Index into FLOORS — which era floor is showing. 0 = the storefront. */
  currentFloor: number;
  worldActive: boolean;
  /** id of the hotspot the camera is currently near (or null) */
  nearHotspot: string | null;
  /** id of the hotspot whose dialog is open (or null) */
  openHotspot: string | null;
  /** pause menu visible */
  paused: boolean;
  /** the order form asked to start the descent (consumed by Descent) */
  descentRequested: boolean;
  /** the machine room asked to fire the Calzone install (→ world) */
  installRequested: boolean;

  // ── the 3D room graph (rooms.ts) ──────────────────────────────────────────
  /** id of the room currently rendered (Room ids in rooms.ts). */
  currentRoom: string;
  /** which spawn in currentRoom the camera arrived at. */
  currentSpawn: string;
  /** a door was activated: fade out, then commit. null when settled. */
  pendingRoom: { to: string; spawn: string } | null;
  /** the door the camera is near, resolved to its target (or null). */
  nearDoor: { id: string; label: string; to: string; spawn: string } | null;

  /** Go down one floor (forward in web time), clamped to the bottom. */
  descend: () => void;
  /** Go back up one floor, clamped to the storefront. */
  ascend: () => void;
  setFloor: (i: number) => void;
  enterWorld: () => void;
  exitWorld: () => void;
  setNearHotspot: (id: string | null) => void;
  openHotspotDialog: (id: string) => void;
  closeHotspotDialog: () => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  requestDescent: () => void;
  clearDescentRequest: () => void;
  /** Fire the Calzone install from the machine room (jumps straight to the
   *  installer; the machine room itself is the prompt). */
  requestInstall: () => void;
  clearInstallRequest: () => void;

  /** Walk through a door: begin the fade (pendingRoom), Controls freezes. */
  goToRoom: (to: string, spawn: string) => void;
  /** Commit the pending room swap (mid-fade): repositions via Controls. */
  commitRoom: () => void;
  setNearDoor: (door: { id: string; label: string; to: string; spawn: string } | null) => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  currentFloor: 0,
  worldActive: false,
  nearHotspot: null,
  openHotspot: null,
  paused: false,
  descentRequested: false,
  installRequested: false,

  currentRoom: FIRST_ROOM,
  currentSpawn: 'default',
  pendingRoom: null,
  nearDoor: null,

  descend: () => set((s) => ({ currentFloor: Math.min(s.currentFloor + 1, BOTTOM_FLOOR) })),
  ascend: () => set((s) => ({ currentFloor: Math.max(s.currentFloor - 1, 0) })),
  setFloor: (i) => set({ currentFloor: Math.max(0, Math.min(i, BOTTOM_FLOOR)) }),
  // Entering the world always starts in the first room (the beach shop).
  enterWorld: () =>
    set({ worldActive: true, currentRoom: FIRST_ROOM, currentSpawn: 'default', pendingRoom: null }),
  // Leaving the world drops you back at the storefront (floor 0), not the
  // machine room you installed from — and resets the room graph for next time.
  exitWorld: () =>
    set({
      worldActive: false,
      paused: false,
      openHotspot: null,
      nearHotspot: null,
      nearDoor: null,
      pendingRoom: null,
      currentRoom: FIRST_ROOM,
      currentSpawn: 'default',
      currentFloor: 0,
    }),
  setNearHotspot: (id) => set({ nearHotspot: id }),
  openHotspotDialog: (id) => set({ openHotspot: id }),
  closeHotspotDialog: () => set({ openHotspot: null }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  requestDescent: () => set({ descentRequested: true }),
  clearDescentRequest: () => set({ descentRequested: false }),
  requestInstall: () => set({ installRequested: true }),
  clearInstallRequest: () => set({ installRequested: false }),

  // Door activation: stash the target and start the fade. Ignored if a swap is
  // already in flight (debounces double-press). Also clears door/hotspot prompts
  // so nothing lingers over the black.
  goToRoom: (to, spawn) =>
    set((s) => (s.pendingRoom ? {} : { pendingRoom: { to, spawn }, nearDoor: null, nearHotspot: null })),
  // Commit mid-fade: the room actually swaps here (behind the black), and
  // Controls repositions the camera to the new room's spawn.
  commitRoom: () =>
    set((s) =>
      s.pendingRoom
        ? { currentRoom: s.pendingRoom.to, currentSpawn: s.pendingRoom.spawn, pendingRoom: null }
        : {},
    ),
  setNearDoor: (door) => set({ nearDoor: door }),
}));
