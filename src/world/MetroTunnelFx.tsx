import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeCheckerTexture, nearestify } from './ps1';
import { audio } from '../audio/engine';
import { useDispose } from '../lib/useDispose';
import type { Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// MetroTunnelFx — procedural dressing layered OVER the metro-tunnel GLB level
// (like CeilingDrips, but kind-specific). Three beats, all in the PS1 register:
//
//  1. A shitty fake shinkansen that whooshes THROUGH the tunnel on a loop —
//     blocky, flat-shaded, vertex-snapped, no wheels (the jank is the charm).
//  2. A neon sign reading 青函トンネル (the Seikan Tunnel — the real-world
//     UNDERSEA rail tunnel between Honshu and Hokkaido). A glowing canvas-texture
//     panel with a gentle neon buzz (WCAG-safe: small, dim, ~1.5 Hz, never a
//     full-field flash).
//  3. A flooded floor — the Seikan is undersea, so this tunnel is knee-deep and
//     dripping: it's where the train line CONNECTS TO WATER (Luke), tying the
//     railway motif back into the site's whole water descent. The neon reads over
//     the dark water like a reflection.
//
// Original parody only — no JR / Shinkansen marks, just the grammar of a white
// bullet train with a blue livery stripe.
// ───────────────────────────────────────────────────────────────────────────

// The bullet train. Nose points -Z; the group is swept down the tunnel in Z.
function Shinkansen() {
  const ref = useRef<THREE.Group>(null);

  const bodyMat = useMemo(() => flatMat('#e9edf2'), []); // off-white
  const stripeMat = useMemo(() => flatMat('#2f6cc4'), []); // livery blue
  const skirtMat = useMemo(() => flatMat('#9aa3ad'), []); // grey underframe
  const glassMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#12202c' }), []);
  const lightMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#fff2c8' }), []);
  const noseMat = useMemo(() => flatMat('#e9edf2'), []);

  useDispose(bodyMat, stripeMat, skirtMat, glassMat, lightMat, noseMat);

  // Three cars at these z-centres; the nose caps the -Z front car.
  const cars = [0.5, -3.7, -7.9];

  // Fire the audio "pass" cue once per lap, just before the train reaches the
  // camera (~p 0.18, where z ≈ the spawn). Re-armed past the loop's end. The
  // engine no-ops if audio isn't unlocked or is muted, so this never forces sound.
  const fired = useRef(false);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const period = 8.5;
    const p = (state.clock.elapsedTime % period) / period; // 0..1
    // Sweep from behind the camera (+Z) down the tunnel into the far fog (-Z).
    g.position.z = 20 - p * 64;
    // Cheap rattle so the "shitty fake" reads as moving, not gliding.
    g.position.y = 1.02 + Math.sin(state.clock.elapsedTime * 22) * 0.03;

    if (p > 0.9) fired.current = false; // re-arm before the next lap
    if (!fired.current && p > 0.12 && p < 0.2) {
      fired.current = true;
      audio.playTrainPass();
    }
  });

  return (
    // Off the centreline on the implied track; runs a bit beyond the room box so
    // it emerges from / vanishes into the fog rather than popping in mid-air.
    <group ref={ref} position={[-1.7, 1.02, 0]}>
      {cars.map((z, i) => (
        <group key={i} position={[0, 0, z]}>
          {/* body */}
          <mesh material={bodyMat} position={[0, 0, 0]}>
            <boxGeometry args={[1.5, 1.7, 3.7]} />
          </mesh>
          {/* roof ridge */}
          <mesh material={skirtMat} position={[0, 0.92, 0]}>
            <boxGeometry args={[1.2, 0.18, 3.7]} />
          </mesh>
          {/* underframe skirt */}
          <mesh material={skirtMat} position={[0, -0.92, 0]}>
            <boxGeometry args={[1.4, 0.3, 3.6]} />
          </mesh>
          {/* camera-side (+X) window strip + blue livery stripe */}
          <mesh material={glassMat} position={[0.76, 0.28, 0]}>
            <boxGeometry args={[0.05, 0.6, 3.0]} />
          </mesh>
          <mesh material={stripeMat} position={[0.76, -0.22, 0]}>
            <boxGeometry args={[0.06, 0.3, 3.7]} />
          </mesh>
        </group>
      ))}
      {/* the bullet nose on the front (-Z) car */}
      <mesh material={noseMat} position={[0, 0, -10.6]} rotation-x={-Math.PI / 2}>
        <coneGeometry args={[0.9, 2.6, 6]} />
      </mesh>
      <mesh material={lightMat} position={[0, -0.2, -11.4]}>
        <sphereGeometry args={[0.16, 8, 8]} />
      </mesh>
    </group>
  );
}

// The 青函トンネル neon sign — a glowing canvas panel with a gentle buzz.
function NeonSign() {
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  const texture = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font =
      '700 78px "Hiragino Kaku Gothic Pro", "Yu Gothic", Meiryo, "MS Gothic", "Noto Sans CJK JP", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // neon: a soft cyan halo under a brighter core
    ctx.shadowColor = '#79f6ff';
    ctx.shadowBlur = 26;
    ctx.fillStyle = '#bdfbff';
    ctx.fillText('青函トンネル', 256, 70);
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#eafdff';
    ctx.fillText('青函トンネル', 256, 70);
    return nearestify(new THREE.CanvasTexture(c));
  }, []);

  useDispose(texture);

  useFrame((state) => {
    const m = matRef.current;
    if (!m) return;
    // Gentle, sub-3 Hz neon buzz with an occasional dim flicker — never off, so
    // there is no on/off strobe. Stays well within WCAG 2.3.1 (small + dim).
    const t = state.clock.elapsedTime;
    const flick = Math.sin(t * 9.1) > 0.93 ? 0.6 : 1; // rare brief dip
    m.opacity = (0.82 + Math.sin(t * 1.5) * 0.12) * flick;
  });

  return (
    // Straight ahead down the tunnel, above the flood line, facing the camera.
    <group position={[0, 3.1, -2.5]}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[4.4, 1.2, 0.16]} />
        <meshBasicMaterial color="#070a0d" />
      </mesh>
      <mesh>
        <planeGeometry args={[4.2, 1.05]} />
        <meshBasicMaterial ref={matRef} map={texture} transparent depthWrite={false} fog />
      </mesh>
    </group>
  );
}

// The flooded floor — undersea Seikan. A translucent plane with scrolling
// caustics, just above the GLB floor, so the tunnel reads knee-deep in water.
function FloodWater({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;

  const caustics = useMemo(() => {
    const t = makeCheckerTexture(8, '#0e3b46', '#155c66');
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 12);
    return t;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: caustics,
        color: '#7fd6e0',
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
        fog: true,
      }),
    [caustics],
  );

  useDispose(caustics, mat);

  useFrame((state) => {
    // drift the caustics so the water looks alive
    const t = state.clock.elapsedTime;
    caustics.offset.set(Math.sin(t * 0.08) * 0.2, (t * 0.03) % 1);
  });

  return (
    <mesh material={mat} rotation-x={-Math.PI / 2} position={[0, 0.07, 0]}>
      <planeGeometry args={[W * 2 + 4, D * 2 + 40]} />
    </mesh>
  );
}

export function MetroTunnelFx({ room }: { room: Room }) {
  return (
    <group>
      <FloodWater room={room} />
      <NeonSign />
      <Shinkansen />
    </group>
  );
}
