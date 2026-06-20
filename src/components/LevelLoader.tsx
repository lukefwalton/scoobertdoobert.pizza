import { useEffect, useState } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { useLevelStore } from '../state/levelStore';
import { roomById } from '../data/rooms';
import { LoaderGame } from './LoaderGame';

// ───────────────────────────────────────────────────────────────────────────
// LevelLoader — Phase 6. The DOM overlay that masks a GLB level's load behind
// the loader minigame. When the current room is a GLB level, it shows
// <LoaderGame/> over the (suspended) canvas; GlbRoom flips levelStore.ready true
// once the asset has resolved, which turns on TAP-TO-ENTER. Tapping dismisses it,
// revealing the loaded level. Re-entering a cached level just shows a quick
// ready→tap. Mounted in WorldMount.
// ───────────────────────────────────────────────────────────────────────────
export function LevelLoader() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const ready = useLevelStore((s) => s.ready);
  const room = roomById(currentRoom);
  const isGlb = !!room.glb;
  const [dismissed, setDismissed] = useState(false);

  // New level → show the loader again (until tapped in).
  useEffect(() => {
    setDismissed(false);
  }, [currentRoom]);

  if (!isGlb || dismissed) return null;
  return (
    <LoaderGame
      ready={ready}
      label={room.title.toUpperCase()}
      onEnter={() => setDismissed(true)}
    />
  );
}
