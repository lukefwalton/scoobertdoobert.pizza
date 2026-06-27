import { roomById } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useLevelStore } from '../state/levelStore';
import { useRhythmStore } from '../state/rhythmStore';

// Should world input (camera move/look, door E, pickups) be frozen this frame?
// True under a modal overlay (pause / hotspot / NPC dialog), the painting-dive
// ripple, a room wipe, or while a GLB level is still loading behind its panel.
// Extracted from Controls so the PickupController shares the SAME freeze rule —
// you can't grab while paused/mid-wipe/loading, exactly like you can't walk.
export function inputFrozen(): boolean {
  const st = useSceneStore.getState();
  if (
    st.paused ||
    st.openHotspot !== null ||
    st.openNpc !== null ||
    st.transitioning ||
    st.tvVideo !== null ||
    st.divingTo !== null ||
    useRhythmStore.getState().active
  )
    return true;
  const room = roomById(st.currentRoom);
  if (room.glb && !useLevelStore.getState().ready) return true;
  return false;
}
