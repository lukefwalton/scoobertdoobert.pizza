import { create } from 'zustand';

// Tiny bridge between a GLB level finishing its load (inside the Canvas) and the
// DOM loader overlay (LevelLoader).
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
//
// There is deliberately NO separate `entered` flag: GLB levels AUTO-ENTER now (the
// old tap-to-enter minigame was removed), so "entered" would just track
// `ready && !error`. Controls freezes first-person input on `!ready` directly —
// folding it into the race-free `ready` lifecycle, instead of a second flag that a
// GLB→GLB room change could reset out from under the auto-enter and strand frozen.
type LevelState = {
  ready: boolean;
  error: boolean;
  setReady: (r: boolean) => void;
  setError: (e: boolean) => void;
  /** Clear the error state for a newly-entered room. Does NOT touch `ready`
   *  (GlbRoom owns that via mount/unmount — see the note above). */
  prepareForRoom: () => void;
};

export const useLevelStore = create<LevelState>((set) => ({
  ready: false,
  error: false,
  setReady: (ready) => set({ ready }),
  setError: (error) => set({ error }),
  prepareForRoom: () => set({ error: false }),
}));
