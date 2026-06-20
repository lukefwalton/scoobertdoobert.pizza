import { create } from 'zustand';

// Tiny bridge between a GLB level finishing its load (inside the Canvas) and the
// DOM loader overlay (LevelLoader / LoaderGame). GlbRoom only renders once its
// asset has resolved, so it flips `ready` true on mount — deterministic, no
// useProgress race. `error` is the failure path: if the GLB 404s or fails to
// decode, the in-canvas error boundary (GlbRoom) flips it so the loader can
// offer a graceful way back out instead of trapping the player on a loader that
// never turns ready. `entered` is false while the loader overlay is up and true
// once the player taps in — Controls reads it to FREEZE first-person input under
// the overlay, so WASD/look can't drift the camera behind the loader.
type LevelState = {
  ready: boolean;
  error: boolean;
  entered: boolean;
  setReady: (r: boolean) => void;
  setError: (e: boolean) => void;
  setEntered: (e: boolean) => void;
  /** Clear all flags — called when a new level starts loading. */
  reset: () => void;
};

export const useLevelStore = create<LevelState>((set) => ({
  ready: false,
  error: false,
  entered: false,
  setReady: (ready) => set({ ready }),
  setError: (error) => set({ error }),
  setEntered: (entered) => set({ entered }),
  reset: () => set({ ready: false, error: false, entered: false }),
}));
