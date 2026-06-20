import { create } from 'zustand';

// ───────────────────────────────────────────────────────────────────────────
// src/state/progressStore.ts — the PERSISTENCE SPINE (the retention mechanism).
//
// Durable, cross-session progress, saved to localStorage as one versioned JSON
// blob. Deliberately SEPARATE from sceneStore: scene state is ephemeral (resets
// each session), while progress is the site *remembering you* across visits.
// The reference is BrowserQuest's localStorage save — zero backend.
//
// SSR-safe: every localStorage touch is guarded so the store can be created
// during the static prerender, where it just yields the cold defaults. Nothing
// here ever changes the prerendered HTML — consumers gate on useMounted() so the
// durable state is a post-hydration enhancement only, never in the crawlable /
// JS-off page.
//
// Every field is MONOTONIC (counts only go up, booleans only go true, arrays
// only grow). That lets save() merge against fresh localStorage on every write,
// so a second open tab can never regress another tab's progress. read() also
// normalizes each field, so a malformed/old blob degrades to defaults instead of
// crashing a later action (e.g. `.includes` on a non-array).
//
// Phase map (docs/PHASES.md): the early cross-cutting dependency. Phase 5 reads
// `maxUnease` for the persistence-gated curdled copy; Phase 6 door-games write
// `clearedGames`. Recording more is a one-line action here — never a migration.
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

// ── field normalizers: a malformed blob degrades to defaults, never crashes ──
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : d);
const strArr = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

function read(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULTS };
    const p = JSON.parse(raw) as Partial<Progress>;
    return {
      visits: num(p.visits, 0),
      everEnteredWorld: bool(p.everEnteredWorld, false),
      visitedRooms: strArr(p.visitedRooms),
      secretsFound: strArr(p.secretsFound),
      maxFloor: num(p.maxFloor, 0),
      maxUnease: num(p.maxUnease, 0),
      clearedGames: strArr(p.clearedGames),
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function write(p: Progress) {
  try {
    // Preserve any unknown keys already on disk (fields a NEWER build added) so
    // an older build writing here doesn't strip them — genuinely forward-compat,
    // matching the "adding a key needs no migration" promise above.
    let existing: Record<string, unknown> = {};
    try {
      existing = (JSON.parse(localStorage.getItem(KEY) || '{}') as Record<string, unknown>) ?? {};
    } catch {
      existing = {};
    }
    localStorage.setItem(KEY, JSON.stringify({ ...existing, ...p }));
  } catch {
    /* private mode / SSR — progress just doesn't persist, UX unaffected */
  }
}

const uniq = (a: string[], b: string[]): string[] => Array.from(new Set([...a, ...b]));

/** Monotonic merge: the "furthest" value of each field wins — never regresses. */
function mergeProgress(a: Progress, b: Progress): Progress {
  return {
    visits: Math.max(a.visits, b.visits),
    everEnteredWorld: a.everEnteredWorld || b.everEnteredWorld,
    visitedRooms: uniq(a.visitedRooms, b.visitedRooms),
    secretsFound: uniq(a.secretsFound, b.secretsFound),
    maxFloor: Math.max(a.maxFloor, b.maxFloor),
    maxUnease: Math.max(a.maxUnease, b.maxUnease),
    clearedGames: uniq(a.clearedGames, b.clearedGames),
  };
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

const snapshot = (s: ProgressState): Progress => ({
  visits: s.visits,
  everEnteredWorld: s.everEnteredWorld,
  visitedRooms: s.visitedRooms,
  secretsFound: s.secretsFound,
  maxFloor: s.maxFloor,
  maxUnease: s.maxUnease,
  clearedGames: s.clearedGames,
});

export const useProgressStore = create<ProgressState>((set, get) => {
  // Apply a patch, then merge against FRESH localStorage before persisting, so a
  // concurrent tab's progress is never clobbered. set() keeps in-memory == disk.
  const apply = (patch: Partial<Progress>) => {
    const next = { ...snapshot(get()), ...patch };
    const merged = mergeProgress(read(), next);
    set(merged);
    write(merged);
  };

  return {
    ...read(),

    // Increment off FRESH disk (not the boot snapshot) so a second tab opened
    // after this one still counts: tab A 0->1, tab B reads 1->2. (Truly
    // simultaneous first-loads can still race to the same value — acceptable;
    // visits is only a soft secondary signal for selectReturning.)
    recordVisit: () => apply({ visits: read().visits + 1 }),
    markEnteredWorld: () => {
      if (get().everEnteredWorld) return;
      apply({ everEnteredWorld: true });
    },
    visitRoom: (id) => {
      if (get().visitedRooms.includes(id)) return;
      apply({ visitedRooms: [...get().visitedRooms, id] });
    },
    findSecret: (id) => {
      if (get().secretsFound.includes(id)) return;
      apply({ secretsFound: [...get().secretsFound, id] });
    },
    recordFloor: (n) => {
      if (n <= get().maxFloor) return;
      apply({ maxFloor: n });
    },
    recordUnease: (v) => {
      if (v <= get().maxUnease) return;
      apply({ maxUnease: v });
    },
    clearGame: (id) => {
      if (get().clearedGames.includes(id)) return;
      apply({ clearedGames: [...get().clearedGames, id] });
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
