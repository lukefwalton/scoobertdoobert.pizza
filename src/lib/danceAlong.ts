import { useProgressStore } from '../state/progressStore';
import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { audio } from '../audio/engine';
import { noteToFreq } from './chimes';

// Dancing back with a Wanderer — the Meaningful-Choice payoff for MEETING an
// entity instead of just walking past it. A light boop, the entity flourishes
// (cheerEntity → the Wanderer amps its dance for a beat), and the FIRST time you
// dance with a given entity it tips a little luck, gated once-only by a durable
// `danced:<id>` secret (no farming). Non-traumatic by construction: it's a dance.

/** The durable secret id recording that you've danced with entity `id`. */
export const dancedSecret = (id: string): string => `danced:${id}`;

/** How many distinct entities you've danced with (for the Progress readout / quest). */
export function dancedCount(secretsFound: string[]): number {
  return secretsFound.filter((s) => s.startsWith('danced:')).length;
}

/** Dance along (E / the touch Dance button beside a dancing wanderer). Idempotent
 *  reward; always cheers the entity into a flourish. (2026-10: the arrow-key
 *  rhythm minigame that used to sit between the press and this payout was cut —
 *  the dance IS the beat.) */
export function rewardDance(id: string, label: string): void {
  const p = useProgressStore.getState();
  audio.unlock();
  audio.playChime(noteToFreq('A', 5), 0, 0.12, 0.7); // a light, friendly boop
  useSceneStore.getState().cheerEntity(id); // the Wanderer flourishes
  const secret = dancedSecret(id);
  if (!p.secretsFound.includes(secret)) {
    p.findSecret(secret);
    p.gainLuck(1);
    announce(`💃 You dance with ${label}. It’s delighted · +1 luck`, 'luck');
  } else {
    announce(`💃 ${label} twirls with you.`, 'info');
  }
}
