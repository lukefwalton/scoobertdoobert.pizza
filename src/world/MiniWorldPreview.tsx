import { useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OCEAN, FOG_NEAR, FOG_FAR, ROOM } from './constants';
import { Room } from './Room';
import { Water } from './Water';
import { Boids } from './Boids';
import { applyVertexSnap } from './ps1';
import { useProgressStore, selectDeepDiver } from '../state/progressStore';

// A tiny fixed-camera render of the world for the machine-room CRT — the
// workstation literally "rendering the dream". Reuses the world's room + water +
// boids at the same PS1 fidelity (no controls, a gentle camera breath). Default
// export + lazy-loaded by the machine room so three.js stays out of the initial
// bundle — it only arrives once you're this deep in the descent.

// THE MACHINE SEES YOU (Phase 5, ckpt 6 — the single set-piece). For a player
// who has tasted real dread (selectDeepDiver — saved maxUnease deep), the CRT
// occasionally renders, for a moment, the back of a low-poly figure standing
// where you stand, looking at the same monitor. Then it's gone. FAKED entirely
// — a placeholder figure in this scene, NEVER a real camera. Rare, dim, eased
// in/out (no flashing → WCAG-safe). A cold/casual visitor never sees it, so the
// descent smoke (fresh session, maxUnease 0) never triggers it either.
function Watcher() {
  const deep = useProgressStore(selectDeepDiver);
  const grp = useRef<THREE.Group>(null);
  // Per-mount phase offset chosen so the FIRST reveal lands a random 4–9s after
  // mount — never on arrival (a guaranteed "nothing at first glance" beat) and
  // never synced to mount time. (Reveal fires when the 11s cycle wraps to 0; we
  // start the cycle at 11 − firstDelay so it wraps after firstDelay seconds.)
  const phaseOffset = useMemo(() => 11 - (4 + Math.random() * 5), []);
  const mat = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({ color: '#070709', transparent: true, opacity: 0 });
    applyVertexSnap(m, 64);
    return m;
  }, []);
  useFrame((state) => {
    const g = grp.current;
    if (!g) return;
    if (!deep) {
      g.visible = false;
      return;
    }
    // Visible ~1.1s out of every ~11s, eased in and out (a sine bump, never a
    // hard cut → no flash). "Did I just see that?"
    const c = (state.clock.elapsedTime + phaseOffset) % 11;
    const f = c < 1.1 ? Math.sin((c / 1.1) * Math.PI) : 0;
    mat.opacity = f * 0.9;
    g.visible = f > 0.01;
  });
  // A back-turned silhouette in the foreground between the CRT camera and the
  // window — reads as "you, from behind, watching the same screen."
  return (
    <group ref={grp} position={[0, 0, ROOM.halfD - 3.6]} visible={false}>
      <mesh material={mat} position={[0, 0.95, 0]}>
        <boxGeometry args={[0.52, 1.12, 0.3]} />
      </mesh>
      <mesh material={mat} position={[0, 1.72, 0]}>
        <icosahedronGeometry args={[0.2, 0]} />
      </mesh>
    </group>
  );
}

function MiniCam() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // slow lateral/vertical breath; orientation stays facing the window
    state.camera.position.x = Math.sin(t * 0.22) * 0.6;
    state.camera.position.y = ROOM.eye + Math.sin(t * 0.35) * 0.12;
  });
  return null;
}

export default function MiniWorldPreview() {
  return (
    <Canvas
      dpr={1}
      flat
      gl={{ antialias: false, powerPreference: 'low-power' }}
      camera={{ fov: 70, near: 0.1, far: 220, position: [0, ROOM.eye, ROOM.halfD - 1.5] }}
      onCreated={({ scene, gl }) => {
        scene.background = OCEAN;
        scene.fog = new THREE.Fog(OCEAN, FOG_NEAR, FOG_FAR);
        gl.setClearColor(OCEAN);
      }}
      style={{ position: 'absolute', inset: 0, imageRendering: 'pixelated' }}
    >
      <ambientLight intensity={0.8} color="#bfe6f5" />
      <directionalLight position={[6, 12, 4]} intensity={0.9} color="#fff4e0" />
      <Room />
      <Water />
      <Boids />
      <Watcher />
      <MiniCam />
    </Canvas>
  );
}
