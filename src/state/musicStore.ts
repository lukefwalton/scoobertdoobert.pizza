import { create } from 'zustand';
import { audio } from '../audio/engine';
import { LOOP_OPTIONS, loopIndexForUrl } from '../data/music';
import { playbackUrlFor } from '../lib/trackSource';

// The user-facing music control. The ENGINE is the source of truth for what's
// actually playing — this store MIRRORS it (via audio.onLoopChange) so the HUD
// "now playing" readout can never drift from reality, even when a room reward or
// the jukebox cabinet changes the loop voice directly.
//
//  - `index`/`title`  → what's ACTUALLY playing right now (mirrors the engine).
//  - `preferred`      → the user's persistent pick from the switcher. Rooms that
//                       temporarily override the music (a reward stinger, the
//                       jukebox) call restorePreferred() on exit, so the user's
//                       chosen song — not the boot loop — wins back.
type MusicState = {
  index: number;
  title: string;
  preferred: number;
  /** Pick an option, make it the persistent preference, and play it. */
  setIndex: (i: number) => void;
  /** Record the preferred station WITHOUT playing it — the jukebox d20 already
   *  has the track playing locally; this just makes it the pick that follows you
   *  out of the room (restorePreferred plays it on exit). */
  setPreferred: (i: number) => void;
  /** Step ± from what's currently playing and play it (wraps). */
  shift: (dir: 1 | -1) => void;
  /** Re-assert the user's preferred track (rooms call this when they stop
   *  overriding the music). */
  restorePreferred: () => void;
};

const wrap = (i: number) => ((i % LOOP_OPTIONS.length) + LOOP_OPTIONS.length) % LOOP_OPTIONS.length;

function playOption(i: number) {
  const opt = LOOP_OPTIONS[wrap(i)];
  audio.unlock(); // the click is the gesture
  if (opt.slug) void audio.playJukeboxTrack(playbackUrlFor(opt.slug));
  else audio.restoreBoot();
}

export const useMusicStore = create<MusicState>((set, get) => {
  // Mirror the engine: whatever it's actually playing drives index/title.
  audio.onLoopChange((url) => {
    const idx = loopIndexForUrl(url);
    set({ index: idx, title: LOOP_OPTIONS[idx]?.title ?? '' });
  });

  return {
    index: 0,
    title: LOOP_OPTIONS[0]?.title ?? '',
    preferred: 0,
    setIndex: (i) => {
      const idx = wrap(i);
      set({ preferred: idx }); // index/title update when the engine confirms
      playOption(idx);
    },
    setPreferred: (i) => set({ preferred: wrap(i) }),
    // Step from what's actually playing, so ◀/▶ never jump from a stale value.
    shift: (dir) => get().setIndex(get().index + dir),
    restorePreferred: () => playOption(get().preferred),
  };
});
