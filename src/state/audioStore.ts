import { create } from 'zustand';
import { audio } from '../audio/engine';

// Mute preference, persisted in localStorage and mirrored into the audio engine.
// SSR-safe: localStorage reads are guarded so the store can be created during
// the static prerender.
const KEY = 'sdp_muted';

function readMuted(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

type AudioState = {
  muted: boolean;
  setMuted: (m: boolean) => void;
  toggleMute: () => void;
};

export const useAudioStore = create<AudioState>((set, get) => ({
  muted: readMuted(),
  setMuted: (m) => {
    audio.setMuted(m);
    try {
      localStorage.setItem(KEY, m ? '1' : '0');
    } catch {
      /* private mode / SSR */
    }
    set({ muted: m });
  },
  toggleMute: () => get().setMuted(!get().muted),
}));
