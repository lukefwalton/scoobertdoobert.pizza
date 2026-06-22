import { describe, it, expect, beforeEach } from 'vitest';
import { useMonsterStore, MONSTER_LOSS_CAP, monsterScale } from './monsterStore';
import { CRIT_MULT } from '../lib/luck';

// The crit fan-out spans D20 → DicePitRoom → monsterStore; this locks the store's
// half — the bit that decides win/loss + how much the thing grows — deterministically
// (DicePitRoom's toast/luck-gain side of it rides shoot:dice).
const store = () => useMonsterStore.getState();

describe('monsterStore crit handling', () => {
  beforeEach(() => store().reset());

  it('a NAT 20 auto-wins regardless of the face, and never grows the monster', () => {
    const bout = store().resolve(3, 'nat20'); // a low face still wins on a crit
    expect(bout.won).toBe(true);
    expect(bout.crit).toBe('nat20');
    expect(store().wins).toBe(1);
    expect(store().losses).toBe(0);
  });

  it('a CRIT FAIL auto-loses and bloats the monster 3×', () => {
    const bout = store().resolve(18, 'nat1'); // a high face still loses on a crit fail
    expect(bout.won).toBe(false);
    expect(bout.crit).toBe('nat1');
    expect(store().losses).toBe(CRIT_MULT);
  });

  it('a normal loss grows it by one; growth clamps at the cap (maxed)', () => {
    store().resolve(1, null); // a 1 can never beat the thing (ties feed it)
    expect(store().losses).toBe(1);
    expect(store().wins).toBe(0);
    store().resolve(1, 'nat1');
    store().resolve(1, 'nat1'); // pile past the cap
    expect(store().losses).toBe(MONSTER_LOSS_CAP);
    expect(store().maxed).toBe(true);
  });

  it('returns the full bout shape and clamps the visual scale at the cap', () => {
    const bout = store().resolve(12, null);
    expect(bout.you).toBe(12);
    expect(typeof bout.it).toBe('number');
    expect(typeof bout.won).toBe('boolean');
    expect('crit' in bout).toBe(true);
    expect(monsterScale(99)).toBe(monsterScale(MONSTER_LOSS_CAP));
  });
});
