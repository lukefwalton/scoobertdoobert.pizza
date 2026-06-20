import { create } from 'zustand';

// Tiny bridge between a GLB level finishing its load (inside the Canvas) and the
// DOM loader overlay (LevelLoader / LoaderGame).
//
// `ready` is owned EXCLUSIVELY by GlbRoom's lifecycle: it sets ready=true on
// mount (it only mounts once the asset has resolved) and ready=false on unmount.
// This is deliberate — on a CACHED revisit useGLTF resolves synchronously, so
// GlbRoom mounts in the same commit the room changes. If LevelLoader also forced
// ready=false in a room-change effect, that reset could land AFTER GlbRoom's
// setReady(true) (World renders before LevelLoader in WorldMount, so its effects
// run first), stranding the loader at ready=false forever. Letting the
// mount/unmount own `ready` removes that race: prepareForRoom() never touches it.
//
// `error` is the failure path: if the GLB 404s or fails to decode, the in-canvas
// error boundary (GlbRoom) flips it so the loader can offer a graceful way back
// out instead of trapping the player on a loader that never turns ready.
// `entered` is false while the loader overlay is up and true once the player taps
// in — Controls reads it to FREEZE first-person input under the overlay, so
// WASD/look can't drift the camera behind the loader.
type LevelState = {
  ready: boolean;
  error: boolean;
  entered: boolean;
  setReady: (r: boolean) => void;
  setError: (e: boolean) => void;
  setEntered: (e: boolean) => void;
  /** Clear the overlay state for a newly-entered room. Does NOT touch `ready`
   *  (GlbRoom owns that via mount/unmount — see the note above). */
  prepareForRoom: () => void;
};

export const useLevelStore = create<LevelState>((set) => ({
  ready: false,
  error: false,
  entered: false,
  setReady: (ready) => set({ ready }),
  setError: (error) => set({ error }),
  setEntered: (entered) => set({ entered }),
  prepareForRoom: () => set({ error: false, entered: false }),
}));
