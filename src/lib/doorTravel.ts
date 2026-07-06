import { useProgressStore } from '../state/progressStore';
import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { audio } from '../audio/engine';
import { noteToFreq } from './chimes';
import { diveInto } from './dive';
import { itemById } from '../data/items';

// Stepping through a door, honoring a key LOCK. Shared by the click path
// (Doors.tsx) and the E-key path (WorldHud) so the lock can't be bypassed by
// using one input instead of the other — there's one place that decides whether
// a door opens.

export type DoorTravel = {
  to: string;
  spawn: string;
  albumSlug?: string;
  /** items.ts key id required to pass — undefined for an ordinary door. */
  requiresKey?: string;
  /** If set, this door OPENS A FULL-SCREEN LEVEL overlay (the 1101 text adventure)
   *  instead of traveling to a 3D room. Honors the key lock first, like any door. */
  opensLevel?: string;
};

/** True when the player is missing the key this door needs. */
export function doorLocked(door: Pick<DoorTravel, 'requiresKey'>): boolean {
  return !!door.requiresKey && !useProgressStore.getState().itemsHeld.includes(door.requiresKey);
}

/** Step through `door`. If it's locked and you lack the key, announce it (with a
 *  low "nope" tone) and DON'T travel — returns false. Otherwise wipes/dives to
 *  the target and returns true. */
export function enterDoor(door: DoorTravel): boolean {
  if (doorLocked(door)) {
    const item = door.requiresKey ? itemById(door.requiresKey) : undefined;
    announce(`🔒 Locked. You'd need the ${item?.label ?? 'right key'}.`, 'info');
    audio.unlock();
    audio.playChime(noteToFreq('A', 2), 0, 0.12, 0.6); // a dull low clunk — no entry
    return false;
  }
  audio.unlock();
  // A LEVEL door raises its full-screen overlay in place (the 1101 text adventure)
  // rather than wiping to a 3D room — you "step through" into the level.
  if (door.opensLevel) useSceneStore.getState().openLevel(door.opensLevel);
  else if (door.albumSlug) diveInto(door.albumSlug, door.to, door.spawn);
  else useSceneStore.getState().goToRoom(door.to, door.spawn);
  return true;
}
