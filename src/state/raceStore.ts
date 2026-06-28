import { create } from 'zustand';
import { useProgressStore } from './progressStore';
import { announce } from './toastStore';

// ───────────────────────────────────────────────────────────────────────────
// raceStore — the Grassrooms' 3D lap race vs the ghost (ゴーストレース).
//
// Shared between the in-canvas GhostRace (gates + the ghost racer + the per-frame
// logic) and the DOM RaceHud (countdown · LAP · who's ahead · win/lose card),
// which live on opposite sides of the R3F <Canvas> boundary — so the race state
// can't be component-local. Three-free (no three import) so the HUD can read it.
//
// The course is a LOOP of RACE_GATES checkpoints; "progress" counts gates passed
// since GO (so lap = progress / RACE_GATES, and the next gate = (progress+1) %
// RACE_GATES — you START at gate 0, your first target is gate 1). First racer to
// finish RACE_LAPS wins. Sweet + non-traumatic (taste guardrail): losing is an
// anticlimax, winning seals a little luck.
// ───────────────────────────────────────────────────────────────────────────

export type RacePhase = 'idle' | 'countdown' | 'racing' | 'won' | 'lost';

export const RACE_LAPS = 2;
export const RACE_GATES = 8;

type RaceState = {
  phase: RacePhase;
  /** 3 → 0 during the countdown (0 == GO). */
  countdown: number;
  /** Gates each racer has passed since GO (lap = ⌊progress / RACE_GATES⌋). */
  playerProgress: number;
  ghostProgress: number;

  /** Begin the bout: roll into the 3·2·1 countdown (only from idle). */
  start: () => void;
  /** Countdown tick (GhostRace owns the timer). */
  setCountdown: (n: number) => void;
  /** Countdown hit 0 — drop the flag. */
  go: () => void;
  /** You crossed your next gate. */
  passPlayerGate: () => void;
  /** The ghost crossed its next gate. */
  passGhostGate: () => void;
  /** End the race for `winner` (idempotent; rewards a player win once). */
  finish: (winner: 'you' | 'ghost') => void;
  /** Back to idle — the ghost returns to the start, ready for a rematch. */
  reset: () => void;
};

export const useRaceStore = create<RaceState>((set, get) => ({
  phase: 'idle',
  countdown: 3,
  playerProgress: 0,
  ghostProgress: 0,

  start: () =>
    set((s) =>
      s.phase === 'idle'
        ? { phase: 'countdown', countdown: 3, playerProgress: 0, ghostProgress: 0 }
        : {},
    ),
  setCountdown: (n) => set({ countdown: Math.max(0, n) }),
  go: () => set((s) => (s.phase === 'countdown' ? { phase: 'racing', countdown: 0 } : {})),
  passPlayerGate: () =>
    set((s) => {
      if (s.phase !== 'racing') return {};
      const playerProgress = s.playerProgress + 1;
      // Completed RACE_LAPS full loops → you win (finish handles the reward).
      if (playerProgress >= RACE_LAPS * RACE_GATES) {
        queueMicrotask(() => get().finish('you'));
      }
      return { playerProgress };
    }),
  passGhostGate: () =>
    set((s) => {
      if (s.phase !== 'racing') return {};
      const ghostProgress = s.ghostProgress + 1;
      if (ghostProgress >= RACE_LAPS * RACE_GATES) {
        queueMicrotask(() => get().finish('ghost'));
      }
      return { ghostProgress };
    }),
  finish: (winner) =>
    set((s) => {
      if (s.phase !== 'racing') return {};
      if (winner === 'you') {
        // The reward — seal a little luck + remember the clear (once).
        const p = useProgressStore.getState();
        if (!p.clearedGames.includes('ghost-race')) {
          p.clearGame('ghost-race');
          p.gainLuck(3);
          announce('🏁 you beat the ghost! ゴーストに勝った！ +3 luck', 'luck');
        } else {
          announce('🏁 you beat the ghost again! また勝った！', 'luck');
        }
        return { phase: 'won' };
      }
      // Anticlimax (taste guardrail): the ghost just twirls, no harm done.
      announce('👻 the ghost won this one — rematch? もういっかい？', 'info');
      return { phase: 'lost' };
    }),
  reset: () => set({ phase: 'idle', countdown: 3, playerProgress: 0, ghostProgress: 0 }),
}));

/** Lap a racer is on (1-based for display), capped at RACE_LAPS. */
export const lapOf = (progress: number): number =>
  Math.min(RACE_LAPS, Math.floor(progress / RACE_GATES) + 1);

/** The index of the gate a racer must cross next (they START at gate 0). */
export const nextGateOf = (progress: number): number => (progress + 1) % RACE_GATES;
