import { useShallow } from 'zustand/react/shallow';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore, selectSpellSlots } from '../state/progressStore';
import { SPELLS, SPELL_SLOTS_MAX, isCantrip } from '../data/spells';
import { castSpell } from '../lib/spellcast';

// ───────────────────────────────────────────────────────────────────────────
// SpellHotbar — the on-screen spell row (bottom-right), one slot per LEARNED
// spell (you found its scroll). A click, or the slot's mnemonic key (F / L,
// handled in WorldHud), casts. Slotted spells show pips; a cantrip shows ∞ (free
// + unlimited). Self-sufficient: reads its own progress + scene-gate slices, so
// it lifts out of WorldHud cleanly. Hidden in any modal/pause.
// ───────────────────────────────────────────────────────────────────────────

export function SpellHotbar() {
  const known = useProgressStore(useShallow((s) => s.knownSpells));
  const spellSlots = useProgressStore(selectSpellSlots);
  const gates = useSceneStore(
    useShallow((s) => ({
      open: s.openHotspot,
      paused: s.paused,
      pendingRoom: s.pendingRoom,
      tvVideo: s.tvVideo,
      arcadeGame: s.arcadeGame,
      openNpc: s.openNpc,
    })),
  );

  const learnedSpells = SPELLS.filter((sp) => known.includes(sp.id));
  if (learnedSpells.length === 0) return null;
  if (
    gates.open ||
    gates.paused ||
    gates.pendingRoom ||
    gates.tvVideo ||
    gates.arcadeGame ||
    gates.openNpc
  )
    return null;

  return (
    <div className="hud-hotbar">
      {learnedSpells.map((sp) => {
        const cantrip = isCantrip(sp);
        const usable = cantrip || spellSlots >= sp.slotCost;
        const K = sp.key.toUpperCase();
        return (
          <button
            key={sp.id}
            type="button"
            className={`hud-hotbar__slot${usable ? '' : ' is-empty'}`}
            onClick={() => castSpell(sp.id)}
            aria-label={`Cast ${sp.name} — ${
              cantrip ? 'cantrip (free)' : `${spellSlots} of ${SPELL_SLOTS_MAX} slots`
            } (${K})`}
            title={`${sp.name} — press ${K}`}
          >
            <span className="hud-hotbar__glyph" aria-hidden="true">
              {sp.glyph}
            </span>
            <span className="hud-hotbar__pips" aria-hidden="true">
              {cantrip ? (
                <span className="hud-hotbar__cantrip">∞</span>
              ) : (
                Array.from({ length: SPELL_SLOTS_MAX }, (_, i) => (
                  <span key={i} className={`hud-hotbar__pip${i < spellSlots ? ' is-lit' : ''}`} />
                ))
              )}
            </span>
            <span className="hud-hotbar__key" aria-hidden="true">
              {K}
            </span>
          </button>
        );
      })}
    </div>
  );
}
