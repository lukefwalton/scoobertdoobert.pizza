import { create } from 'zustand';

// Scene/game state. Drives the descent (the order form requests it), the world
// mount (WorldMount), the hotspot prompts + dialogs, and the pause menu.
type SceneState = {
  worldActive: boolean;
  /** id of the hotspot the camera is currently near (or null) */
  nearHotspot: string | null;
  /** id of the hotspot whose dialog is open (or null) */
  openHotspot: string | null;
  /** pause menu visible */
  paused: boolean;
  /** the order form asked to start the descent (consumed by Descent) */
  descentRequested: boolean;

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
  worldActive: false,
  nearHotspot: null,
  openHotspot: null,
  paused: false,
  descentRequested: false,

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
