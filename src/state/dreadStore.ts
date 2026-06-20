import { create } from 'zustand';

// ───────────────────────────────────────────────────────────────────────────
// src/state/dreadStore.ts — the live `unease` value (0..1).
//
// DreadConductor owns the math and writes `unease` here every frame; the dread
// instruments (audio bed, shader uniforms, fog, camera, rat — later checkpoints)
// READ it. Kept separate from sceneStore (nav/scene) and progressStore (durable
// save): this is per-frame, ephemeral mood. `override` is the ?debug manual
// take-over for tuning the arc by hand.
// ───────────────────────────────────────────────────────────────────────────

type DreadState = {
  /** Current smoothed unease, 0..1. */
  unease: number;
  /** Manual override (?debug). null = the conductor drives it automatically. */
  override: number | null;
  setUnease: (u: number) => void;
  setOverride: (o: number | null) => void;
};

export const useDreadStore = create<DreadState>((set) => ({
  unease: 0,
  override: null,
  setUnease: (u) => set({ unease: u }),
  setOverride: (o) => set({ override: o }),
}));
