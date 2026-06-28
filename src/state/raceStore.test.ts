import { describe, it, expect, beforeEach } from 'vitest';
import {
  useRaceStore,
  lapOf,
  nextGateOf,
  continuousProgress,
  RACE_GATES,
  RACE_LAPS,
} from './raceStore';
import { useProgressStore } from './progressStore';

// Flush queued microtasks (passPlayer/GhostGate schedule finish() via queueMicrotask).
const flush = () => new Promise((r) => setTimeout(r, 0));

const startRacing = () => {
  const r = useRaceStore.getState();
  r.reset();
  r.start(); // idle → countdown
  r.go(); // countdown → racing
};

beforeEach(() => useRaceStore.getState().reset());

describe('race pure helpers', () => {
  it('nextGateOf: starts targeting gate 1 and wraps the loop', () => {
    expect(nextGateOf(0)).toBe(1); // you start AT gate 0, head for 1
    expect(nextGateOf(RACE_GATES - 2)).toBe(RACE_GATES - 1);
    expect(nextGateOf(RACE_GATES - 1)).toBe(0); // last pass heads back to start
    expect(nextGateOf(RACE_GATES)).toBe(1); // and the next lap targets 1 again
  });

  it('lapOf: 1-based and capped at RACE_LAPS', () => {
    expect(lapOf(0)).toBe(1);
    expect(lapOf(RACE_GATES - 1)).toBe(1);
    expect(lapOf(RACE_GATES)).toBe(2);
    expect(lapOf(RACE_LAPS * RACE_GATES)).toBe(RACE_LAPS); // capped, never RACE_LAPS+1
    expect(lapOf(9999)).toBe(RACE_LAPS);
  });

  it('continuousProgress: gates passed + clamped 0..1 fraction toward the next gate', () => {
    expect(continuousProgress(2, 0, 10)).toBe(3); // at the gate → +1
    expect(continuousProgress(2, 10, 10)).toBe(2); // a full segment away → +0
    expect(continuousProgress(2, 5, 10)).toBe(2.5); // halfway
    expect(continuousProgress(2, 999, 10)).toBe(2); // farther than a segment clamps to +0
  });
});

describe('race store machine', () => {
  it('only starts from idle and rolls idle → countdown → racing', () => {
    const r = useRaceStore.getState();
    expect(r.phase).toBe('idle');
    r.start();
    expect(useRaceStore.getState().phase).toBe('countdown');
    useRaceStore.getState().start(); // ignored — not idle
    expect(useRaceStore.getState().phase).toBe('countdown');
    useRaceStore.getState().go();
    expect(useRaceStore.getState().phase).toBe('racing');
  });

  it('counts gate passes only while racing', () => {
    useRaceStore.getState().passPlayerGate(); // idle → ignored
    expect(useRaceStore.getState().playerProgress).toBe(0);
    startRacing();
    useRaceStore.getState().passPlayerGate();
    useRaceStore.getState().passPlayerGate();
    expect(useRaceStore.getState().playerProgress).toBe(2);
  });

  it('completing RACE_LAPS laps wins + records the clear', async () => {
    startRacing();
    for (let i = 0; i < RACE_LAPS * RACE_GATES; i++) useRaceStore.getState().passPlayerGate();
    await flush();
    expect(useRaceStore.getState().phase).toBe('won');
    expect(useProgressStore.getState().clearedGames).toContain('ghost-race');
  });

  it('the ghost completing first is a loss', async () => {
    startRacing();
    for (let i = 0; i < RACE_LAPS * RACE_GATES; i++) useRaceStore.getState().passGhostGate();
    await flush();
    expect(useRaceStore.getState().phase).toBe('lost');
  });

  it('a same-finish tie favors the player', async () => {
    startRacing();
    const N = RACE_LAPS * RACE_GATES;
    for (let i = 0; i < N - 1; i++) {
      useRaceStore.getState().passPlayerGate();
      useRaceStore.getState().passGhostGate();
    }
    // both cross the final gate the same tick — player's finish is queued first.
    useRaceStore.getState().passPlayerGate();
    useRaceStore.getState().passGhostGate();
    await flush();
    expect(useRaceStore.getState().phase).toBe('won');
  });

  it('setPlayerAhead publishes the standing; reset returns to idle', () => {
    startRacing();
    useRaceStore.getState().setPlayerAhead(false);
    expect(useRaceStore.getState().playerAhead).toBe(false);
    useRaceStore.getState().reset();
    const r = useRaceStore.getState();
    expect(r.phase).toBe('idle');
    expect(r.playerProgress).toBe(0);
    expect(r.ghostProgress).toBe(0);
    expect(r.playerAhead).toBe(true);
  });
});
