// ───────────────────────────────────────────────────────────────────────────
// src/lib/restoration.ts — the RESTORATION BENCH verb (the control-room deck).
//
// The interaction half of the museum's restoration loop (data/restoration.ts is
// the pure state view; audio/engine.restoreCeremony is the sound). Lives in lib —
// like pickups.ts — so the deck click, the E key (worldActions), and the smoke
// hook all converge on ONE function, and so walking out mid-ceremony can't
// cancel the completion write (a component unmount is irrelevant here).
//
// What restores: the track CURRENTLY PLAYING on the loop voice — the jukebox /
// pause-menu radio is how you choose what's on the deck. Discovered-but-lo-fi →
// ready; everything else gets a reason, never a dead key.
// ───────────────────────────────────────────────────────────────────────────
import { audio } from '../audio/engine';
import { noteToFreq } from './chimes';
import { LOOP_OPTIONS } from '../data/music';
import { jukeboxTrackUrl, hifiTrackUrl, jukeboxTitle } from '../data/jukebox';
import { isSongDiscovered, isSongRestored } from '../data/restoration';
import { useMusicStore } from '../state/musicStore';
import { useProgressStore, type Progress } from '../state/progressStore';
import { announce } from '../state/toastStore';

export type BenchState =
  | { kind: 'no-tape' } // the boot loop — nothing threaded on the deck
  | { kind: 'undiscovered'; slug: string } // a room-song that hasn't found you yet
  | { kind: 'restored'; slug: string } // already clean — plays hi-fi
  | { kind: 'ready'; slug: string } // discovered + lo-fi: the rite awaits
  | { kind: 'running'; slug: string }; // the ceremony is mid-sweep

// The one-rite-at-a-time latch. Module-level (not component state) so a second
// E/click during the sweep is a no-op and the deck theatre can read it per-frame.
let running: string | null = null;

/** The pure half: what the deck would do for a given playing slug + progress.
 *  WorldHud calls this with its REACTIVE slug/progress so the prompt updates as
 *  the radio turns; benchState() below is the store-reading twin for the verb. */
export function benchStateFor(slug: string | null, p: Progress): BenchState {
  if (!slug) return { kind: 'no-tape' };
  if (!isSongDiscovered(p, slug)) return { kind: 'undiscovered', slug };
  if (isSongRestored(p, slug)) return { kind: 'restored', slug };
  return { kind: 'ready', slug };
}

/** What the deck would do right now. The playing slug comes from the music
 *  store's engine mirror (LOOP_OPTIONS[index]), so it's true whichever variant
 *  is looping — loopIndexForUrl folds hi-fi urls onto the same index. */
export function benchState(): BenchState {
  if (running) return { kind: 'running', slug: running };
  const slug = LOOP_OPTIONS[useMusicStore.getState().index]?.slug ?? null;
  return benchStateFor(slug, useProgressStore.getState());
}

/** The HUD prompt line for a bench state (WorldHud prefixes the key hint on the
 *  ready state; the others read as the deck's flat refusal). */
export function benchPrompt(st: BenchState): string {
  switch (st.kind) {
    case 'no-tape':
      return 'the deck is empty — spin up a song first';
    case 'undiscovered':
      return 'the deck refuses: this song hasn’t found you yet';
    case 'restored':
      return `“${jukeboxTitle(st.slug)}” is already clean — it plays hi-fi`;
    case 'running':
      return 'restoring… hold still';
    case 'ready':
      return `restore “${jukeboxTitle(st.slug)}”`;
  }
}

/** The E/click verb. Runs the full rite when ready; otherwise toasts the reason
 *  (never a dead key). Returns true only when a restoration actually banked. */
export async function restoreAtBench(): Promise<boolean> {
  const st = benchState();
  if (st.kind === 'running') return false; // the latch — no double-threading
  if (st.kind !== 'ready') {
    announce(`📼 ${benchPrompt(st)}`);
    return false;
  }
  const slug = st.slug;
  running = slug;
  audio.unlock(); // the bench press is the gesture
  announce('⟲ threading the master… hold still');
  try {
    const landed = await audio.restoreCeremony(jukeboxTrackUrl(slug), hifiTrackUrl(slug));
    if (!landed) {
      announce('📼 the reel slipped — the song moved on');
      return false;
    }
    // Banked at COMPLETION, never up front: an interrupted rite stays redoable.
    useProgressStore.getState().restoreSong(slug);
    announce(`✨ “${jukeboxTitle(slug)}” — restored. It plays hi-fi forever`, 'crit-good');
    audio.playChime(noteToFreq('E', 6), 0, 0.14, 0.9);
    window.setTimeout(() => audio.playChime(noteToFreq('B', 6), 0, 0.12, 1.1), 180);
    return true;
  } finally {
    running = null;
  }
}

/** Whether the rite is mid-sweep (the deck theatre spins its reels off this). */
export function benchRunning(): boolean {
  return running !== null;
}
