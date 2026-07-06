import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { noteToFreq } from './chimes';
import { announce } from '../state/toastStore';
import type { RoomInteractable } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// fireInteractable — the shared "ring the bell / flip the switch" verb of the
// escape-room grammar. Reveals the interactable's `revealOnTrigger` door and
// plays the juice (a ding, a soft "a way opens" follow-up, the toast).
//
// Called by BOTH the mesh onClick (Interactables.tsx) AND the E / touch action
// verb (lib/worldActions.interactNearby), so ringing the counter bell answers the
// same "Press E" the rest of the world teaches — not just a mouse click. No-op if
// the trigger already fired. Deliberately three-free (the collect-burst is emitted
// by the world mesh when its trigger flips) so this stays in the lib layer.
// ───────────────────────────────────────────────────────────────────────────
export function fireInteractable(it: RoomInteractable): void {
  const st = useSceneStore.getState();
  if (st.triggersFired.includes(it.revealsTrigger)) return; // already solved — no-op
  st.fireTrigger(it.revealsTrigger);
  audio.unlock(); // the click / E / tap IS the user gesture
  // A bright ding NOW (the interaction only happens un-paused, so an immediate play
  // is fine). The soft "a way opens" follow-up fifth is scheduled by the world mesh
  // on WORLD time (Interactables.tsx useFrame + inputFrozen), so it freezes with a
  // pause and dies with the room — the repo's "in-world audio rides the R3F clock"
  // rule. Keeping it there is also what keeps this verb three-free.
  audio.playChime(noteToFreq('E', 6), 0, 0.14, 0.7);
  announce(`🔓 ${it.label} — a way opens`, 'luck');
}
