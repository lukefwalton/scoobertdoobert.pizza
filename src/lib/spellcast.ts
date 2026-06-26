// ───────────────────────────────────────────────────────────────────────────
// src/lib/spellcast.ts — the cast ORCHESTRATOR (the thin glue between the spell
// economy, the world FX, and the toast voice), mirroring lib/luck's split: the
// durable slot economy lives in progressStore; this just runs a cast.
//
// The HUD hotbar buttons + the mnemonic hotkeys (f/l) call castSpell(id); the
// Playwright smoke calls it through a test hook (WorldHud exposes __sdpCast). The
// fire/light themselves are drawn by src/world/RoomFireball + RoomLight, which
// watch the cast nonce this bumps — so this module stays three-free + testable.
// ───────────────────────────────────────────────────────────────────────────

import { useProgressStore, selectSpellSlots } from '../state/progressStore';
import { useSceneStore } from '../state/sceneStore';
import { useDreadStore } from '../state/dreadStore';
import { announce } from '../state/toastStore';
import { audio } from '../audio/engine';
import { exposeTestGlobal } from './testHooks';
import { SPELLS, spellById, isCantrip, type Spell } from '../data/spells';

/** The spells you've learned, in book order — drives the HUD hotbar row. */
export function knownSpells(): Spell[] {
  const known = useProgressStore.getState().knownSpells;
  return SPELLS.filter((s) => known.includes(s.id));
}

/** Cast a specific spell by id: spend its slot (cantrips are free), fire the world
 *  FX, announce. A no-op (with a nudge toast) when you don't know it or are out of
 *  slots. Returns whether a cast actually fired — the HUD + the smoke read it. */
export function castSpell(id: string): boolean {
  const spell = spellById(id);
  const prog = useProgressStore.getState();
  if (!spell || !prog.knownSpells.includes(spell.id)) return false; // not learned
  if (!isCantrip(spell) && selectSpellSlots(prog) < spell.slotCost) {
    announce(`${spell.glyph} out of slots — rest to recharge`, 'crit-bad');
    return false;
  }
  if (spell.slotCost > 0) prog.spendSpellSlot(spell.slotCost); // cantrips never touch the pool
  audio.unlock(); // we're on a user gesture (key / click), so this is allowed
  useSceneStore.getState().triggerCastFx(spell.id); // RoomFireball / RoomLight watch the nonce
  // Push back the dark: the cast eases the room's dread for a few seconds (the
  // conductor subtracts + bleeds off this relief). Capped, so the depths stay eerie.
  useDreadStore.getState().addRelief(spell.relief);
  exposeTestGlobal('__sdpRelief', useDreadStore.getState().relief); // re-read: set once per cast
  announce(`${spell.glyph} ${spell.name}!`, 'crit-good');
  return true;
}

/** Cast the first spell you know (Fireball if you have it) — the test hook + any
 *  "cast something" affordance. Returns whether a cast fired. */
export function castEquippedSpell(): boolean {
  const first = knownSpells()[0];
  return first ? castSpell(first.id) : false;
}
