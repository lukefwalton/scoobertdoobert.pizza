import { describe, it, expect, beforeEach } from 'vitest';
import { toastDurationMs, toastDismissMs, useToastStore } from './toastStore';

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

describe('toastDismissMs — steps aside sooner when others are waiting', () => {
  it('is the full reading time with nothing queued', () => {
    expect(toastDismissMs('x'.repeat(200), false)).toBe(toastDurationMs('x'.repeat(200)));
  });
  it('caps at 2600ms with a queue behind it (short lines included)', () => {
    expect(toastDismissMs('x'.repeat(200), true)).toBe(2600);
    expect(toastDismissMs('hi', true)).toBe(2600);
  });
});

// The two-lane slot replaced the old always-clobbering single slot (passive
// announcements used to overwrite direct feedback, patched per-call-site with
// hand-tuned setTimeout staggers). Pin the contract so a regression can't
// quietly bring the clobbering back — or make an action's feedback wait.
describe('toast lanes — direct feedback shows now, passive chatter queues', () => {
  beforeEach(() => useToastStore.setState({ toast: null, queue: [] }));
  const s = () => useToastStore.getState();

  it('a default (direct) announce replaces the showing toast at once', () => {
    s().announce('passive line', 'info', { queue: true });
    s().announce('NAT 20!', 'crit-good');
    expect(s().toast?.msg).toBe('NAT 20!'); // action feedback never waits
  });

  it('queued announces line up in order behind the current toast', () => {
    s().announce('one');
    s().announce('two', 'info', { queue: true });
    s().announce('three', 'info', { queue: true });
    expect(s().toast?.msg).toBe('one');
    expect(s().queue.map((t) => t.msg)).toEqual(['two', 'three']);
    s().clear();
    expect(s().toast?.msg).toBe('two');
    s().clear();
    expect(s().toast?.msg).toBe('three');
    s().clear();
    expect(s().toast).toBeNull();
    expect(s().queue).toEqual([]);
  });

  it('a queued announce shows immediately when the slot is free', () => {
    s().announce('whisper', 'info', { queue: true });
    expect(s().toast?.msg).toBe('whisper');
  });

  it('a direct announce leaves the waiting queue intact (it follows after)', () => {
    s().announce('one');
    s().announce('two', 'info', { queue: true });
    s().announce('CRIT!', 'crit-bad');
    expect(s().toast?.msg).toBe('CRIT!');
    expect(s().queue.map((t) => t.msg)).toEqual(['two']);
  });

  it('dedupes an already-showing or already-waiting queued message, capped at 4', () => {
    s().announce('showing');
    s().announce('showing', 'info', { queue: true }); // already on screen — dropped
    s().announce('dup', 'info', { queue: true });
    s().announce('dup', 'info', { queue: true }); // already waiting — dropped
    expect(s().queue.map((t) => t.msg)).toEqual(['dup']);
    for (const m of ['a', 'b', 'c', 'd']) s().announce(m, 'info', { queue: true });
    expect(s().queue.map((t) => t.msg)).toEqual(['a', 'b', 'c', 'd']); // oldest waiting fell off
    expect(s().toast?.msg).toBe('showing'); // the on-screen one is never dropped
  });
});
