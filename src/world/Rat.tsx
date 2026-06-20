import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { applyVertexSnap } from './ps1';
import { SECRET_PANEL } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';

// The rat — one steering agent (the single-boid version of the school sim):
// it seeks a waypoint a few steps AHEAD of you down the hall (so it leads), and
// FLEES when you get too close (so it stays skittish and you never quite catch
// it). It hugs a wall and scurries. Management insists he pays rent.
//
// Once you've come far enough down the corridor he breaks off, darts to a blank
// panel in the wall and KNOCKS it — and a hidden door clicks open (revealSecret).
// Then he bolts off into the dark. That's the one secret.
const RAT_Y = 0.22;
const LEAD = 5.0; // how far ahead of the player it leads
const FLEE = 3.2; // get this close and it bolts
const TRIGGER_Z = 4; // player passes this (heading -Z) and the rat goes to knock
const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();

type RatPhase = 'lead' | 'toPanel' | 'knock' | 'done';

function RatBody() {
  const bodyMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#52505a', flatShading: true });
    applyVertexSnap(m, 64);
    return m;
  }, []);
  const earMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#b0727e', flatShading: true });
    applyVertexSnap(m, 64);
    return m;
  }, []);
  const tailMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#6a5560', flatShading: true });
    applyVertexSnap(m, 64);
    return m;
  }, []);
  // Local space: nose points +Z (so lookAt orients travel).
  return (
    <group>
      {/* body — a stretched low-poly blob */}
      <mesh material={bodyMat} scale={[0.34, 0.3, 0.6]} position={[0, 0, 0]}>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
      {/* snout */}
      <mesh material={bodyMat} scale={[0.16, 0.16, 0.3]} position={[0, -0.02, 0.5]}>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
      {/* ears */}
      <mesh material={earMat} position={[0.16, 0.22, 0.16]} rotation-x={-0.3}>
        <circleGeometry args={[0.12, 6]} />
      </mesh>
      <mesh material={earMat} position={[-0.16, 0.22, 0.16]} rotation-x={-0.3}>
        <circleGeometry args={[0.12, 6]} />
      </mesh>
      {/* tail — a thin tapering whip trailing -Z */}
      <mesh material={tailMat} position={[0, 0.02, -0.7]} rotation-x={Math.PI / 2}>
        <coneGeometry args={[0.05, 0.9, 5]} />
      </mesh>
    </group>
  );
}

export function Rat({ bounds }: { bounds: { halfW: number; halfD: number } }) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();
  // Start near the shop (+Z) end, hugging the left wall.
  const pos = useRef(new THREE.Vector3(-bounds.halfW + 0.8, RAT_Y, bounds.halfD - 4));
  const vel = useRef(new THREE.Vector3(0, 0, -1));
  const phase = useRef<RatPhase>('lead');
  const knockT = useRef(0);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const player = camera.position;
    const store = useSceneStore.getState();

    // Phase transitions. Once you're far enough down the hall, the rat breaks off
    // to knock the panel; after the knock the secret is open and he bolts.
    if (phase.current === 'lead' && player.z < TRIGGER_Z && !store.secretRevealed) {
      phase.current = 'toPanel';
    }

    let speed = 4.4;
    let allowFlee = false;
    if (phase.current === 'lead') {
      // LEAD units ahead, down the corridor (-Z), hugging the left wall + wobble.
      const leadZ = THREE.MathUtils.clamp(player.z - LEAD, -bounds.halfD + 1.2, bounds.halfD - 1.2);
      _target.set(-bounds.halfW + 0.8 + Math.sin(t * 5) * 0.35, RAT_Y, leadZ);
      allowFlee = true;
    } else if (phase.current === 'toPanel') {
      // Dart to the panel; focused, doesn't flee.
      _target.set(SECRET_PANEL[0] + 0.45, RAT_Y, SECRET_PANEL[2]);
      const dx = pos.current.x - _target.x;
      const dz = pos.current.z - _target.z;
      if (Math.hypot(dx, dz) < 0.5) {
        phase.current = 'knock';
        knockT.current = 0;
      }
    } else if (phase.current === 'knock') {
      // Lunge at the wall, again and again — the knock. Reveal after the first
      // hit; bolt once he's rapped it a few times.
      knockT.current += dt;
      const lunge = Math.max(0, Math.sin(knockT.current * 16)) * 0.4;
      _target.set(SECRET_PANEL[0] + 0.2 - lunge, RAT_Y, SECRET_PANEL[2]);
      speed = 7;
      if (knockT.current > 0.45) store.revealSecret();
      if (knockT.current > 1.7) phase.current = 'done';
    } else {
      // Done: bolt for the dark far (-Z) end and skitter there.
      _target.set(-bounds.halfW + 0.7, RAT_Y, -bounds.halfD + 1.2 + Math.sin(t * 4) * 0.4);
      speed = 5.5;
    }

    _desired.subVectors(_target, pos.current);
    _desired.y = 0;
    if (_desired.lengthSq() > 1e-5) _desired.normalize().multiplyScalar(speed);

    // Flee: if the player crowds it (only while leading/bolting), push away.
    if (allowFlee) {
      _toPlayer.subVectors(player, pos.current);
      _toPlayer.y = 0;
      const pd = _toPlayer.length();
      if (pd < FLEE && pd > 1e-3) {
        _desired.addScaledVector(_toPlayer.normalize(), -speed * 1.6 * (1 - pd / FLEE));
      }
    }

    // Steer (smooth) + integrate.
    vel.current.lerp(_desired, phase.current === 'knock' ? 0.4 : 0.12);
    pos.current.addScaledVector(vel.current, dt);
    pos.current.x = THREE.MathUtils.clamp(pos.current.x, -bounds.halfW + 0.4, bounds.halfW - 0.4);
    pos.current.z = THREE.MathUtils.clamp(pos.current.z, -bounds.halfD + 0.8, bounds.halfD - 0.8);
    pos.current.y = RAT_Y + Math.abs(Math.sin(t * 16)) * 0.04; // tiny scurry bob

    g.position.copy(pos.current);
    if (vel.current.lengthSq() > 1e-4) {
      g.lookAt(pos.current.x + vel.current.x, pos.current.y, pos.current.z + vel.current.z);
    }
  });

  return (
    <group ref={ref}>
      <RatBody />
    </group>
  );
}
