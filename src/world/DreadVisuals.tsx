import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { roomById } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useDreadStore } from '../state/dreadStore';
import { mapUnease } from '../data/dread';

// ───────────────────────────────────────────────────────────────────────────
// DreadVisuals — Phase 5, ckpt 3 (in-canvas half). Reads `unease` each frame and
// CLOSES THE FOG IN: the far plane shrinks (and near creeps up) so draw distance
// collapses around you as unease rises. Claustrophobia for free, reusing the PS1
// fog that's already the look. Visual-only — it never touches camera.position, so
// it can't fight the world's proximity/interaction systems.
//
// (Camera bob/shake is intentionally NOT done here: moving the real camera
// displaces what door/hotspot/jukebox proximity reads. It belongs in a later
// pass as a CSS transform on the canvas element, which leaves the scene camera —
// and therefore all interaction — untouched.)
//
// Re-derives fog from the room's palette base each frame (RoomEnvironment sets it
// on room change; we scale from the same base, so the two never drift). null.
// ───────────────────────────────────────────────────────────────────────────
export function DreadVisuals() {
  const { scene } = useThree();
  const currentRoom = useSceneStore((s) => s.currentRoom);

  useFrame(() => {
    const u = useDreadStore.getState().unease;
    const t = mapUnease(u);
    const room = roomById(currentRoom);

    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      // Far plane closes from the room's resting distance toward ~1/2.4 of it.
      fog.far = room.palette.fogFar / t.fogDensityMul;
      // Pull the near plane in a touch too, so it actually crowds you deep —
      // clamped to stay below far.
      fog.near = Math.min(fog.far - 0.5, room.palette.fogNear * (1 - 0.3 * u));
    }
  });

  return null;
}
