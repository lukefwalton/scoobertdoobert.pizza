import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useScoreStore, MAX_TALLNESS } from './scoreStore';

// The combo window keys off performance.now(), so mock it to drive time. progress
// best-recording is exercised by shoot:score in a real browser; here we test the
// pure run math: multiplier, window expiry, idempotency, and the height cap.
let nowMs = 0;
beforeEach(() => {
  vi.spyOn(performance, 'now').mockImplementation(() => nowMs);
  nowMs = 1000;
  useScoreStore.getState().resetRun();
});
afterEach(() => {
  useScoreStore.getState().resetRun(); // clear the combo timer
  vi.restoreAllMocks();
});

describe('scoreStore run math', () => {
  it('chains a combo and multiplies points within the window', () => {
    const s = useScoreStore.getState();
    const a = s.collectLoot('r::0', 10, 0.05)!;
    expect(a.combo).toBe(1);
    expect(a.awarded).toBe(10); // ×1
    nowMs += 200;
    const b = s.collectLoot('r::1', 10, 0.05)!;
    expect(b.combo).toBe(2);
    expect(b.awarded).toBe(20); // ×2
    nowMs += 200;
    const c = s.collectLoot('r::2', 10, 0.05)!;
    expect(c.combo).toBe(3);
    expect(c.awarded).toBe(30); // ×3
    expect(useScoreStore.getState().score).toBe(60);
  });

  it('resets the combo to 1 after the window lapses', () => {
    const s = useScoreStore.getState();
    s.collectLoot('r::0', 10, 0.05);
    nowMs += 5000; // > COMBO_WINDOW
    const after = s.collectLoot('r::1', 10, 0.05)!;
    expect(after.combo).toBe(1);
    expect(after.awarded).toBe(10);
  });

  it('is idempotent per id within a run (no double-collect)', () => {
    const s = useScoreStore.getState();
    expect(s.collectLoot('r::0', 10, 0.05)).not.toBeNull();
    expect(s.collectLoot('r::0', 10, 0.05)).toBeNull();
    expect(useScoreStore.getState().score).toBe(10);
  });

  it('caps tallness at MAX_TALLNESS however much you collect', () => {
    const s = useScoreStore.getState();
    for (let i = 0; i < 60; i++) s.collectLoot(`r::${i}`, 10, 0.12);
    expect(useScoreStore.getState().tallness).toBeCloseTo(MAX_TALLNESS, 5);
  });

  it('resetRun zeroes the run (fresh descent)', () => {
    const s = useScoreStore.getState();
    s.collectLoot('r::0', 10, 0.05);
    s.resetRun();
    const st = useScoreStore.getState();
    expect(st.score).toBe(0);
    expect(st.combo).toBe(0);
    expect(st.tallness).toBe(0);
    expect(st.taken).toEqual([]);
  });
});
