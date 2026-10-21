import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { diveInto } from './dive';

// Stepping through a door. Shared by the click path (Doors.tsx) and the E-key
// path (WorldHud) so the two inputs can't drift — there's one place that decides
// what passing through a door DOES (a plain wipe, a painting dive, or a level
// overlay).

export type DoorTravel = {
  to: string;
  spawn: string;
  albumSlug?: string;
  /** If set, this door OPENS A FULL-SCREEN LEVEL overlay (the 1101 text adventure)
   *  instead of traveling to a 3D room. */
  opensLevel?: string;
};

/** Step through `door`: wipe / dive / raise the level overlay. */
export function enterDoor(door: DoorTravel): void {
  audio.unlock();
  // A LEVEL door raises its full-screen overlay in place (the 1101 text adventure)
  // rather than wiping to a 3D room — you "step through" into the level.
  if (door.opensLevel) useSceneStore.getState().openLevel(door.opensLevel);
  else if (door.albumSlug) diveInto(door.albumSlug, door.to, door.spawn);
  else {
    // A plain doorway: the satisfying "chunk" of passing through (the album-portal
    // dive + the level overlay carry their own drama, so the thunk is doorways only).
    audio.playDoorThunk();
    useSceneStore.getState().goToRoom(door.to, door.spawn);
  }
}
