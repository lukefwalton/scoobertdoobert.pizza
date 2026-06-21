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
  /** Best score in the standalone Pizza Run arcade (the mobile reward). */
  arcadeHigh: number;
  /** Has the player rolled the jukebox d20 to UNLOCK the flip-through radio?
   *  Durable "upgrade": once unlocked, the pause-menu ◀/▶ tunes the catalog and
   *  the pick follows you across the site. Monotonic (only ever goes true). */
  radioUnlocked: boolean;
  /** Total LUCK ever earned (rituals — the shrine clap). The game layer's stat. */
  luckEarned: number;
  /** Total luck ever SPENT by the system biasing d20 rolls. Current luck =
   *  luckEarned − luckSpent; both monotonic, so the multi-tab max-merge holds. */
  luckSpent: number;
};

const DEFAULTS: Progress = {
  visits: 0,
  everEnteredWorld: false,
  visitedRooms: [],
  secretsFound: [],
  maxFloor: 0,
  maxUnease: 0,
  clearedGames: [],
  arcadeHigh: 0,
  radioUnlocked: false,
  luckEarned: 0,
  luckSpent: 0,
};

// ── field normalizers: a malformed blob degrades to defaults, never crashes ──
const num = (v: unknown, d: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : d;
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
      arcadeHigh: num(p.arcadeHigh, 0),
      radioUnlocked: bool(p.radioUnlocked, false),
      luckEarned: num(p.luckEarned, 0),
      luckSpent: num(p.luckSpent, 0),
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
    arcadeHigh: Math.max(a.arcadeHigh, b.arcadeHigh),
    radioUnlocked: a.radioUnlocked || b.radioUnlocked,
    luckEarned: Math.max(a.luckEarned, b.luckEarned),
    luckSpent: Math.max(a.luckSpent, b.luckSpent),
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
  recordArcadeScore: (n: number) => void;
  /** Roll the jukebox d20 → unlock the flip-through radio (idempotent). */
  unlockRadio: () => void;
  /** Earn luck (a ritual paid off — the shrine clap). Announced by the caller. */
  gainLuck: (n: number) => void;
  /** Spend luck (the SYSTEM does this to bias a d20 roll — never the player).
   *  Capped at the luck actually available, so it can't go negative. */
  spendLuck: (n: number) => void;
};

const snapshot = (s: ProgressState): Progress => ({
  visits: s.visits,
  everEnteredWorld: s.everEnteredWorld,
  visitedRooms: s.visitedRooms,
  secretsFound: s.secretsFound,
  maxFloor: s.maxFloor,
  maxUnease: s.maxUnease,
  clearedGames: s.clearedGames,
  arcadeHigh: s.arcadeHigh,
  radioUnlocked: s.radioUnlocked,
  luckEarned: s.luckEarned,
  luckSpent: s.luckSpent,
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
    recordArcadeScore: (n) => {
      if (n <= get().arcadeHigh) return;
      apply({ arcadeHigh: n });
    },
    unlockRadio: () => {
      if (get().radioUnlocked) return;
      apply({ radioUnlocked: true });
    },
    gainLuck: (n) => {
      if (n <= 0) return;
      apply({ luckEarned: get().luckEarned + n });
    },
    spendLuck: (n) => {
      const avail = Math.max(0, get().luckEarned - get().luckSpent);
      const s = Math.min(Math.max(0, Math.floor(n)), avail);
      if (s <= 0) return;
      apply({ luckSpent: get().luckSpent + s });
    },
  };
});

/** Current spendable luck (earned minus what the system has spent), never < 0. */
export const selectLuck = (s: Pick<Progress, 'luckEarned' | 'luckSpent'>): number =>
  Math.max(0, s.luckEarned - s.luckSpent);

/** The durable progress as a plain, store-free snapshot — for non-React readers
 *  (e.g. the terminal's `status`/`whoami`, which take a Progress via ctx so
 *  commands.ts stays free of stores). */
export const getProgressSnapshot = (): Progress => snapshot(useProgressStore.getState());

/**
 * Has the site got reason to "remember" you? Surface-safe (no dread): true once
 * you've been into the world, come back for a repeat visit, or found a secret.
 * The storefront's returning-visitor wink reads this.
 */
export const selectReturning = (s: ProgressState): boolean =>
  s.everEnteredWorld || s.visits >= 2 || s.secretsFound.length > 0;

/**
 * Has the player tasted real dread? True once the saved high-water `maxUnease`
 * reaches the deep band (~the classified room). The persistence-gated curdled
 * copy reads this: a cold/casual visitor never sees it; only someone who's been
 * deep gets the crack. (Distinct from selectReturning, which is surface-safe.)
 */
export const selectDeepDiver = (s: ProgressState): boolean => s.maxUnease >= 0.7;

/**
 * The rat's storefront greeting — the "site remembers you" payoff made legible.
 * Returns null for a cold visitor (no wink at all), else the MOST specific line
 * for what they've actually done, so coming back having gone deeper / found the
 * back room / heard the music each gets its own callback. Surface-safe by design:
 * the storefront stays a sweet zone (docs/DESIGN "dosage"), so even the
 * deep-diver line is goofy-with-a-hair-of-wrong, then deflects — never dread.
 * Order matters: deepest/most specific first.
 */
export function selectRatGreeting(s: ProgressState): string | null {
  if (!selectReturning(s)) return null; // a cold/first-time visitor gets no wink
  if (s.secretsFound.includes('dice-monster'))
    return 'You beat the thing at dice. Nobody beats the thing at dice. …The usual?';
  if (s.maxUnease >= 0.7)
    return 'Oh. It’s you. You went all the way down there, didn’t you… forget I said that. The usual?';
  if (s.secretsFound.includes('classified'))
    return 'Oh, you’re back. Found your way out of the back room okay? ’Course you did. The usual?';
  if (s.visitedRooms.includes('jukebox'))
    return 'Back for more of the music, huh. Kept your booth warm. The usual?';
  if (s.everEnteredWorld) return 'Oh. You. Back again — and you’ve seen downstairs. The usual?';
  return 'Oh. You. Back again. The usual?';
}
