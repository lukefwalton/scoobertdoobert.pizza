import { useEffect, useRef, useState } from 'react';
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
  // Latches a TURN BACK so repeated clicks can't enqueue overlapping recovery
  // polls / double-navigate. Reset when a new room is entered.
  const aborting = useRef(false);

  // New room → show the loader again (until tapped in) and clear the overlay
  // state. Note this does NOT reset `ready` — GlbRoom owns that via mount/unmount
  // (see levelStore), which is what makes cached re-entry safe.
  useEffect(() => {
    setDismissed(false);
    aborting.current = false;
    useLevelStore.getState().prepareForRoom();
  }, [currentRoom]);

  if (!isGlb || dismissed) return null;

  // Recovery: bounce out the room's EXPLICIT recover target if it has one, else
  // its first door, else the shop. Explicit metadata so a future door reorder
  // can't silently change where a failed load drops the player.
  //
  // A GLB can fail (and the loader offer TURN BACK) BEFORE the door-wipe INTO it
  // has finished — goToRoom debounces while `transitioning`, so an instant abort
  // would be swallowed. Wait for the entry wipe to settle, then navigate cleanly
  // (the loader overlay is up + input frozen throughout, so the wait is unseen).
  const onAbort = () => {
    if (aborting.current) return; // already recovering — ignore repeat clicks
    aborting.current = true;
    const go = () => {
      if (useSceneStore.getState().transitioning) {
        window.setTimeout(go, 60);
        return;
      }
      const recover = room.glb?.recoverTo;
      if (recover) goToRoom(recover.to, recover.spawn ?? 'default');
      else if (room.doors[0]) goToRoom(room.doors[0].to, room.doors[0].toSpawn ?? 'default');
      else goToRoom(FIRST_ROOM, 'default');
    };
    go();
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
