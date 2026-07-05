import { describe, it, expect, beforeEach } from 'vitest';
import {
  setTouchMove,
  getTouchMove,
  queueTouchJump,
  takeTouchJump,
  resetTouchInput,
} from './touchInput';

// The DOM→input bridge is pure module state (no window/three), so its exact
// semantics — the ones Controls.tsx reads every frame — are unit-testable here.
// Reset before each test so module-level state can't leak between cases.
beforeEach(() => resetTouchInput());

describe('touchInput move vector', () => {
  it('round-trips the last set vector', () => {
    setTouchMove(0.5, -0.25);
    expect(getTouchMove()).toEqual({ x: 0.5, y: -0.25 });
  });

  it('returns zero after reset', () => {
    setTouchMove(1, 1);
    resetTouchInput();
    expect(getTouchMove()).toEqual({ x: 0, y: 0 });
  });

  it('overwrites (not accumulates) on repeated sets — a stick reports absolute state', () => {
    setTouchMove(0.3, 0.3);
    setTouchMove(-0.7, 0.1);
    expect(getTouchMove()).toEqual({ x: -0.7, y: 0.1 });
  });
});

describe('touchInput jump edge', () => {
  it('is not queued by default', () => {
    expect(takeTouchJump()).toBe(false);
  });

  it('is a RISING EDGE: one queue is consumed exactly once', () => {
    queueTouchJump();
    expect(takeTouchJump()).toBe(true); // consumed
    expect(takeTouchJump()).toBe(false); // and only once — no auto-repeat
  });

  it('re-arms after being consumed (a fresh press jumps again)', () => {
    queueTouchJump();
    expect(takeTouchJump()).toBe(true);
    queueTouchJump();
    expect(takeTouchJump()).toBe(true);
  });

  it('multiple queues before a take still yield a single jump (no stacking)', () => {
    queueTouchJump();
    queueTouchJump();
    queueTouchJump();
    expect(takeTouchJump()).toBe(true);
    expect(takeTouchJump()).toBe(false);
  });

  it('reset clears a pending jump', () => {
    queueTouchJump();
    resetTouchInput();
    expect(takeTouchJump()).toBe(false);
  });
});
