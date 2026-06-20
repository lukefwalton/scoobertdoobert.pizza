import { create } from 'zustand';

// Scene/game state. Drives the descent (step 3), the world mount (WorldMount),
// the hotspot prompts + dialogs (step 5), and the pause menu (step 5).
type SceneState = {
  worldActive: boolean;
  /** id of the hotspot the camera is currently near (or null) */
  nearHotspot: string | null;
  /** id of the hotspot whose dialog is open (or null) */
  openHotspot: string | null;
  /** pause menu visible */
  paused: boolean;

  enterWorld: () => void;
  exitWorld: () => void;
  setNearHotspot: (id: string | null) => void;
  openHotspotDialog: (id: string) => void;
  closeHotspotDialog: () => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  worldActive: false,
  nearHotspot: null,
  openHotspot: null,
  paused: false,

  enterWorld: () => set({ worldActive: true }),
  exitWorld: () =>
    set({ worldActive: false, paused: false, openHotspot: null, nearHotspot: null }),
  setNearHotspot: (id) => set({ nearHotspot: id }),
  openHotspotDialog: (id) => set({ openHotspot: id }),
  closeHotspotDialog: () => set({ openHotspot: null }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
}));
