import { create } from 'zustand';

// The dance rhythm minigame (Commit C) — a tiny Simon-says: the wanderer
// DEMONSTRATES a short move sequence, then you COPY it with the arrow keys.
// Get it right → the reward (luck + the danced secret). A wrong key is harmless
// (it just resets the input — never a fail-state; taste guardrail). Ephemeral.
//
// State machine: start() → 'demo' (RhythmGame ticks `step` through the sequence)
// → beginInput() → 'input' (press() advances on a correct key) → 'win'. close()
// tears it down. Kept dependency-free (no reward/audio here) so it stays a pure,
// testable machine; RhythmGame owns the timing + the payout.

export type Dir = 'up' | 'down' | 'left' | 'right';
const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

export type RhythmPhase = 'demo' | 'input' | 'win';

type RhythmState = {
  active: boolean;
  entityId: string | null;
  label: string;
  seq: Dir[];
  phase: RhythmPhase;
  /** demo: which beat is lit; input: how many correct so far. */
  step: number;
  /** bumps on a WRONG key so the UI can flash (no penalty otherwise). */
  miss: number;
  start: (entityId: string, label: string, len?: number) => void;
  beginInput: () => void;
  setStep: (n: number) => void;
  press: (dir: Dir) => void;
  close: () => void;
};

export const useRhythmStore = create<RhythmState>((set, get) => ({
  active: false,
  entityId: null,
  label: '',
  seq: [],
  phase: 'demo',
  step: 0,
  miss: 0,
  start: (entityId, label, len = 3) => {
    const seq: Dir[] = Array.from({ length: len }, () => DIRS[Math.floor(Math.random() * 4)]);
    set({ active: true, entityId, label, seq, phase: 'demo', step: 0, miss: 0 });
  },
  beginInput: () => set({ phase: 'input', step: 0 }),
  setStep: (n) => set({ step: n }),
  press: (dir) => {
    const s = get();
    if (!s.active || s.phase !== 'input') return;
    if (dir === s.seq[s.step]) {
      const step = s.step + 1;
      set(step >= s.seq.length ? { phase: 'win', step } : { step });
    } else {
      set({ step: 0, miss: s.miss + 1 }); // gentle reset — never a fail
    }
  },
  close: () => set({ active: false, entityId: null, label: '', seq: [], step: 0, phase: 'demo' }),
}));
