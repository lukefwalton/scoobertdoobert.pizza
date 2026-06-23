import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, applyVertexSnap } from './ps1';
import { isTestEntrance } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// Wanderer — a roaming entity for the big GLB levels (the generalized cousin of
// Rat.tsx's single-boid steering). It drifts between waypoints; when you get
// close it stops and DANCES instead of doing anything threatening — the world's
// "funny-uncanny, never traumatic" promise made literal. Walk away and it goes
// back to wandering. It never lunges, blocks a door, or traps you.
//
// TASTE / WCAG: the dance is a gentle bob + slow spin + soft squash, amplitude
// capped under prefers-reduced-motion; no strobe, no full-field flash. These
// only ever live in the deep liminal levels (data-driven), as a relief beat
// against the dread there — the contrast is the point.
// ───────────────────────────────────────────────────────────────────────────

type WanderPhase = 'wander' | 'approach' | 'dance';
export type EntityBodyKind = 'blob' | 'lurker' | 'mop';

const _target = new THREE.Vector3();
const _desired = new THREE.Vector3();

const REDUCED =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

const EXPOSE_PHASE = isTestEntrance();

// A cheap low-poly body, in the DiceMonster grammar (icosahedron + big googly
// eyes), recolored per kind so the four levels don't share one creature. Built
// with feet near y=0; the parent group lifts/bobs it. Eyes on +Z so a lookAt
// turns the face toward you.
function EntityBody({ kind }: { kind: EntityBodyKind }) {
  const palette: Record<EntityBodyKind, { body: string; belly: string }> = {
    blob: { body: '#6a6f8a', belly: '#8a8fae' },
    lurker: { body: '#7a5e6e', belly: '#9a7e8e' },
    mop: { body: '#8a8470', belly: '#a8a288' },
  };
  const c = palette[kind];
  const bodyMat = useMemo(() => flatMat(c.body), [c.body]);
  const bellyMat = useMemo(() => flatMat(c.belly), [c.belly]);
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f4f1dd' }), []);
  const pupilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#161018' }), []);
  const shagMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: c.body, flatShading: true });
    applyVertexSnap(m, 64);
    return m;
  }, [c.body]);

  const tall = kind === 'lurker';
  const h = tall ? 0.85 : 0.55;
  return (
    <group>
      {/* body */}
      <mesh material={bodyMat} position={[0, h, 0]} scale={tall ? [0.7, 1.15, 0.7] : [1, 1, 1]}>
        <icosahedronGeometry args={[0.55, 0]} />
      </mesh>
      {/* paler belly */}
      <mesh material={bellyMat} position={[0, h - 0.12, 0.18]}>
        <icosahedronGeometry args={[0.36, 0]} />
      </mesh>
      {/* a shaggy "mop" fringe over the top for the janitor-of-the-backrooms one */}
      {kind === 'mop' &&
        [-0.3, -0.1, 0.1, 0.3].map((x) => (
          <mesh key={x} material={shagMat} position={[x, h + 0.4, 0.05]} rotation-x={0.2}>
            <coneGeometry args={[0.12, 0.6, 4]} />
          </mesh>
        ))}
      {/* eyes — one big cyclops eye for the lurker, two for the others */}
      {(kind === 'lurker' ? [0] : [-0.2, 0.2]).map((x) => (
        <group key={x} position={[x, h + 0.16, 0.44]}>
          <mesh material={eyeMat}>
            <sphereGeometry args={[kind === 'lurker' ? 0.22 : 0.15, 8, 6]} />
          </mesh>
          <mesh material={pupilMat} position={[0, 0, kind === 'lurker' ? 0.16 : 0.11]}>
            <sphereGeometry args={[kind === 'lurker' ? 0.1 : 0.07, 6, 5]} />
          </mesh>
        </group>
      ))}
      {/* stubby feet */}
      {[-0.24, 0.24].map((x) => (
        <mesh key={x} material={bodyMat} position={[x, 0.12, 0.06]}>
          <boxGeometry args={[0.2, 0.24, 0.28]} />
        </mesh>
      ))}
    </group>
  );
}

