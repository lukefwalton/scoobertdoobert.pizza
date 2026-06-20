import { useEffect } from 'react';
import { audio } from '../audio/engine';
import { useAudioStore } from '../state/audioStore';

// Wires audio on EVERY client load, not just the first-boot path. Syncs the
// persisted mute preference and starts the degraded-MIDI loop on the first user
// gesture when unmuted. This is why a same-session reload with music still "on"
// comes back with sound: the boot card may be skipped, but audio bootstrap is
// not. Renders nothing.
export function AudioBootstrap() {
  useEffect(() => {
    audio.muted = useAudioStore.getState().muted;
    // Warm the boot-track network immediately (no gesture needed) so the loop
    // starts on the real song, not a synth note, the moment audio unlocks.
    audio.prefetchTrack();
    const unlock = () => {
      audio.unlock();
      if (!useAudioStore.getState().muted) audio.startBootLoop();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  return null;
}
