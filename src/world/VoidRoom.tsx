import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, PS1_SNAP_GLSL, PS1_DITHER_GLSL } from './ps1';
import { PS1 } from './constants';
import { useDispose } from '../lib/useDispose';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// VoidRoom — "The Void" (虚空). The cosmic 3D-screensaver deep off the theremin: a
// wordless black gulf where a handful of blue RINGED PLANETS drift in slow orbits
// over a dark, rippling, reflective void-floor, under a full dome of stars. Pure
// 90s-screensaver wonder — sweet, hypnotic, below SAFE (a cosmic exhale, never a
// scare; the taste line holds). Original-parody PS1 geometry: faceted low-poly
// planets (flat-lit crescents), a compact vertex-snapped ripple shader for the
// floor, and a seeded starfield. All drift + ripple FREEZE under reduced motion.
// ───────────────────────────────────────────────────────────────────────────

type PlanetCfg = {
  base: [number, number, number];
  size: number;
  color: string;
  ring: string;
  orbit: number; // orbit angular speed
  radius: number; // orbit radius
  phase: number;
  bob: number; // vertical bob speed
};

const PLANETS: PlanetCfg[] = [
  {
    base: [-5, 3.6, -7],
    size: 1.1,
    color: '#3a6ad0',
    ring: '#7aa8ec',
    orbit: 0.18,
    radius: 1.2,
    phase: 0,
    bob: 0.5,
  },
  {
    base: [6, 4.6, -9],
    size: 1.7,
    color: '#2a4aa0',
    ring: '#5f8ad8',
    orbit: 0.12,
    radius: 1.6,
    phase: 2,
    bob: 0.4,
  },
  {
    base: [-7, 5.6, 5],
    size: 0.9,
    color: '#4a8ae0',
    ring: '#8fc0f4',
    orbit: 0.22,
    radius: 1.0,
    phase: 4,
    bob: 0.6,
  },
  {
    base: [4, 3.1, 7],
    size: 1.3,
    color: '#3060c4',
    ring: '#6a98dc',
    orbit: 0.15,
    radius: 1.3,
    phase: 1,
    bob: 0.45,
  },
  {
    base: [0, 6.8, -1],
    size: 2.1,
    color: '#26468e',
    ring: '#456fc0',
    orbit: 0.08,
    radius: 0.9,
    phase: 3,
    bob: 0.3,
  },
];

