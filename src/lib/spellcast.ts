// ───────────────────────────────────────────────────────────────────────────
// src/lib/spellcast.ts — the cast ORCHESTRATOR (the thin glue between the spell
// economy, the world FX, and the toast voice), mirroring lib/luck's split: the
// durable slot economy lives in progressStore; this just runs a cast.
//
// Both the HUD hotbar button and the F hotkey call castEquippedSpell(); the
// Playwright smoke calls it through a test hook (WorldHud exposes __sdpCast). The
// actual fire is drawn by src/world/RoomFireball.tsx, which watches the cast
// nonce this bumps — so this module stays three-free and unit-friendly.
// ───────────────────────────────────────────────────────────────────────────

import { useProgressStore, selectSpellSlots } from '../state/progressStore';
import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { audio } from '../audio/engine';
import { SPELLS, type Spell } from '../data/spells';

/** The spell currently equipped in the hotbar. v1: the first spell you know
 *  (Fireball is the only one), or null if you've learned none yet — in which case
 *  the hotbar isn't shown at all and the hotkey is inert. */
export function equippedSpell(): Spell | null {
  const known = useProgressStore.getState().knownSpells;
  return SPELLS.find((s) => known.includes(s.id)) ?? null;
}

/** Cast the equipped spell: spend a slot, fire the world FX, announce. A no-op
 *  (with a nudge toast) when you've learned nothing or are out of slots. Returns
 *  whether a cast actually fired — the HUD button + the smoke read it. */
export function castEquippedSpell(): boolean {
  const spell: Spell | null = equippedSpell();
  if (!spell) return false; // nothing learned — nothing to cast
  const prog = useProgressStore.getState();
  if (selectSpellSlots(prog) < spell.slotCost) {
    announce(`${spell.glyph} out of slots — rest to recharge`, 'crit-bad');
    return false;
  }
  prog.spendSpellSlot(spell.slotCost);
  audio.unlock(); // we're on a user gesture (key / click), so this is allowed
  useSceneStore.getState().triggerCastFx(spell.id); // RoomFireball watches the nonce
  announce(`${spell.glyph} ${spell.name}! The room catches.`, 'crit-good');
  return true;
}
