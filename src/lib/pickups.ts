// ───────────────────────────────────────────────────────────────────────────
// src/lib/pickups.ts — the shared "pocket this collectible" action.
//
// Pulled out of ItemPickup so every way of grabbing an inventory item — clicking
// it, walking onto it (auto-grab), pressing P near it, or the test hook — funnels
// through ONE idempotent function instead of each re-implementing the reward +
// announce. The proximity/keyboard mechanic lives in PickupController; this is the
// effect it (and the click) fire.
// ───────────────────────────────────────────────────────────────────────────
import { audio } from '../audio/engine';
import { noteToFreq } from './chimes';
import { itemById } from '../data/items';
import { spellById } from '../data/spells';
import { jukeboxTrackUrl, loopIndexForUrl } from '../data/music';
import { useProgressStore } from '../state/progressStore';
import { useMusicStore } from '../state/musicStore';
import { announce } from '../state/toastStore';

/**
 * Pocket an inventory item (a key / cassette / spell scroll) into the durable
 * inventory, with its kind-specific reward + a toast. IDEMPOTENT: returns false
 * and does nothing if it's already held, so a click, a walk-over auto-grab, a P
 * press, and the smoke hook can all converge here with no dup risk. Returns true
 * the one time it actually collects.
 */
export function collectInventoryItem(itemId: string): boolean {
  const prog = useProgressStore.getState();
  if (prog.itemsHeld.includes(itemId)) return false;
  const item = itemById(itemId);
  audio.unlock();
  audio.playChime(noteToFreq('E', 6), 0, 0.14, 0.6); // a bright little pickup ring
  prog.collectItem(itemId);
  // Trinkets (the cassettes) tip a little luck; keys' reward is the door.
  if (item?.kind === 'trinket') prog.gainLuck(1);
  // ESCAPE-ROOM reveal: some items open a way when pocketed (the "1101" reel →
  // the Save San Diego level door). Bank the DURABLE secret so the matching
  // `revealSecret` door manifests (Doors' doorRevealed), + an evocative toast.
  if (item?.revealsSecret) {
    prog.findSecret(item.revealsSecret);
    audio.playChime(noteToFreq('B', 5), 0, 0.18, 0.9); // a low hum — a way opens
    announce('🔓 the reel decodes… a doorway hums open', 'luck');
  }
  // A TOME (spell scroll): learn its spell — the reward IS the magic. A short
  // arcane flourish over the pickup ring, then point them at the cast key.
  if (item?.teachesSpell) {
    prog.learnSpell(item.teachesSpell);
    const spell = spellById(item.teachesSpell);
    audio.playChime(noteToFreq('C', 6), 0, 0.12, 0.7);
    audio.playChime(noteToFreq('G', 6), 0, 0.12, 0.9);
    // Drive the cast-key hint off the spell's own metadata so a new spell can't
    // desync the onboarding copy (Fireball = F, Light = L).
    const key = spell?.key.toUpperCase() ?? '?';
    announce(
      `${spell?.glyph ?? '✨'} You learned ${spell?.name ?? 'a spell'}! Press ${key} to cast.`,
      'crit-good',
    );
  } else if (item?.track) {
    const url = jukeboxTrackUrl(item.track);
    void audio.playJukeboxTrack(url);
    useMusicStore.getState().setPreferred(loopIndexForUrl(url));
    prog.unlockRadio();
    announce(`${item.glyph} ${item.label} — give it a spin · +1 luck`, 'luck');
  } else {
    announce(`${item?.glyph ?? '🎒'} You pocket the ${item?.label ?? 'item'}`, 'luck');
  }
  return true;
}
