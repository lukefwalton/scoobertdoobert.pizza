import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture, makeTextTexture } from './ps1';
import { MOBIUS_BREAK, type Room } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useDreadStore } from '../state/dreadStore';
import { DREAD } from '../data/dread';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// MobiusRoom — Phase 6. The Scooby-Doo hallway gag / the "Mobius" motif: walk to
// the far door and you come out the near one, the same corridor scrolling by
// (the loop door re-enters this room at the start). It's NOT a fail-maze — the
// way back to the pool is right behind you, always, and climbing up always
// works; the loop is the bit, not a trap.
//
// ONE mechanic, DUAL register, driven by `unease` (docs/DESIGN "recurrence"):
//   • low unease → comic: the corridor is bright, the sign is goofy, you laugh.
//   • high unease → the same loop tightens: dim, the sign curdles, repetition
//     turns oppressive (earned backrooms dread).
// Same geometry, opposite feeling. Each forward lap pokes `unease` up a notch
// (the declared 'mobius-loop' trigger), so looping itself slides you from comic
// toward tense — the registers aren't two modes, they're the ends of one slider.
//
// "Slightly changed" each lap = a seeded shuffle over hand-authored dressing
// (wall tint + sign text keyed off the lap count), NOT procgen. After
// MOBIUS_BREAK laps the loop "breaks on its own": a door that wasn't there
// (revealOn 'mobius') opens and you pop out somewhere else (Doors / rooms.ts).
// ───────────────────────────────────────────────────────────────────────────

// Hand-authored wall tints — the lap count indexes this, so the corridor is the
// "same but slightly off" each time around (faded motel greens drifting browner).
const WALL_TINTS = ['#8a9670', '#909268', '#978f63', '#86936a', '#929869'];

// Sign copy by register. Comic near the surface; it curdles as unease rises. The
// last line is what shows once the loop has broken (the way out appeared).
const SIGN_COMIC = 'THIS WAY →\n(probably)';
const SIGN_TENSE = 'THIS WAY →\nTHIS WAY →';
const SIGN_BROKEN = 'OH.\na door.';

export function MobiusRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const fog = { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };

  const loops = useSceneStore((s) => s.mobiusLoops);
  const roomNonce = useSceneStore((s) => s.roomNonce);
  const unease = useDreadStore((s) => s.unease);
  const broken = loops >= MOBIUS_BREAK; // the onward door is open

  // Count a lap on every door commit INTO this room: the loop door re-enters at
  // spawn 'loop' (→ another lap + a poke of unease), any other arrival is fresh
  // (→ reset). Keyed on roomNonce so it fires even when room+spawn are unchanged
  // (looping re-enters the same node — see sceneStore.roomNonce).
  useEffect(() => {
    const s = useSceneStore.getState();
    if (s.currentSpawn === 'loop') {
      s.loopMobius();
      const d = DREAD.triggers['mobius-loop'] ?? 0;
      const ds = useDreadStore.getState();
      ds.setUnease(Math.min(1, ds.unease + d));
    } else {
      s.resetMobius();
    }
  }, [roomNonce]);

  // The lap count is a READ-only global (?world / ?debug). Forcing laps is an
  // ACTION (it advances the Möbius progression), so __sdpLoopMobius gates on the
  // narrower ?debug entrance only — never on the guessable ?world=1.
  useEffect(() => {
    exposeTestGlobal('__sdpMobius', loops);
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpLoopMobius', () => useSceneStore.getState().loopMobius());
    return () => exposeTestGlobal('__sdpLoopMobius', undefined);
  }, [loops]);

  const wallTint = WALL_TINTS[loops % WALL_TINTS.length];

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#4a5238', '#586046'); // pale institutional tile
    t.repeat.set(2, Math.round(D / 2));
    return t;
  }, [D]);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 1, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat(wallTint, { side: THREE.DoubleSide }), [wallTint]);
  const ceilMat = useMemo(() => flatMat('#2b3324', { side: THREE.DoubleSide }), []);
  const stripMat = useMemo(() => flatMat('#cfe0b8', { side: THREE.DoubleSide }), []); // fluorescents

  // The sign at the far end — its copy is the register made legible.
  const signText = broken ? SIGN_BROKEN : unease > 0.5 ? SIGN_TENSE : SIGN_COMIC;
  const signTex = useMemo(
    () =>
      makeTextTexture(signText, {
        fg: broken ? '#ffd0c0' : '#dfe9c2',
        bg: '#10160e',
        w: 256,
        h: 128,
      }),
    [signText, broken],
  );
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex }), [signTex]);
  useEffect(() => () => signTex.dispose(), [signTex]);

  // Dual register, made literal: OVER-lit + even when calm (comic), dimming
  // toward oppressive as unease rises. Bright is the default the bitter contrasts.
  const ambient = 0.95 - unease * 0.45;

  return (
    <group>
      <ambientLight intensity={ambient} color="#cdd6b2" />
      <pointLight position={[0, H - 0.4, D - 5]} intensity={0.6} distance={18} color="#eef0c8" />
      <pointLight position={[0, H - 0.4, 0]} intensity={0.5} distance={18} color="#e6f0c0" />
      <pointLight position={[0, H - 0.4, -D + 5]} intensity={0.6} distance={18} color="#e6f0c0" />

      {/* floor */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* ceiling */}
      <mesh material={ceilMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* side walls (the long runs) */}
      <mesh material={wallMat} rotation-y={Math.PI / 2} position={[-W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={-Math.PI / 2} position={[W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      {/* end walls (the doors sit in front of these) */}
      <mesh material={wallMat} position={[0, H / 2, D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={Math.PI} position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>

      {/* ceiling light strips — the fluorescents marching down the hall */}
      {[-D + 4, -D + 11, D - 11, D - 4].map((z) => (
        <mesh key={z} material={stripMat} rotation-x={Math.PI / 2} position={[0, H - 0.02, z]}>
          <planeGeometry args={[1.0, 2.2]} />
        </mesh>
      ))}

      {/* the sign near the far (loop) door — the register, legible */}
      <mesh material={signMat} position={[0, 2.4, -D + 0.3]}>
        <planeGeometry args={[2.2, 1.1]} />
      </mesh>
    </group>
  );
}
