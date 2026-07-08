import { useSceneStore } from '../state/sceneStore';
import { useRhythmStore } from '../state/rhythmStore';
import { enterDoor } from './doorTravel';
import { launchArcadeGame, launchRandomArcade } from './arcade';
import { collectInventoryItem } from './pickups';
import { collectLootById } from './loot';
import { fireInteractable } from './interactables';
import { restoreAtBench } from './restoration';

// The world's context verbs, shared by the keyboard handler (WorldHud) and the
// on-screen touch buttons (TouchControls) so the two never drift. Each reads the
// live scene store and dispatches the nearest interaction — the exact logic that
// used to live inline in the E/P keydown branches.

type SceneState = ReturnType<typeof useSceneStore.getState>;

// A modal/pause/transition owns input — no world verb should fire underneath it.
// (The keyboard path already returns early on transitioning/divingTo; touch has
// no such pre-guard, so it's folded in here to keep both callers safe.)
function inputOwnedByModal(st: SceneState): boolean {
  return !!(
    st.paused ||
    st.openHotspot ||
    st.openLookable ||
    st.tvVideo ||
    st.arcadeGame ||
    st.levelOverlay ||
    st.openNpc ||
    st.transitioning ||
    st.divingTo
  );
}

/** What the context button / E does: enter a near door, switch on a near TV,
 *  play a near cabinet, open a near hotspot/NPC, or dance with a near entity —
 *  in that priority order. No-op when a modal owns input or nothing's near. */
export function interactNearby(): void {
  const st = useSceneStore.getState();
  if (inputOwnedByModal(st)) return;
  // A door takes priority over a hotspot if you're somehow near both.
  if (st.nearDoor) {
    enterDoor({
      to: st.nearDoor.to,
      spawn: st.nearDoor.spawn,
      albumSlug: st.nearDoor.albumSlug,
      requiresKey: st.nearDoor.requiresKey,
      opensLevel: st.nearDoor.opensLevel,
    });
  } else if (st.nearInteractable) {
    // The escape-room bell/switch — ranks just under a door so ringing it answers
    // the same "Press E" the world teaches (keyboard-reachable, not click-only).
    fireInteractable(st.nearInteractable);
  } else if (st.nearTv) {
    st.openTv(st.nearTv);
  } else if (st.nearRestoreBench) {
    // The control room's reel-to-reel: restore the playing track (or hear the
    // deck's reason). Repeatable, so it's a near* verb — never an Interactable.
    void restoreAtBench();
  } else if (st.nearArcade) {
    // A dedicated cabinet launches ITS game; the mystery cabinet (null) rolls.
    if (st.nearArcadeGame) launchArcadeGame(st.nearArcadeGame);
    else launchRandomArcade();
  } else if (st.nearBooth) {
    // The kitchen's Pizza Cam™ tripod — always the booth, never a roll (the
    // camera instrument is entered on purpose; consent gate lives inside).
    st.openArcade('booth');
  } else if (st.nearHotspot) {
    st.openHotspotDialog(st.nearHotspot);
  } else if (st.nearNpc) {
    st.openNpcDialog(st.nearNpc.id);
  } else if (st.nearEntity) {
    useRhythmStore.getState().start(st.nearEntity.id, st.nearEntity.label);
  } else if (st.nearLookable) {
    // Lowest priority: a flavor curio only opens if nothing else is in reach.
    st.openLookableDialog(st.nearLookable);
  }
}

/** What the grab button / P does: pick up the nearest collectible (loot or
 *  inventory item). No-op when a modal owns input or nothing's near. */
export function grabNearby(): void {
  const st = useSceneStore.getState();
  if (inputOwnedByModal(st) || st.lyricsSong) return;
  if (!st.nearPickup) return;
  if (st.nearPickup.kind === 'loot') collectLootById(st.nearPickup.id);
  else collectInventoryItem(st.nearPickup.id);
}
