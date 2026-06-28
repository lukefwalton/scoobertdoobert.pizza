import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { Water } from './Water';
import { useDispose } from '../lib/useDispose';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// MoonlightRoom — out the +X end of the boardwalk onto a moonlit dance plaza on
// the pier: a checker dance floor under a sag of string lights, the sea + a low
// moon out the -Z back. Sweet surface goof (taste guardrail — the surface stays
// soft + safe). Outdoor + open (no RoomBox). Plays "dancing-in-the-moonlight".
// ───────────────────────────────────────────────────────────────────────────

// A sag of carnival string lights overhead — the signature of the plaza. Bulbs
// hang in a catenary between two posts and twinkle on deterministic phases (slow,
// WCAG-safe — no strobe). Three warm tints share three materials so the whole
// string twinkles on a few cheap mats rather than one-per-bulb.
const BULB_COLORS = ['#ffe6a8', '#ff9ec4', '#a8e6ff'];

function StringLights({ count = 14 }: { count?: number }) {
  const mats = useMemo(
    () =>
      BULB_COLORS.map(
        (c) =>
          new THREE.MeshBasicMaterial({
            color: c,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
      ),
    [],
  );
  const bulbs = useMemo(() => {
    const out: { pos: [number, number, number]; mat: THREE.MeshBasicMaterial }[] = [];
    for (let i = 0; i < count; i++) {
      const t = i / (count - 1); // 0..1 across the span
      const x = -7 + t * 14;
      const sag = Math.sin(t * Math.PI) * 1.1; // catenary-ish dip
      out.push({ pos: [x, 4.6 - sag, -1], mat: mats[i % 3] });
    }
    return out;
  }, [count, mats]);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    mats[0].opacity = 0.7 + 0.3 * Math.sin(t * 1.6);
    mats[1].opacity = 0.7 + 0.3 * Math.sin(t * 1.9 + 1.3);
    mats[2].opacity = 0.7 + 0.3 * Math.sin(t * 2.2 + 2.6);
  });
  useDispose(...mats);
  return (
    <group>
      {/* the wire */}
      <mesh position={[0, 4.1, -1]}>
        <boxGeometry args={[14, 0.04, 0.04]} />
        <meshBasicMaterial color="#0a0a16" />
      </mesh>
      {bulbs.map((b, i) => (
        <mesh key={i} material={b.mat} position={b.pos}>
          <sphereGeometry args={[0.16, 8, 8]} />
        </mesh>
      ))}
    </group>
  );
}

export function MoonlightRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // The pier surround — dim moonlit planks.
  const plankTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#1a1c34', '#222440');
    t.repeat.set(8, 8);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(plankTex, 10, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plankTex, fog.color, fog.near, fog.far],
  );

  // The dance floor — a brighter checker in the centre that breathes a touch in
  // time (slow, WCAG-safe).
  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(2, '#4a3f6e', '#6e5aa0');
    t.repeat.set(4, 4);
    return t;
  }, []);
  const floorMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: floorTex, fog: true }),
    [floorTex],
  );
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const v = 0.78 + 0.22 * (0.5 + 0.5 * Math.sin(t * 1.4));
    floorMat.color.setRGB(v, v * 0.92, v); // gentle violet pulse
  });

  const moonMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#eef1ff' }), []);

  useDispose(plankTex, floorTex);

  return (
    <group>
      {/* warm-tinted moonlit night: a soft indigo hemisphere + a gentle key */}
      <hemisphereLight args={['#b5a8e0', '#10122a', 0.6]} />
      <ambientLight intensity={0.34} color="#9a8fcf" />
      <directionalLight position={[3, 6, -8]} intensity={0.4} color="#e6d8ff" />

      {/* the pier deck */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 2]}>
        <planeGeometry args={[room.dims.halfW * 2 + 40, room.dims.halfD * 2 + 30]} />
      </mesh>

      {/* the dance floor, raised a hair so it reads over the deck */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0.02, 1]}>
        <planeGeometry args={[9, 9]} />
      </mesh>

      {/* the sea out the back, moonlit + crunchy */}
      <Water
        base="#1a2f55"
        crest="#b3a9e6"
        fog={room.palette.fog}
        fogNear={room.palette.fogNear}
        fogFar={room.palette.fogFar}
        y={-0.9}
        z={-22}
      />

      {/* the low moon */}
      <mesh material={moonMat} position={[4, 7, -25]}>
        <circleGeometry args={[1.7, 22]} />
      </mesh>

      <StringLights />
    </group>
  );
}
