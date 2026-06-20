import { create } from 'zustand';
import { BOTTOM_FLOOR } from '../data/floors';

// Scene/game state. Drives the floor descent (currentFloor), the world mount
// (WorldMount), the hotspot prompts + dialogs, and the pause menu.
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
};

export const useSceneStore = create<SceneState>((set) => ({
  currentFloor: 0,
  worldActive: false,
  nearHotspot: null,
  openHotspot: null,
  paused: false,
  descentRequested: false,

  descend: () => set((s) => ({ currentFloor: Math.min(s.currentFloor + 1, BOTTOM_FLOOR) })),
  ascend: () => set((s) => ({ currentFloor: Math.max(s.currentFloor - 1, 0) })),
  setFloor: (i) => set({ currentFloor: Math.max(0, Math.min(i, BOTTOM_FLOOR)) }),
  enterWorld: () => set({ worldActive: true }),
  exitWorld: () =>
    set({ worldActive: false, paused: false, openHotspot: null, nearHotspot: null }),
  setNearHotspot: (id) => set({ nearHotspot: id }),
  openHotspotDialog: (id) => set({ openHotspot: id }),
  closeHotspotDialog: () => set({ openHotspot: null }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  requestDescent: () => set({ descentRequested: true }),
  clearDescentRequest: () => set({ descentRequested: false }),
}));
