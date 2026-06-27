import { create } from 'zustand';
import { BOTTOM_FLOOR } from '../data/floors';
// FIRST_ROOM is the single source for the starting room id. rooms.ts is
// three-free (it imports plain dims, never three), so the store can use it
// without pulling three.js into the storefront bundle — verified by the
// app-chunk check in the build.
import { FIRST_ROOM } from '../data/rooms';
import { type TvVideo } from '../data/videos';
import { type ArcadeGameId } from '../data/arcadeGames';

/** How long a painting cover ripples + swallows the view before the room wipe
 *  begins — the SM64 dive window (the FramedCover shader reads divingTo). */
export const DIVE_MS = 520;

// The pending dive's timer handle, kept at module scope so exitWorld/enterWorld can
// CANCEL it — a bare uncancellable setTimeout could fire goToRoom after you'd already
// left the world. One dive is ever in flight (enterPainting guards re-entry).
let diveTimer: number | undefined;
const clearDiveTimer = () => {
  if (diveTimer !== undefined) {
    window.clearTimeout(diveTimer);
    diveTimer = undefined;
  }
};

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
  /** A navigation requested DURING a wipe. Input is frozen mid-wipe, so this only
   *  ever catches a fast PROGRAMMATIC re-nav (e.g. recovering from a failed GLB
   *  level and heading straight back down). Deferred, never dropped — WorldHud
   *  flushes it the instant the wipe ends, so a re-entry can't silently vanish. */
  queuedRoom: { to: string; spawn: string } | null;
  /** true for the WHOLE door wipe (fade-out + commit + fade-in), so input stays
   *  frozen through the reveal, not just until the swap. Outlives pendingRoom. */
  transitioning: boolean;
  /** the door the camera is near, resolved to its target (or null). albumSlug marks
   *  a PAINTING portal (E dives into the cover instead of a plain door wipe);
   *  requiresKey marks a LOCKED door (WorldHud shows the lock + E announces it). */
  nearDoor: {
    id: string;
    label: string;
    to: string;
    spawn: string;
    albumSlug?: string;
    requiresKey?: string;
  } | null;
  /** the collectible the camera is near (its id + how it reads), or null — drives
   *  the "Press P to grab …" prompt + the P action. Walk closer still auto-grabs;
   *  this is the prompt/keyboard path. Set by PickupController each frame. */
  nearPickup: { id: string; label: string; glyph: string } | null;
  /** the room TV the camera is standing in front of (its already-resolved clip), or
   *  null — drives the "Press E to switch on the TV" prompt + the E action (openTv).
   *  The TV is also clickable; this is the keyboard/proximity path, like doors. */
  nearTv: TvVideo | null;
  /** the camera is standing in front of an arcade CABINET — drives its "Press E to
   *  play" prompt + the E action (launchRandomArcade). Boolean, not an id: at most
   *  one cabinet per room. Cleared when the cabinet unmounts (you leave the room). */
  nearArcade: boolean;
  /** A dancing Wanderer the camera is close to (its id + a friendly label), or
   *  null — drives the "Press E to dance along" prompt + the E action. Set by the
   *  nearest dancing entity each frame, like nearDoor/nearTv. */
  nearEntity: { id: string; label: string } | null;
  /** Whether the on-screen objective chip + compass is shown (pause-menu toggle).
   *  Ephemeral UI pref; defaults on. */
  objectiveHudOn: boolean;
  /** An NPC the camera is near + can talk to (the rat once settled), or null —
   *  drives the "Press E to talk" prompt. */
  nearNpc: { id: string; label: string } | null;
  /** The NPC whose dialogue box is open (its id), or null. */
  openNpc: string | null;
  /** A "dance back" pulse: when you dance along with an entity, cheerId names it
   *  and cheerNonce bumps, so that Wanderer can flourish for a beat. */
  cheerId: string | null;
  cheerNonce: number;
  /** The finale pulse: bumps when you complete every objective, so EVERY wanderer
   *  in the room breaks into a celebratory group dance for a few seconds. */
  finaleNonce: number;
  /** Mid-DIVE into a painting portal: the destination room id while the cover
   *  ripples + swallows the view, before the room actually swaps. null otherwise. */
  divingTo: string | null;
  /** A CRT in an album-room was switched on: the video to play in the modal TV
   *  overlay (the far side of a painting — the album's music videos). null = closed. */
  tvVideo: TvVideo | null;
  /** A cabinet was fired up: which game's modal is open (a random roll), or null.
   *  Same modal grammar as tvVideo — the far side of a cabinet is a real minigame. */
  arcadeGame: ArcadeGameId | null;
  /** The lyric reader (pause-menu "read the words") is open on this jukebox slug,
   *  or null. Same modal grammar as tvVideo — Esc closes it before the pause menu. */
  lyricsSong: string | null;
  /** the rat has knocked the panel: the hidden classified door is now real. */
  secretRevealed: boolean;
  /** How many times you've looped the Möbius corridor this visit. Drives the
   *  dual-register dressing and reveals the "onward" door once it breaks. */
  mobiusLoops: number;
  /** Bumped on every door commit. Lets a door re-spawn you even when the target
   *  room AND spawn id are unchanged — which is exactly the Möbius loop (re-enter
   *  the same room at the same spawn). Controls + MobiusRoom key off it. */
  roomNonce: number;
  /** A spell was cast: the spell id + a bumping nonce, so the world's RoomFireball
   *  fires a one-shot effect each time (the same pulse grammar as cheerNonce /
   *  finaleNonce). Transient/ephemeral — the slot economy lives in progressStore;
   *  this is just the visual trigger. */
  castingSpell: string | null;
  castNonce: number;

  /** Go down one floor (forward in web time), clamped to the bottom. */
  descend: () => void;
  /** Go back up one floor, clamped to the storefront. */
  ascend: () => void;
  setFloor: (i: number) => void;
  /** Enter the 3D world. Defaults to the first room (the normal descent); an
   *  optional room + spawn drops you straight into a specific room — used by the
   *  trap door (a deep room the d20 picks) and the ?room= test entrance. */
  enterWorld: (room?: string, spawn?: string) => void;
  exitWorld: () => void;
  setNearHotspot: (id: string | null) => void;
  openHotspotDialog: (id: string) => void;
  closeHotspotDialog: () => void;
  /** Switch a CRT in an album-room on (modal video overlay) / off. */
  openTv: (video: TvVideo) => void;
  closeTv: () => void;
  /** Fire up a cabinet (open its rolled game's modal) / close it. */
  openArcade: (id: ArcadeGameId) => void;
  closeArcade: () => void;
  /** Open the lyric reader on a jukebox slug / close it. */
  openLyrics: (slug: string) => void;
  closeLyrics: () => void;
  setNearArcade: (near: boolean) => void;
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
  /** Dive INTO a painting portal: ripple the cover for a beat (divingTo), then walk
   *  through to `to`. Both click + E funnel here for painting doors. */
  enterPainting: (to: string, spawn: string) => void;
  /** Commit the pending room swap (mid-wipe): repositions via Controls. */
  commitRoom: () => void;
  /** End the wipe once the overlay has fully lifted: unfreezes input. */
  endTransition: () => void;
  setNearDoor: (
    door: {
      id: string;
      label: string;
      to: string;
      spawn: string;
      albumSlug?: string;
      requiresKey?: string;
    } | null,
  ) => void;
  setNearPickup: (pickup: { id: string; label: string; glyph: string } | null) => void;
  setNearTv: (video: TvVideo | null) => void;
  setNearEntity: (entity: { id: string; label: string } | null) => void;
  /** Dance along with an entity → pulse its cheer (the Wanderer flourishes). */
  cheerEntity: (id: string) => void;
  /** Fire the finale: every wanderer breaks into a group dance for a few seconds. */
  triggerFinale: () => void;
  toggleObjectiveHud: () => void;
  setNearNpc: (npc: { id: string; label: string } | null) => void;
  openNpcDialog: (id: string) => void;
  closeNpcDialog: () => void;
  /** The rat knocked — open up the hidden classified door (idempotent). */
  revealSecret: () => void;
  /** Took the looping corridor's forward door again — count another lap. */
  loopMobius: () => void;
  /** Arrived fresh into the corridor (not via the loop) — reset the lap count. */
  resetMobius: () => void;
  /** Fire a spell's world effect (RoomFireball watches castNonce). Pure visual
   *  trigger — lib/spellcast already spent the slot + announced. */
  triggerCastFx: (spellId: string) => void;
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
  queuedRoom: null,
  transitioning: false,
  nearDoor: null,
  nearPickup: null,
  nearTv: null,
  nearEntity: null,
  objectiveHudOn: true,
  nearNpc: null,
  openNpc: null,
  cheerId: null,
  cheerNonce: 0,
  finaleNonce: 0,
  divingTo: null,
  tvVideo: null,
  arcadeGame: null,
  lyricsSong: null,
  nearArcade: false,
  secretRevealed: false,
  mobiusLoops: 0,
  roomNonce: 0,
  castingSpell: null,
  castNonce: 0,

  descend: () => set((s) => ({ currentFloor: Math.min(s.currentFloor + 1, BOTTOM_FLOOR) })),
  ascend: () => set((s) => ({ currentFloor: Math.max(s.currentFloor - 1, 0) })),
  setFloor: (i) => set({ currentFloor: Math.max(0, Math.min(i, BOTTOM_FLOOR)) }),
  // Entering the world starts in the first room (the beach shop) by default,
  // with a clean slate — defensively clear any modal/proximity state so the
  // world's input gates never inherit a stale dialog/pause/prompt from the
  // descent. An explicit room + spawn drops you elsewhere — the trap door (a deep
  // room the d20 picks) and the ?room= test entrance both use it; the clean-slate
  // reset is the same either way.
  enterWorld: (room = FIRST_ROOM, spawn = 'default') => {
    clearDiveTimer();
    set({
      worldActive: true,
      currentRoom: room,
      currentSpawn: spawn,
      pendingRoom: null,
      queuedRoom: null,
      transitioning: false,
      divingTo: null,
      tvVideo: null,
      secretRevealed: false,
      mobiusLoops: 0,
      paused: false,
      openHotspot: null,
      nearHotspot: null,
      nearDoor: null,
      nearPickup: null,
      nearTv: null,
      nearEntity: null,
      nearNpc: null,
      openNpc: null,
      nearArcade: false,
      arcadeGame: null,
      lyricsSong: null,
    });
  },
  // Leaving the world drops you back at the storefront (floor 0), not the
  // machine room you installed from — and resets the room graph for next time.
  exitWorld: () => {
    // Cancel any in-flight painting dive so its delayed goToRoom can't fire into a
    // world we've already left.
    clearDiveTimer();
    set({
      worldActive: false,
      paused: false,
      openHotspot: null,
      nearHotspot: null,
      nearDoor: null,
      nearPickup: null,
      nearTv: null,
      nearEntity: null,
      nearNpc: null,
      openNpc: null,
      nearArcade: false,
      arcadeGame: null,
      lyricsSong: null,
      pendingRoom: null,
      queuedRoom: null,
      transitioning: false,
      divingTo: null,
      tvVideo: null,
      secretRevealed: false,
      mobiusLoops: 0,
      currentRoom: FIRST_ROOM,
      currentSpawn: 'default',
      currentFloor: 0,
    });
  },
  setNearHotspot: (id) => set({ nearHotspot: id }),
  openHotspotDialog: (id) => set({ openHotspot: id }),
  closeHotspotDialog: () => set({ openHotspot: null }),
  openTv: (video) => set({ tvVideo: video }),
  closeTv: () => set({ tvVideo: null }),
  openArcade: (id) => set({ arcadeGame: id }),
  closeArcade: () => set({ arcadeGame: null }),
  openLyrics: (slug) => set({ lyricsSong: slug }),
  closeLyrics: () => set({ lyricsSong: null }),
  setNearArcade: (near) => set({ nearArcade: near }),
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
    set((s) => {
      // A pause/dialog is a hard block — never honor a nav fired into a menu.
      if (s.paused || s.openHotspot) return {};
      // Mid-wipe: don't start an overlapping wipe, but don't silently LOSE the
      // intent either. Dropping it stranded fast re-navigations — recover from a
      // failed GLB level then immediately head back down and the re-entry vanished
      // (you sat in the prior room, no loader, no feedback). Keep the latest;
      // WorldHud flushes it when the wipe ends.
      if (s.transitioning) return { queuedRoom: { to, spawn } };
      return {
        pendingRoom: { to, spawn },
        transitioning: true,
        queuedRoom: null,
        nearDoor: null,
        nearPickup: null,
        nearHotspot: null,
        nearTv: null,
        nearEntity: null,
        nearNpc: null,
        openNpc: null,
      };
    }),
  // Dive into a painting: ripple/swallow the cover for DIVE_MS (divingTo drives the
  // FramedCover shader), THEN funnel through goToRoom for the real wipe + swap. The
  // album's track is started by the caller (the reward is sound) before this runs.
  enterPainting: (to, spawn) =>
    set((s) => {
      // divingTo in the guard makes the dive idempotent: a second trigger during the
      // ripple is ignored, not stacked into a second delayed goToRoom.
      if (s.paused || s.openHotspot || s.transitioning || s.divingTo) return {};
      clearDiveTimer();
      diveTimer = window.setTimeout(() => {
        diveTimer = undefined;
        useSceneStore.getState().goToRoom(to, spawn);
        set({ divingTo: null });
      }, DIVE_MS);
      return {
        divingTo: to,
        nearDoor: null,
        nearPickup: null,
        nearHotspot: null,
        nearTv: null,
        nearEntity: null,
        nearNpc: null,
        openNpc: null,
      };
    }),
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
  setNearPickup: (pickup) => set({ nearPickup: pickup }),
  setNearTv: (video) => set({ nearTv: video }),
  setNearEntity: (entity) => set({ nearEntity: entity }),
  cheerEntity: (id) => set((s) => ({ cheerId: id, cheerNonce: s.cheerNonce + 1 })),
  triggerFinale: () => set((s) => ({ finaleNonce: s.finaleNonce + 1 })),
  toggleObjectiveHud: () => set((s) => ({ objectiveHudOn: !s.objectiveHudOn })),
  setNearNpc: (npc) => set({ nearNpc: npc }),
  openNpcDialog: (id) => set({ openNpc: id }),
  closeNpcDialog: () => set({ openNpc: null }),
  revealSecret: () => set((s) => (s.secretRevealed ? {} : { secretRevealed: true })),
  loopMobius: () => set((s) => ({ mobiusLoops: s.mobiusLoops + 1 })),
  resetMobius: () => set((s) => (s.mobiusLoops === 0 ? {} : { mobiusLoops: 0 })),
  triggerCastFx: (spellId) => set((s) => ({ castingSpell: spellId, castNonce: s.castNonce + 1 })),
}));
