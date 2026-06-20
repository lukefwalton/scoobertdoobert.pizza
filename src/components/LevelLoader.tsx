import { useEffect, useState } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { useLevelStore } from '../state/levelStore';
import { roomById, FIRST_ROOM } from '../data/rooms';
import { LoaderGame } from './LoaderGame';

// ───────────────────────────────────────────────────────────────────────────
// LevelLoader — Phase 6. The DOM overlay that masks a GLB level's load behind
// the loader minigame. When the current room is a GLB level, it shows
// <LoaderGame/> over the (suspended) canvas; GlbRoom flips levelStore.ready true
// once the asset has resolved, which turns on TAP-TO-ENTER. Tapping dismisses it,
// revealing the loaded level. Re-entering a cached level just shows a quick
// ready→tap. Mounted in WorldMount.
//
// Failure path: if the GLB can't load, GlbRoom's error boundary flips
// levelStore.error and the loader offers TURN BACK instead — navigating back out
// the room's exit door so a broken asset never traps the player. Without this the
// loader would spin forever (ready never flips) on a 404/decode error.
// ───────────────────────────────────────────────────────────────────────────
export function LevelLoader() {
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const goToRoom = useSceneStore((s) => s.goToRoom);
  const ready = useLevelStore((s) => s.ready);
  const error = useLevelStore((s) => s.error);
  const room = roomById(currentRoom);
  const isGlb = !!room.glb;
  const [dismissed, setDismissed] = useState(false);

  // New level → show the loader again (until tapped in) and clear any stale
  // ready/error flags from the previous level's load.
  useEffect(() => {
    setDismissed(false);
    useLevelStore.getState().reset();
  }, [currentRoom]);

  if (!isGlb || dismissed) return null;

  // Recovery: bounce back out the room's first (exit) door, or to the shop if
  // the failed room somehow has none. The room swaps, the effect above resets
  // the level flags, and the loader unmounts.
  const onAbort = () => {
    const exit = room.doors[0];
    if (exit) goToRoom(exit.to, exit.toSpawn ?? 'default');
    else goToRoom(FIRST_ROOM, 'default');
  };

  return (
    <LoaderGame
      ready={ready}
      error={error}
      label={room.title.toUpperCase()}
      onEnter={() => {
        useLevelStore.getState().setEntered(true);
        setDismissed(true);
      }}
      onAbort={onAbort}
    />
  );
}
