// tipsyStore — the North Park "little beers" gag. Ephemeral (per-session, not
// persisted): walk into a beer to drink it; after a few, the screen goes goofily
// BLURRY for a few seconds, then clears. Taste-safe + WCAG-safe: the blur is a
// gradual CSS filter (no strobe, no full-field flash), it always fades back, and
// it's reset on leaving the block (NorthParkRoom unmount).
import { create } from 'zustand';
import { announce } from './toastStore';

/** Beers before the boulevard starts to swim. */
export const TIPSY_THRESHOLD = 3;
/** How long a tipsy spell lasts (ms) — within the 3–5s the user asked for. */
export const TIPSY_MS = 4000;

// Lighthearted, escalating sips (never grim — the surface stays goofy).
const SIPS = ['🍺 cheers!', '🍺 ahh, cold one.', '🍺 hic!', '🍺 hic — whoa.', '🍺 ...hic! 🥴'];

type TipsyState = {
  beersDrunk: number;
  blurry: boolean;
  drink: () => void;
  reset: () => void;
};

let timer: ReturnType<typeof setTimeout> | null = null;

export const useTipsyStore = create<TipsyState>((set, get) => ({
  beersDrunk: 0,
  blurry: false,
  drink: () => {
    const n = get().beersDrunk + 1;
    set({ beersDrunk: n });
    announce(SIPS[Math.min(n - 1, SIPS.length - 1)], 'luck');
    if (n >= TIPSY_THRESHOLD) {
      set({ blurry: true });
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        set({ blurry: false });
        timer = null;
      }, TIPSY_MS);
    }
  },
  reset: () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    set({ beersDrunk: 0, blurry: false });
  },
}));
