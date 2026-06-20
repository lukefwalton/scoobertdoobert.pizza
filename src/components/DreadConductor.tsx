import { useEffect, useState } from 'react';
import { FLOORS } from '../data/floors';
import { DREAD, SAFE_UNEASE, baseUneaseFor, mapUnease } from '../data/dread';
import { useSceneStore } from '../state/sceneStore';
import { useDreadStore } from '../state/dreadStore';
import { useProgressStore } from '../state/progressStore';
import { useMounted } from '../lib/useMounted';

// ───────────────────────────────────────────────────────────────────────────
// DreadConductor — Phase 5, ckpt 1. The single place that drives `unease`.
//
// A global rAF loop (mounted on the storefront shell, so it runs across the era
// floors AND the 3D world): it reads the current zone (room id in the world,
// floor id during the descent), eases `unease` up to that zone's resting value,
// lets it DWELL upward while you linger somewhere tense, and DECAYS it in safe
// zones — so heading back toward the surface always calms it. Writes the live
// value to dreadStore (the instruments read it in later checkpoints) and records
// the high-water mark into the persistence spine (for the Phase 5 curdled copy).
//
// With ?debug it also shows a small readout + a manual override slider so the
// whole emotional arc can be driven and tuned by hand. Renders null otherwise.
// ───────────────────────────────────────────────────────────────────────────

function currentZone(s: ReturnType<typeof useSceneStore.getState>): string {
  return s.worldActive ? s.currentRoom : FLOORS[s.currentFloor]?.id ?? 'storefront';
}

export function DreadConductor() {
  const mounted = useMounted();
  const debug =
    mounted &&
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).has('debug');

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    // Dwell accumulator: how much lingering has added on top of the zone's base.
    // It grows in tense zones and bleeds off in safe ones, so the live target is
    // (base + dwell), and unease EASES toward that target in BOTH directions —
    // which is what makes a shallower zone (or the surface) actually calm you,
    // instead of unease only ever climbing.
    let dwell = 0;
    let prevZone = currentZone(useSceneStore.getState());
    // Seed from the saved high-water mark so a remount doesn't replay buckets
    // recordUnease (which only writes on a new max) would no-op anyway.
    let lastRecorded = useProgressStore.getState().maxUnease;

    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1); // clamp big gaps (tab refocus)
      last = now;

      const dread = useDreadStore.getState();
      let u = dread.unease;

      if (dread.override != null) {
        // ?debug manual take-over — drive it by hand, don't pollute the save.
        u = dread.override;
        prevZone = currentZone(useSceneStore.getState()); // don't fire a trigger on release
      } else {
        const zone = currentZone(useSceneStore.getState());
        const base = baseUneaseFor(zone);

        // One-shot zone-entry trigger (e.g. the jolt on slipping into classified).
        if (zone !== prevZone) {
          const delta = DREAD.triggers[`enter-${zone}`];
          if (delta) u = Math.min(1, u + delta);
          prevZone = zone;
        }

        // Dwell grows while lingering somewhere tense, bleeds off in safe zones.
        if (base > SAFE_UNEASE) {
          dwell = Math.min(DREAD.dwellMax, dwell + DREAD.dwellRatePerSec * dt);
        } else {
          dwell = Math.max(0, dwell - DREAD.decayRatePerSec * dt);
        }

        // Ease toward the zone's resting value (+dwell) from EITHER side. Decay
        // out-paces dwell, so heading shallower / to the surface always calms it.
        const target = Math.min(1, base + dwell);
        if (u < target) u = Math.min(target, u + DREAD.riseRatePerSec * dt);
        else if (u > target) u = Math.max(target, u - DREAD.decayRatePerSec * dt);

        // High-water mark for the persistence-gated curdled copy (throttled to
        // ~0.05 buckets; recordUnease also only writes on a new max).
        if (u - lastRecorded >= 0.05) {
          lastRecorded = u;
          useProgressStore.getState().recordUnease(u);
        }
      }

      u = Math.min(1, Math.max(0, u));
      if (u !== dread.unease) dread.setUnease(u);
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  if (!debug) return null;
  return <DreadDebug />;
}

// ── ?debug overlay: live readout of unease + its mapped targets + manual drive ─
function DreadDebug() {
  const unease = useDreadStore((s) => s.unease);
  const override = useDreadStore((s) => s.override);
  const setOverride = useDreadStore((s) => s.setOverride);
  const [manual, setManual] = useState(override != null);
  const [val, setVal] = useState(override ?? 0);

  const t = mapUnease(unease);
  const pct = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <div
      style={{
        position: 'fixed',
        left: 8,
        bottom: 8,
        zIndex: 9999,
        font: '11px/1.45 "Courier New", monospace',
        color: '#9effa0',
        background: 'rgba(0,0,0,0.78)',
        border: '1px solid #2f6f30',
        borderRadius: 4,
        padding: '8px 10px',
        width: 210,
        pointerEvents: 'auto',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <b>DREAD</b>
        <span>unease {unease.toFixed(3)}</span>
      </div>
      <div style={{ height: 8, background: '#163016', borderRadius: 2, overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: pct(unease),
            background: `hsl(${Math.round(120 - unease * 120)} 80% 55%)`,
          }}
        />
      </div>
      <label style={{ display: 'flex', gap: 6, alignItems: 'center', margin: '6px 0' }}>
        <input
          type="checkbox"
          checked={manual}
          onChange={(e) => {
            const on = e.target.checked;
            setManual(on);
            setOverride(on ? val : null);
          }}
        />
        manual override
      </label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={val}
        disabled={!manual}
        style={{ width: '100%' }}
        onChange={(e) => {
          const v = Number(e.target.value);
          setVal(v);
          if (manual) setOverride(v);
        }}
      />
      <div style={{ marginTop: 6, opacity: 0.85 }}>
        bed {pct(t.subBassGain)} · crush {pct(t.bitcrush)} · fog ×{t.fogDensityMul.toFixed(2)}
        <br />
        jitter {pct(t.vertexJitter)} · shake {pct(t.cameraShake)} · vig {pct(t.vignette)}
        <br />
        rat {pct(t.ratMenace)} · drop {pct(t.dropoutChance)}
      </div>
    </div>
  );
}
