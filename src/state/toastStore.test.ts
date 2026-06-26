import { describe, it, expect } from 'vitest';
import { toastDurationMs } from './toastStore';

// The toast dismiss timing is a behavior CONTRACT now (a floor so short messages
// stay snappy, a cap so a long one never hangs, length-scaled in between), so it's
// worth protecting from a quiet regression — WorldHud just drives a timer off it.
describe('toastDurationMs — reading-time aware toast duration', () => {
  it('floors a short message at 2800ms (no regression from the old fixed timeout)', () => {
    expect(toastDurationMs('')).toBe(2800);
    expect(toastDurationMs('NAT 20!')).toBe(2800); // 7 chars → under the floor
  });

  it('scales above the floor for a real, longer message', () => {
    const mid = toastDurationMs('🔥 You learned Fireball! Press F to cast.');
    expect(mid).toBeGreaterThan(2800);
    expect(mid).toBeLessThan(9000);
  });

  it('caps a very long message at 9000ms (never hangs on screen)', () => {
    expect(toastDurationMs('x'.repeat(400))).toBe(9000);
  });

  it('never shrinks as the message grows (monotonic)', () => {
    const lens = [0, 20, 40, 80, 160, 320];
    for (let i = 1; i < lens.length; i++) {
      expect(toastDurationMs('x'.repeat(lens[i]))).toBeGreaterThanOrEqual(
        toastDurationMs('x'.repeat(lens[i - 1])),
      );
    }
  });
});
