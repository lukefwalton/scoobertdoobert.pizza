import { create } from 'zustand';

// The live camera pose (room-local x/z + yaw), written by Controls a few times a
// second (throttled — see Controls) so the DOM ObjectiveHud compass can point at
// the next door without reaching into three. Ephemeral; not persisted.
//
// Kept tiny + separate from sceneStore so a ~15 Hz write doesn't churn the bigger
// scene store's many subscribers — only the compass reads this.
type Heading = {
  x: number;
  z: number;
  /** radians about +Y; forward = (sin yaw, cos yaw), matching Controls. */
  yaw: number;
  set: (x: number, z: number, yaw: number) => void;
};

export const useHeadingStore = create<Heading>((set) => ({
  x: 0,
  z: 0,
  yaw: Math.PI,
  set: (x, z, yaw) => set({ x, z, yaw }),
}));
