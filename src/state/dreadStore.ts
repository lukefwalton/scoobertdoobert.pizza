import { create } from 'zustand';
import { DREAD } from '../data/dread';

// ───────────────────────────────────────────────────────────────────────────
// src/state/dreadStore.ts — the live `unease` value (0..1).
//
// DreadConductor owns the math and writes `unease` here every frame; the dread
// instruments (audio bed, shader uniforms, fog, camera, rat — later checkpoints)
// READ it. Kept separate from sceneStore (nav/scene) and progressStore (durable
// save): this is per-frame, ephemeral mood. `override` is the ?debug manual
// take-over for tuning the arc by hand.
//
// `relief` is the SPELL push-back: a cast (lib/spellcast) bumps it; the conductor
// subtracts it from the unease target and bleeds it off, so a Fireball/Light
// briefly lifts the dark, then it creeps back. Capped at DREAD.reliefMax so the
// depths stay eerie — relief is partial, never an off-switch.
// ───────────────────────────────────────────────────────────────────────────

type DreadState = {
  /** Current smoothed unease, 0..1. */
  unease: number;
  /** Manual override (?debug). null = the conductor drives it automatically. */
  override: number | null;
  /** Active spell relief 0..reliefMax — subtracted from the unease target. */
  relief: number;
  setUnease: (u: number) => void;
  setOverride: (o: number | null) => void;
  /** Add to the relief pool (a cast), clamped to DREAD.reliefMax. */
  addRelief: (n: number) => void;
  /** The conductor writes the decayed relief back each frame. */
  setRelief: (n: number) => void;
};

export const useDreadStore = create<DreadState>((set) => ({
  unease: 0,
  override: null,
  relief: 0,
  setUnease: (u) => set({ unease: u }),
  setOverride: (o) => set({ override: o }),
  addRelief: (n) =>
    set((s) => ({ relief: Math.min(DREAD.reliefMax, Math.max(0, s.relief + Math.max(0, n))) })),
  setRelief: (n) => set({ relief: Math.max(0, Math.min(DREAD.reliefMax, n)) }),
}));
