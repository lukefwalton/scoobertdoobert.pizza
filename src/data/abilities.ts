// ───────────────────────────────────────────────────────────────────────────
// src/data/abilities.ts — earned VERBS (three-free, like items/quests).
//
// The RPG layer isn't only luck + loot: movement abilities are LEARNED by
// finding a skill orb and grabbing it, an "ooo, a skill" moment, not a silent
// grant. Each ability is a durable progressStore.secretsFound id + how it reads
// (name/hint/glyph/colour for the orb + the learn toast). Keeping the ids here
// (not string literals scattered across files) means the orb that grants it, the
// Controls gate that reads it, and any quest all agree on one constant.
//
// The ladder, on purpose:
//  · JUMP is learned in the FIRST room (the beach shop), the starter verb, so
//    exploration is springier from the very start.
//  · DOUBLE JUMP is the upgrade, earned deep out at the Jumping Turtle (the pun:
//    the Jumping Turtle teaches you to jump *again*, in mid-air).
// ───────────────────────────────────────────────────────────────────────────

export type AbilityId = 'jump' | 'doublejump';

export type Ability = {
  id: AbilityId;
  /** Durable secretsFound id (the once-only grant + the Controls gate read it). */
  secret: string;
  /** Shown in the learn toast + on the orb's little placard. */
  name: string;
  /** How to use it, appended to the toast ("press Space"). */
  hint: string;
  /** A single glyph drawn on the orb + toast (canvas-safe, not an emoji). */
  glyph: string;
  /** The orb's glow / burst colour. */
  color: string;
};

export const ABILITIES: Record<AbilityId, Ability> = {
  jump: {
    id: 'jump',
    secret: 'jump-unlocked',
    name: 'JUMP',
    hint: 'press Space',
    glyph: '↑',
    color: '#ffd24a',
  },
  doublejump: {
    id: 'doublejump',
    secret: 'doublejump-unlocked',
    name: 'DOUBLE JUMP',
    hint: 'tap Space again in mid-air',
    glyph: '⇈',
    color: '#7ad6ff',
  },
};

/** Durable secretsFound id gating the Space-to-jump verb. */
export const JUMP_SECRET = ABILITIES.jump.secret;
/** Durable secretsFound id gating the mid-air second hop. */
export const DOUBLEJUMP_SECRET = ABILITIES.doublejump.secret;

export function abilityById(id: AbilityId): Ability {
  return ABILITIES[id];
}
