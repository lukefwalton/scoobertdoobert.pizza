import { describe, it, expect, beforeEach } from 'vitest';
import { useDreadStore } from './dreadStore';
import { DREAD } from '../data/dread';

// The spell-relief pool (the conductor reads + decays it; spellcast bumps it).
describe('dreadStore relief', () => {
  beforeEach(() => {
    useDreadStore.setState({ relief: 0 });
  });

  it('addRelief accumulates and clamps to DREAD.reliefMax', () => {
    useDreadStore.getState().addRelief(0.3);
    expect(useDreadStore.getState().relief).toBeCloseTo(0.3);
    useDreadStore.getState().addRelief(0.3); // 0.6 → clamped to the cap
    expect(useDreadStore.getState().relief).toBe(DREAD.reliefMax);
  });

  it('addRelief ignores non-positive amounts (never lowers relief)', () => {
    useDreadStore.getState().addRelief(0.2);
    useDreadStore.getState().addRelief(-1);
    expect(useDreadStore.getState().relief).toBeCloseTo(0.2);
  });

  it('setRelief (the conductor’s decay write-back) clamps to [0, reliefMax]', () => {
    useDreadStore.getState().setRelief(-5);
    expect(useDreadStore.getState().relief).toBe(0);
    useDreadStore.getState().setRelief(99);
    expect(useDreadStore.getState().relief).toBe(DREAD.reliefMax);
  });

  it('reliefMax leaves the deepest zones still genuinely uneasy (relief is partial)', () => {
    // Even a fully-charged relief can't drop the bitter-end rooms to "safe".
    const bitterEnd = DREAD.baseUnease['classified'];
    expect(bitterEnd - DREAD.reliefMax).toBeGreaterThan(0.2);
  });
});
