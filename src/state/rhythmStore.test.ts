import { describe, it, expect, beforeEach } from 'vitest';
import { useRhythmStore } from './rhythmStore';

const reset = () => useRhythmStore.getState().close();

describe('rhythmStore', () => {
  beforeEach(reset);

  it('start() builds a sequence of the requested length and enters demo', () => {
    useRhythmStore.getState().start('e1', 'the blob', 4);
    const s = useRhythmStore.getState();
    expect(s.active).toBe(true);
    expect(s.seq).toHaveLength(4);
    expect(s.phase).toBe('demo');
    expect(s.entityId).toBe('e1');
  });

  it('a correct copy advances to a win; press is ignored until input phase', () => {
    useRhythmStore.getState().start('e1', 'the blob', 3);
    const seq = useRhythmStore.getState().seq;
    // presses during demo do nothing
    useRhythmStore.getState().press(seq[0]);
    expect(useRhythmStore.getState().step).toBe(0);
    useRhythmStore.getState().beginInput();
    for (const d of seq) useRhythmStore.getState().press(d);
    expect(useRhythmStore.getState().phase).toBe('win');
  });

  it('a wrong key resets the input with no penalty (bumps miss, never fails)', () => {
    useRhythmStore.getState().start('e1', 'the blob', 3);
    const seq = useRhythmStore.getState().seq;
    useRhythmStore.getState().beginInput();
    useRhythmStore.getState().press(seq[0]); // step → 1
    expect(useRhythmStore.getState().step).toBe(1);
    const wrong = (['up', 'down', 'left', 'right'] as const).find((d) => d !== seq[1]) as
      | 'up'
      | 'down'
      | 'left'
      | 'right';
    useRhythmStore.getState().press(wrong); // wrong → reset
    expect(useRhythmStore.getState().step).toBe(0);
    expect(useRhythmStore.getState().miss).toBe(1);
    expect(useRhythmStore.getState().phase).toBe('input'); // still going, no fail state
  });

  it('close() tears the minigame down', () => {
    useRhythmStore.getState().start('e1', 'x', 3);
    useRhythmStore.getState().close();
    expect(useRhythmStore.getState().active).toBe(false);
    expect(useRhythmStore.getState().seq).toHaveLength(0);
  });
});