export function Wanderer({
  id,
  body,
  bounds,
  spawn,
  danceRadius = 4.2,
  speed = 2.2,
}: {
  id: string;
  body: EntityBodyKind;
  bounds: { halfW: number; halfD: number };
  spawn: [number, number];
  /** Get this close → it stops a readable few steps off and dances; ~2× that is
   *  its "notice" range. Tuned so a dancer sits in frame, not at your feet below
   *  the downward view. */
  danceRadius?: number;
  speed?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const { camera } = useThree();

  // Keep entities off the walls/doors: roam the inner 80% of the room.
  const inW = bounds.halfW * 0.8;
  const inD = bounds.halfD * 0.8;
  const clamp = (v: number, lim: number) => THREE.MathUtils.clamp(v, -lim, lim);

  const pos = useRef(new THREE.Vector3(clamp(spawn[0], inW), 0, clamp(spawn[1], inD)));
  const vel = useRef(new THREE.Vector3());
  const waypoint = useRef(new THREE.Vector3(pos.current.x, 0, pos.current.z));
  const phase = useRef<WanderPhase>('wander');
  const danceT = useRef(0);
  // A per-entity phase offset so a group of them don't dance in lockstep.
  const seed = useRef(Math.random() * 100);

  const pickWaypoint = () => {
    waypoint.current.set((Math.random() * 2 - 1) * inW, 0, (Math.random() * 2 - 1) * inD);
  };

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const t = state.clock.elapsedTime + seed.current;
    const player = camera.position;

    const dx = player.x - pos.current.x;
    const dz = player.z - pos.current.z;
    const distToPlayer = Math.hypot(dx, dz);
    const notice = danceRadius * 2;

    // Phase: dance when close, approach when noticed, else wander. Hysteresis on
    // the way out of the dance so it doesn't flicker at the boundary.
    if (distToPlayer < danceRadius) phase.current = 'dance';
    else if (phase.current === 'dance' && distToPlayer < danceRadius + 1.5) {
      /* keep dancing through the hysteresis band */
    } else if (distToPlayer < notice) phase.current = 'approach';
    else phase.current = 'wander';

    if (phase.current === 'dance') {
      // Stop translating; the dance is procedural. Gentle (taste/WCAG), and tiny
      // under reduced motion. Face the player so the googly eyes meet yours.
      vel.current.multiplyScalar(Math.pow(0.0001, dt)); // damp to a stop
      const amp = REDUCED ? 0.25 : 1;
      danceT.current += dt;
      const hop = Math.abs(Math.sin(t * 6)) * 0.22 * amp;
      const sway = Math.sin(t * 3) * 0.12 * amp;
      g.position.set(pos.current.x + sway, hop, pos.current.z);
      g.rotation.y = Math.atan2(dx, dz) + Math.sin(t * 4) * 0.5 * amp; // bobble-turn toward you
      const squash = 1 + Math.sin(t * 12) * 0.08 * amp;
      g.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash));
      if (EXPOSE_PHASE) (window as unknown as Record<string, unknown>)[`__sdpEntity:${id}`] = 'dance';
      return;
    }

    // Wander / approach: steer toward a target.
    if (phase.current === 'approach') {
      // Drift toward the player (but stop short — the dance radius handles arrival).
      _target.set(player.x, 0, player.z);
    } else {
      // Roam: head to the current waypoint, pick a new one when reached.
      const wd = Math.hypot(pos.current.x - waypoint.current.x, pos.current.z - waypoint.current.z);
      if (wd < 0.6) pickWaypoint();
      _target.copy(waypoint.current);
    }
    _desired.subVectors(_target, pos.current);
    _desired.y = 0;
    if (_desired.lengthSq() > 1e-5) _desired.normalize().multiplyScalar(speed);
    vel.current.lerp(_desired, 0.06);
    pos.current.addScaledVector(vel.current, dt);
    pos.current.x = clamp(pos.current.x, inW);
    pos.current.z = clamp(pos.current.z, inD);

    // A little walk-bob; reset any dance squash.
    const walkBob = REDUCED ? 0 : Math.abs(Math.sin(t * 8)) * 0.05;
    g.position.set(pos.current.x, walkBob, pos.current.z);
    g.scale.set(1, 1, 1);
    if (vel.current.lengthSq() > 1e-4)
      g.lookAt(pos.current.x + vel.current.x, walkBob, pos.current.z + vel.current.z);
    if (EXPOSE_PHASE)
      (window as unknown as Record<string, unknown>)[`__sdpEntity:${id}`] = phase.current;
  });

  return (
    <group ref={ref}>
      <EntityBody kind={body} />
    </group>
  );
}
