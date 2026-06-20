import { useEffect } from 'react';
import { audio } from '../audio/engine';
import { useAudioStore } from '../state/audioStore';

// Wires audio on EVERY client load, not just the first-boot path. Syncs the
// persisted mute preference, lazy-loads the boot track, and unlocks the audio
// context on the first user gesture. The loop starts itself once it's both
// unlocked and decoded (engine.maybeStart), so order doesn't matter. Renders
// nothing.
export function AudioBootstrap() {
  useEffect(() => {
    audio.muted = useAudioStore.getState().muted;
    // Lazy-load + decode the track in the background (no gesture needed). The
    // music toggle stays disabled until this resolves; if it fails, no music.
    void audio.preload().then((ok) => useAudioStore.getState().setReady(ok));
    const unlock = () => audio.unlock();
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);
  return null;
}
