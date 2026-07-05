import { useSceneStore } from '../state/sceneStore';
import { useRhythmStore } from '../state/rhythmStore';
import { enterDoor } from './doorTravel';
import { launchRandomArcade } from './arcade';
import { collectInventoryItem } from './pickups';
import { collectLootById } from './loot';

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
    st.tvVideo ||
    st.arcadeGame ||
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
    });
  } else if (st.nearTv) {
    st.openTv(st.nearTv);
  } else if (st.nearArcade) {
    launchRandomArcade();
  } else if (st.nearHotspot) {
    st.openHotspotDialog(st.nearHotspot);
  } else if (st.nearNpc) {
    st.openNpcDialog(st.nearNpc.id);
  } else if (st.nearEntity) {
    useRhythmStore.getState().start(st.nearEntity.id, st.nearEntity.label);
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
