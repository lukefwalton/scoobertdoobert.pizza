import { create } from 'zustand';

// Tiny scene/game state: whether we've descended into the 3D world. The descent
// gag (step 3), the pause menu (step 5), and WorldMount all read/drive this.
type SceneState = {
  worldActive: boolean;
  enterWorld: () => void;
  exitWorld: () => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  worldActive: false,
  enterWorld: () => set({ worldActive: true }),
  exitWorld: () => set({ worldActive: false }),
}));
