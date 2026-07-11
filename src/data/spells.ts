// ───────────────────────────────────────────────────────────────────────────
// src/data/spells.ts — the SPELL BOOK (the RPG layer's magic).
//
// Luke, 2026-06-26: "i could even see learning a spell or two lol, like area of
// effect like casting fireball and the room gets lit on fire hahaha … but you
// have to earn the spell somehow."
//
// Data-driven like every other system (links/rooms/items): a spell is an id, how
// you LEARN it, what a cast COSTS, and its flavor. The EFFECT itself (the fire) is
// rendered by the world (src/world/RoomFireball.tsx); this module only describes
// the spell. SLOTS are the D&D resource, a small shared pool you spend to cast
// and refill on a REST (the shrine clap / stepping into a breather room). The
// economy lives in progressStore (durable); lib/spellcast.ts orchestrates a cast.
//
// v1 ships ONE spell: FIREBALL. Earned by FINDING its scroll in the practice room
// (the backstage where the music, and now the magic, gets made). The taste
// guardrail still holds: the fire is goofy-cool spectacle, never traumatic, and
// the effect is a smooth warm ramp, never a strobe (WCAG 2.3.1).
// ───────────────────────────────────────────────────────────────────────────

export type SpellId = 'fireball' | 'light';

export type Spell = {
  /** Stable id, persisted in progressStore.knownSpells, keys the HUD hotbar. */
  id: SpellId;
  name: string;
  /** D&D flourish, shown in the grimoire line (Evocation, …). */
  school: string;
  /** A single emoji/glyph for the HUD hotbar slot, no art asset needed. */
  glyph: string;
  /** The mnemonic cast hotkey (single lowercase letter): f = fireball, l = light.
   *  The HUD maps a keypress to the spell by this, so each known spell has its
   *  own key, no equip/select dance. */
  key: string;
  /** Shared spell slots one cast burns. 0 = a CANTRIP (D&D): free + unlimited, it
   *  never touches the pool. Fireball = 1 (a real spell); Light = 0 (a cantrip). */
  slotCost: number;
  /** How much DREAD this cast pushes back (0..1, capped by DREAD.reliefMax): the
   *  warmth/light briefly eases the dark in the depths, then it creeps back. */
  relief: number;
  /** The item id whose pickup TEACHES this spell (items.ts), how you earn it. */
  learnedFromItem: string;
  /** One-line storefront-voice blurb for the learn toast + the pause-menu grimoire. */
  blurb: string;
};

/** A cantrip is a slotless spell, free to cast, as many times as you like. */
export const isCantrip = (s: Spell): boolean => s.slotCost === 0;

/** Shared spell-slot pool size (the D&D long-rest model): a cast spends a slot; a
 *  rest, the shrine clap, or stepping into a sweet breather room, refills to
 *  this. Small on purpose: a cast should feel like a treat you spend, not spam. */
export const SPELL_SLOTS_MAX = 3;

export const SPELLS: Spell[] = [
  {
    id: 'fireball',
    name: 'Fireball',
    school: 'Evocation',
    glyph: '🔥',
    key: 'f',
    slotCost: 1,
    relief: 0.4, // a big burst of warmth, the dark recoils hard for a beat
    learnedFromItem: 'fireball-scroll',
    blurb: 'A bead of flame blooms and the whole room catches. Warmth, for once, in the dark.',
  },
  {
    id: 'light',
    name: 'Light',
    school: 'Evocation cantrip',
    glyph: '🕯️',
    key: 'l',
    slotCost: 0, // a cantrip, free + unlimited, so you can always push back the dark
    relief: 0.3, // a steadier, gentler easing of the dark (it's free, so a bit less)
    learnedFromItem: 'light-scroll',
    blurb:
      'A mote of soft light lifts and the room remembers its corners. No slot, cast it freely.',
  },
];

const BY_ID = new Map(SPELLS.map((s) => [s.id, s]));

export function spellById(id: string): Spell | undefined {
  return BY_ID.get(id as SpellId);
}

/** The spell a given item teaches, if any — the pickup → learnSpell hook
 *  (ItemPickup reads this so an item with a `teachesSpell` id wires itself up). */
export function spellLearnedFromItem(itemId: string): Spell | undefined {
  return SPELLS.find((s) => s.learnedFromItem === itemId);
}