export function VoidRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;

  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // ── the black shell (dissolves into fog — a void, not a box) ──
  const blackMat = useMemo(() => flatMat('#03040c', { side: THREE.DoubleSide }), []);

  // ── the rippling reflective void floor (compact PS1 ripple shader) ──
  const floorMat = useMemo(() => {
    const fog = fogFor(room);
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uSnap: { value: PS1.snap },
        uColor: { value: new THREE.Color('#05070f') },
        uCrest: { value: new THREE.Color('#1b2c52') },
        uFog: { value: new THREE.Color(fog.color) },
        uFogNear: { value: fog.near },
        uFogFar: { value: fog.far },
      },
      vertexShader: /* glsl */ `
        uniform float uTime;
        uniform float uSnap;
        varying float vViewZ;
        varying float vRipple;
        ${PS1_SNAP_GLSL}
        void main() {
          vec3 p = position;
          float w = sin(p.x * 0.5 + uTime * 0.8) * 0.16
                  + sin(p.y * 0.42 - uTime * 0.6) * 0.12
                  + sin((p.x + p.y) * 0.3 + uTime * 0.5) * 0.1;
          p.z += w; // local z → world up (the plane is laid flat)
          vRipple = w;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vViewZ = -mv.z;
          gl_Position = ps1Snap(projectionMatrix * mv, uSnap);
        }
      `,
      fragmentShader: /* glsl */ `
        precision mediump float;
        uniform vec3 uColor;
        uniform vec3 uCrest;
        uniform vec3 uFog;
        uniform float uFogNear;
        uniform float uFogFar;
        varying float vViewZ;
        varying float vRipple;
        ${PS1_DITHER_GLSL}
        void main() {
          float c = smoothstep(0.04, 0.22, vRipple);
          vec3 col = mix(uColor, uCrest, c);
          col = ps1Quantize(col, gl_FragCoord.xy, 10.0);
          float fog = clamp((vViewZ - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
          col = mix(col, uFog, fog);
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }, [room]);

  // per-planet materials (faceted flat-lit sphere + a brighter ring band)
  const planetMats = useMemo(() => PLANETS.map((p) => flatMat(p.color)), []);
  const ringMats = useMemo(
    () => PLANETS.map((p) => flatMat(p.ring, { side: THREE.DoubleSide })),
    [],
  );

  // ── a full dome of stars (seeded → stable screenshots) ──
  const starGeo = useMemo(() => {
    let s = 0x2f6a11d3 >>> 0;
    const rand = () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const N = 220;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      // scatter on a big surrounding sphere so stars ring the whole void
      const u = rand() * 2 - 1;
      const th = rand() * Math.PI * 2;
      const r = 26 + rand() * 10;
      const sr = Math.sqrt(1 - u * u);
      pos[i * 3] = Math.cos(th) * sr * r;
      pos[i * 3 + 1] = Math.abs(u) * r * 0.9 + 1; // keep them mostly overhead
      pos[i * 3 + 2] = Math.sin(th) * sr * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const starMat = useMemo(
    () => new THREE.PointsMaterial({ color: '#cfe0ff', size: 0.14, sizeAttenuation: true }),
    [],
  );

  useDispose(blackMat, floorMat, ...planetMats, ...ringMats, starGeo, starMat);

  // Drift the planets in slow orbits + advance the floor ripple. Frozen entirely
  // under reduced motion (a still cosmos), so the one moving thing here is opt-in.
  const planetRefs = useRef<(THREE.Group | null)[]>([]);
  useFrame((state) => {
    if (reduceMotion) return;
    const t = state.clock.elapsedTime;
    floorMat.uniforms.uTime.value = t;
    for (let i = 0; i < PLANETS.length; i++) {
      const g = planetRefs.current[i];
      if (!g) continue;
      const p = PLANETS[i];
      g.position.set(
        p.base[0] + Math.cos(t * p.orbit + p.phase) * p.radius,
        p.base[1] + Math.sin(t * p.bob + p.phase) * 0.5,
        p.base[2] + Math.sin(t * p.orbit + p.phase) * p.radius,
      );
      g.rotation.y = t * 0.15 + p.phase;
    }
  });

  return (
    <group>
      {/* the faintest cosmic fill + one distant "starlight" so the planets read as
          lit crescents against the black, not flat discs */}
      <ambientLight intensity={0.18} color="#3a4a80" />
      <directionalLight position={[6, 9, 4]} intensity={0.7} color="#dfe8ff" />

      {/* the black shell (walls + ceiling dissolve into fog; the floor is the void) */}
      <RoomBox dims={room.dims} floor={blackMat} ceiling={blackMat} sides={blackMat} />

      {/* the rippling reflective void, just above the black floor */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0.06, 0]}>
        <planeGeometry args={[W * 2.2, D * 2.2, 44, 44]} />
      </mesh>

      {/* the star dome */}
      <points geometry={starGeo} material={starMat} />

      {/* the drifting ringed planets */}
      {PLANETS.map((p, i) => (
        <group key={i} ref={(el) => (planetRefs.current[i] = el)} position={p.base}>
          <mesh material={planetMats[i]}>
            <sphereGeometry args={[p.size, 12, 10]} />
          </mesh>
          <mesh material={ringMats[i]} rotation-x={-1.15} rotation-z={0.3}>
            <ringGeometry args={[p.size * 1.35, p.size * 1.95, 28]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
