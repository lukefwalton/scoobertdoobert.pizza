import { create } from 'zustand';
import { audio } from '../audio/engine';
import { LOOP_OPTIONS, jukeboxTrackUrl } from '../data/music';

// The user's global song selection — the pause-menu switcher drives this so a
// user can shift the world's loop voice from ANYWHERE in the world (not just at
// the jukebox cabinet). It's a live "DJ" control: applying it plays immediately.
// Index into LOOP_OPTIONS (0 = the boot loop). Session-scoped on purpose — the
// boot loop is always the default ambience on a fresh visit.
type MusicState = {
  /** Index into LOOP_OPTIONS. */
  index: number;
  /** The selected option's title (for the HUD readout). */
  title: string;
  /** Jump to a specific option and play it. */
  setIndex: (i: number) => void;
  /** Step ± and play (wraps). */
  shift: (dir: 1 | -1) => void;
};

function play(i: number) {
  const opt = LOOP_OPTIONS[i];
  if (!opt) return;
  // slug → swap the loop voice to that catalog track; null → back to boot.
  if (opt.slug) void audio.playJukeboxTrack(jukeboxTrackUrl(opt.slug));
  else audio.restoreBoot();
}

export const useMusicStore = create<MusicState>((set, get) => ({
  index: 0,
  title: LOOP_OPTIONS[0]?.title ?? '',
  setIndex: (i) => {
    const n = LOOP_OPTIONS.length;
    const idx = ((i % n) + n) % n; // wrap both directions
    audio.unlock(); // the click is the gesture
    play(idx);
    set({ index: idx, title: LOOP_OPTIONS[idx]?.title ?? '' });
  },
  shift: (dir) => get().setIndex(get().index + dir),
}));
