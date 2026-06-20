import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { applyVertexSnap } from './ps1';

// The rat — one steering agent (the single-boid version of the school sim):
// it seeks a waypoint a few steps AHEAD of you down the hall (so it leads), and
// FLEES when you get too close (so it stays skittish and you never quite catch
// it). It hugs a wall and scurries. Management insists he pays rent. In a later
// checkpoint he stops at a blank panel and knocks — that's the secret.
const RAT_Y = 0.22;
const LEAD = 5.0; // how far ahead of the player it leads
const FLEE = 3.2; // get this close and it bolts
const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();
const _toPlayer = new THREE.Vector3();

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

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime;
    const player = camera.position;

    // Waypoint: LEAD units ahead of the player down the corridor (-Z), hugging
    // the left wall with a little scurrying wobble.
    const leadZ = THREE.MathUtils.clamp(player.z - LEAD, -bounds.halfD + 1.2, bounds.halfD - 1.2);
    const wallX = -bounds.halfW + 0.8 + Math.sin(t * 5) * 0.35;
    _target.set(wallX, RAT_Y, leadZ);

    _desired.subVectors(_target, pos.current);
    _desired.y = 0;
    const speed = 4.4;
    if (_desired.lengthSq() > 1e-5) _desired.normalize().multiplyScalar(speed);

    // Flee: if the player crowds it, push directly away (skittish).
    _toPlayer.subVectors(player, pos.current);
    _toPlayer.y = 0;
    const pd = _toPlayer.length();
    if (pd < FLEE && pd > 1e-3) {
      _desired.addScaledVector(_toPlayer.normalize(), -speed * 1.6 * (1 - pd / FLEE));
    }

    // Steer (smooth) + integrate.
    vel.current.lerp(_desired, 0.12);
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
