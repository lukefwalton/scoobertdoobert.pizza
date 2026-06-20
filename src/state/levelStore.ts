import { create } from 'zustand';

// Tiny bridge between a GLB level finishing its load (inside the Canvas) and the
// DOM loader overlay (LevelLoader / LoaderGame). GlbRoom only renders once its
// asset has resolved, so it flips `ready` true on mount — deterministic, no
// useProgress race.
type LevelState = { ready: boolean; setReady: (r: boolean) => void };

export const useLevelStore = create<LevelState>((set) => ({
  ready: false,
  setReady: (ready) => set({ ready }),
}));
