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
  // a bright ding now → a soft "a way opens" fifth ~130ms later (both mute-aware +
  // brickwall-limited by the engine). A plain timer (not world-time) — a 130ms slip
  // past a pause is inaudible and never fires out of band beyond one soft note.
  audio.playChime(noteToFreq('E', 6), 0, 0.14, 0.7);
  window.setTimeout(() => audio.playChime(noteToFreq('B', 6), 0, 0.16, 0.95), 130);
  announce(`🔓 ${it.label} — a way opens`, 'luck');
}
