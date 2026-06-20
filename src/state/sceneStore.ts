import { create } from 'zustand';
import { BOTTOM_FLOOR } from '../data/floors';
// FIRST_ROOM is the single source for the starting room id. rooms.ts is
// three-free (it imports plain dims, never three), so the store can use it
// without pulling three.js into the storefront bundle — verified by the
// app-chunk check in the build.
import { FIRST_ROOM } from '../data/rooms';

// Scene/game state. Drives the floor descent (currentFloor), the world mount
// (WorldMount), the hotspot prompts + dialogs, the room graph, and the pause menu.
type SceneState = {
  /** Index into FLOORS — which era floor is showing. 0 = the storefront. */
  currentFloor: number;
  worldActive: boolean;
  /** id of the hotspot the camera is currently near (or null) */
  nearHotspot: string | null;
  /** id of the hotspot whose dialog is open (or null) */
  openHotspot: string | null;
  /** pause menu visible */
  paused: boolean;
  /** the order form asked to start the descent (consumed by Descent) */
  descentRequested: boolean;
  /** the machine room asked to fire the Calzone install (→ world) */
  installRequested: boolean;

  // ── the 3D room graph (rooms.ts) ──────────────────────────────────────────
  /** id of the room currently rendered (Room ids in rooms.ts). */
  currentRoom: string;
  /** which spawn in currentRoom the camera arrived at. */
  currentSpawn: string;
  /** a door was activated: fade out, then commit. null once the room is swapped. */
  pendingRoom: { to: string; spawn: string } | null;
  /** true for the WHOLE door wipe (fade-out + commit + fade-in), so input stays
   *  frozen through the reveal, not just until the swap. Outlives pendingRoom. */
  transitioning: boolean;
  /** the door the camera is near, resolved to its target (or null). */
  nearDoor: { id: string; label: string; to: string; spawn: string } | null;
  /** the rat has knocked the panel: the hidden classified door is now real. */
  secretRevealed: boolean;
  /** How many times you've looped the Möbius corridor this visit. Drives the
   *  dual-register dressing and reveals the "onward" door once it breaks. */
  mobiusLoops: number;
  /** Bumped on every door commit. Lets a door re-spawn you even when the target
   *  room AND spawn id are unchanged — which is exactly the Möbius loop (re-enter
   *  the same room at the same spawn). Controls + MobiusRoom key off it. */
  roomNonce: number;

  /** Go down one floor (forward in web time), clamped to the bottom. */
  descend: () => void;
  /** Go back up one floor, clamped to the storefront. */
  ascend: () => void;
  setFloor: (i: number) => void;
  enterWorld: () => void;
  exitWorld: () => void;
  setNearHotspot: (id: string | null) => void;
  openHotspotDialog: (id: string) => void;
  closeHotspotDialog: () => void;
  setPaused: (paused: boolean) => void;
  togglePaused: () => void;
  requestDescent: () => void;
  clearDescentRequest: () => void;
  /** Fire the Calzone install from the machine room (jumps straight to the
   *  installer; the machine room itself is the prompt). */
  requestInstall: () => void;
  clearInstallRequest: () => void;

  /** Walk through a door: begin the wipe (pendingRoom + transitioning). */
  goToRoom: (to: string, spawn: string) => void;
  /** Commit the pending room swap (mid-wipe): repositions via Controls. */
  commitRoom: () => void;
  /** End the wipe once the overlay has fully lifted: unfreezes input. */
  endTransition: () => void;
  setNearDoor: (door: { id: string; label: string; to: string; spawn: string } | null) => void;
  /** The rat knocked — open up the hidden classified door (idempotent). */
  revealSecret: () => void;
  /** Took the looping corridor's forward door again — count another lap. */
  loopMobius: () => void;
  /** Arrived fresh into the corridor (not via the loop) — reset the lap count. */
  resetMobius: () => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  currentFloor: 0,
  worldActive: false,
  nearHotspot: null,
  openHotspot: null,
  paused: false,
  descentRequested: false,
  installRequested: false,

  currentRoom: FIRST_ROOM,
  currentSpawn: 'default',
  pendingRoom: null,
  transitioning: false,
  nearDoor: null,
  secretRevealed: false,
  mobiusLoops: 0,
  roomNonce: 0,

  descend: () => set((s) => ({ currentFloor: Math.min(s.currentFloor + 1, BOTTOM_FLOOR) })),
  ascend: () => set((s) => ({ currentFloor: Math.max(s.currentFloor - 1, 0) })),
  setFloor: (i) => set({ currentFloor: Math.max(0, Math.min(i, BOTTOM_FLOOR)) }),
  // Entering the world always starts in the first room (the beach shop) with a
  // clean slate — defensively clear any modal/proximity state so the world's
  // input gates never inherit a stale dialog/pause/prompt from the descent.
  enterWorld: () =>
    set({
      worldActive: true,
      currentRoom: FIRST_ROOM,
      currentSpawn: 'default',
      pendingRoom: null,
      transitioning: false,
      secretRevealed: false,
      mobiusLoops: 0,
      paused: false,
      openHotspot: null,
      nearHotspot: null,
      nearDoor: null,
    }),
  // Leaving the world drops you back at the storefront (floor 0), not the
  // machine room you installed from — and resets the room graph for next time.
  exitWorld: () =>
    set({
      worldActive: false,
      paused: false,
      openHotspot: null,
      nearHotspot: null,
      nearDoor: null,
      pendingRoom: null,
      transitioning: false,
      secretRevealed: false,
      mobiusLoops: 0,
      currentRoom: FIRST_ROOM,
      currentSpawn: 'default',
      currentFloor: 0,
    }),
  setNearHotspot: (id) => set({ nearHotspot: id }),
  openHotspotDialog: (id) => set({ openHotspot: id }),
  closeHotspotDialog: () => set({ openHotspot: null }),
  setPaused: (paused) => set({ paused }),
  togglePaused: () => set((s) => ({ paused: !s.paused })),
  requestDescent: () => set({ descentRequested: true }),
  clearDescentRequest: () => set({ descentRequested: false }),
  requestInstall: () => set({ installRequested: true }),
  clearInstallRequest: () => set({ installRequested: false }),

  // Door activation: stash the target and start the fade. THE activation guard
  // for the whole world — both the keyboard (E) and the mouse (door click) paths
  // funnel through here, so a room can never change while a dialog/pause is up or
  // a swap is already in flight (debounces double-press / click-through-the-HUD).
  // Also clears door/hotspot prompts so nothing lingers over the black.
  goToRoom: (to, spawn) =>
    set((s) =>
      s.transitioning || s.paused || s.openHotspot
        ? {}
        : { pendingRoom: { to, spawn }, transitioning: true, nearDoor: null, nearHotspot: null },
    ),
  // Commit mid-wipe: the room actually swaps here (behind the black) and Controls
  // repositions to the new spawn. transitioning stays true through the fade-in.
  commitRoom: () =>
    set((s) =>
      s.pendingRoom
        ? {
            currentRoom: s.pendingRoom.to,
            currentSpawn: s.pendingRoom.spawn,
            pendingRoom: null,
            roomNonce: s.roomNonce + 1,
          }
        : {},
    ),
  endTransition: () => set({ transitioning: false }),
  setNearDoor: (door) => set({ nearDoor: door }),
  revealSecret: () => set((s) => (s.secretRevealed ? {} : { secretRevealed: true })),
  loopMobius: () => set((s) => ({ mobiusLoops: s.mobiusLoops + 1 })),
  resetMobius: () => set((s) => (s.mobiusLoops === 0 ? {} : { mobiusLoops: 0 })),
}));
