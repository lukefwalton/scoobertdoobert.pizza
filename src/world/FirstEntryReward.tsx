import { useEffect, useRef } from 'react';
import { useProgressStore } from '../state/progressStore';
import { announce } from '../state/toastStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';

// The shared payoff for a reward nook (the locker room, the supply closet, …):
// the FIRST time you step in it hums a soft major triad and tips a little luck,
// gated once-only by a durable secret so re-entry is silent (no luck farm). The
// reward IS sound. Render it as a child of the room; it draws nothing.
//
// Pulled out of LockerRoom so every nook shares one correct payoff path instead
// of re-spelling the secret/luck/announce/chord dance per room.
export function FirstEntryReward({
  secret,
  message,
  luck = 2,
}: {
  /** Durable secretsFound id — the once-only gate. */
  secret: string;
  /** The luck toast text (kind 'luck'). */
  message: string;
  luck?: number;
}) {
  const claimed = useRef(false);
  useEffect(() => {
    if (claimed.current) return; // one payout per mount (room visit)
    claimed.current = true;
    if (useProgressStore.getState().secretsFound.includes(secret)) return; // already claimed, ever
    useProgressStore.getState().findSecret(secret);
    if (luck > 0) useProgressStore.getState().gainLuck(luck);
    announce(message, 'luck');
    const tid = window.setTimeout(() => {
      // a quiet major-ish triad
      audio.playChime(noteToFreq('C', 5), -0.2, 0.1, 1.2);
      audio.playChime(noteToFreq('E', 5), 0, 0.1, 1.2);
      audio.playChime(noteToFreq('G', 5), 0.2, 0.1, 1.4);
    }, 250);
    return () => window.clearTimeout(tid);
  }, [secret, message, luck]);
  return null;
}
