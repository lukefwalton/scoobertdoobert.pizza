import { describe, it, expect } from 'vitest';
import { SPELLS, spellById, spellLearnedFromItem, isCantrip, SPELL_SLOTS_MAX } from './spells';
import { ITEMS } from './items';

describe('spells', () => {
  it('every spell has a unique id and a unique single-letter cast key', () => {
    const ids = SPELLS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const keys = SPELLS.map((s) => s.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const s of SPELLS) {
      expect(s.key).toMatch(/^[a-z]$/); // a single lowercase letter
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.glyph.length).toBeGreaterThan(0);
      expect(s.slotCost).toBeGreaterThanOrEqual(0);
      expect(s.slotCost).toBeLessThanOrEqual(SPELL_SLOTS_MAX);
    }
  });

  it('each spell is taught by a real tome item that points back to it', () => {
    for (const s of SPELLS) {
      const item = ITEMS.find((i) => i.id === s.learnedFromItem);
      expect(item, `${s.id} learnedFromItem "${s.learnedFromItem}" → no such item`).toBeDefined();
      expect(item!.kind).toBe('tome');
      expect(item!.teachesSpell).toBe(s.id); // the wiring is bidirectional
      expect(spellLearnedFromItem(item!.id)?.id).toBe(s.id);
    }
  });

  it('every tome item teaches a spell that exists', () => {
    for (const item of ITEMS.filter((i) => i.teachesSpell)) {
      expect(spellById(item.teachesSpell!), `tome "${item.id}" → unknown spell`).toBeDefined();
    }
  });

  it('isCantrip is exactly the slotless spells (Light is a cantrip, Fireball is not)', () => {
    expect(isCantrip(spellById('light')!)).toBe(true);
    expect(isCantrip(spellById('fireball')!)).toBe(false);
  });

  it('spellById soft-misses on an unknown id', () => {
    expect(spellById('no-such-spell')).toBeUndefined();
  });
});
