import { create } from 'zustand';

// ───────────────────────────────────────────────────────────────────────────
// src/state/progressStore.ts — the PERSISTENCE SPINE (the retention mechanism).
//
// Durable, cross-session progress, saved to localStorage as one versioned JSON
// blob. This is deliberately a SEPARATE store from sceneStore: scene state is
// ephemeral (it resets every session — see enterWorld/exitWorld), while progress
// is the site *remembering you* across visits. The reference is BrowserQuest's
// localStorage save — zero backend.
//
// SSR-safe: every localStorage touch is guarded so the store can be created
// during the static prerender (no `window`/`localStorage`), where it just yields
// the cold defaults. Nothing here ever changes the prerendered HTML — consumers
// gate on useMounted() so the durable state only shows up as a post-hydration
// enhancement, never in the crawlable / JS-off page.
//
// Phase map (docs/PHASES.md): this is the early cross-cutting dependency. Phase 5
// reads `maxUnease` for the persistence-gated curdled copy; Phase 6 door-games
// write `clearedGames`. Recording more is a one-line action here, never a schema
// migration — unknown keys merge over the defaults.
// ───────────────────────────────────────────────────────────────────────────

const KEY = 'sdp_progress_v1';

export type Progress = {
  /** Page loads counted (a "visit"). */
  visits: number;
  /** Has the player ever descended into the 3D world? */
  everEnteredWorld: boolean;
  /** Room ids the player has stood in (rooms.ts ids). */
  visitedRooms: string[];
  /** Secret ids uncovered (e.g. "classified"). */
  secretsFound: string[];
  /** Deepest era-floor index reached (floors.ts). */
  maxFloor: number;
  /** Highest unease ever felt, 0..1 — Phase 5 reads this for the curdled copy. */
  maxUnease: number;
  /** Door-game ids cleared (Phase 6 minigames). */
  clearedGames: string[];
};

const DEFAULTS: Progress = {
  visits: 0,
  everEnteredWorld: false,
  visitedRooms: [],
  secretsFound: [],
  maxFloor: 0,
  maxUnease: 0,
  clearedGames: [],
};

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    // Merge over defaults so a blob written by an older build (missing a newer
    // field) still hydrates cleanly — no migrations needed to add a key.
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* private mode / SSR — progress just doesn't persist, UX unaffected */
  }
}

type ProgressState = Progress & {
  /** Count a page load. Call once per real load (ProgressTracker guards this). */
  recordVisit: () => void;
  markEnteredWorld: () => void;
  visitRoom: (id: string) => void;
  findSecret: (id: string) => void;
  recordFloor: (n: number) => void;
  recordUnease: (v: number) => void;
  clearGame: (id: string) => void;
};

export const useProgressStore = create<ProgressState>((set, get) => {
  // Persist the durable fields after any mutation. set() is synchronous, so by
  // the time save() runs, get() already reflects the change.
  const save = () => {
    const s = get();
    write({
      visits: s.visits,
      everEnteredWorld: s.everEnteredWorld,
      visitedRooms: s.visitedRooms,
      secretsFound: s.secretsFound,
      maxFloor: s.maxFloor,
      maxUnease: s.maxUnease,
      clearedGames: s.clearedGames,
    });
  };

  return {
    ...read(),

    recordVisit: () => {
      set((s) => ({ visits: s.visits + 1 }));
      save();
    },
    markEnteredWorld: () => {
      if (get().everEnteredWorld) return;
      set({ everEnteredWorld: true });
      save();
    },
    visitRoom: (id) => {
      if (get().visitedRooms.includes(id)) return;
      set((s) => ({ visitedRooms: [...s.visitedRooms, id] }));
      save();
    },
    findSecret: (id) => {
      if (get().secretsFound.includes(id)) return;
      set((s) => ({ secretsFound: [...s.secretsFound, id] }));
      save();
    },
    recordFloor: (n) => {
      if (n <= get().maxFloor) return;
      set({ maxFloor: n });
      save();
    },
    recordUnease: (v) => {
      if (v <= get().maxUnease) return;
      set({ maxUnease: v });
      save();
    },
    clearGame: (id) => {
      if (get().clearedGames.includes(id)) return;
      set((s) => ({ clearedGames: [...s.clearedGames, id] }));
      save();
    },
  };
});

/**
 * Has the site got reason to "remember" you? Surface-safe (no dread): true once
 * you've been into the world, come back for a repeat visit, or found a secret.
 * The storefront's returning-visitor wink reads this.
 */
export const selectReturning = (s: ProgressState): boolean =>
  s.everEnteredWorld || s.visits >= 2 || s.secretsFound.length > 0;
