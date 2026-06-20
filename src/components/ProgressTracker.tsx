import { useEffect } from 'react';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';

// Module-level so a remount (or React StrictMode's double-invoke in dev) can't
// double-count a single page load.
let visitCounted = false;

// Records durable progress into the persistent store (localStorage). Renders
// nothing. Mounted on the storefront — the SPA shell the 3D world mounts *over*
// — so it observes world entry, room/secret changes, and floor depth without a
// route change. All the record* actions are idempotent + guarded, so firing on
// every sceneStore change is cheap.
export function ProgressTracker() {
  useEffect(() => {
    const p = useProgressStore.getState();
    if (!visitCounted) {
      visitCounted = true;
      p.recordVisit();
    }
    const sync = (s: ReturnType<typeof useSceneStore.getState>) => {
      if (s.worldActive) {
        p.markEnteredWorld();
        // Only record rooms while actually IN the world — sceneStore inits
        // currentRoom to the shop before descent, so an unguarded call would
        // mark "shop" visited on page load.
        p.visitRoom(s.currentRoom);
      }
      if (s.secretRevealed) p.findSecret('classified');
      p.recordFloor(s.currentFloor);
    };
    // Seed from current scene state, then track changes.
    sync(useSceneStore.getState());
    return useSceneStore.subscribe(sync);
  }, []);
  return null;
}
