import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeTextTexture } from './ps1';

// ───────────────────────────────────────────────────────────────────────────
// D20 — the dice-music selector (Phase 6). A low-poly twenty-sided die on a
// little pedestal beside the jukebox. The cabinet cycles the catalog in order;
// the die is the CHAOS path — click it, it tumbles, lands on a face, and the
// jukebox jumps to whatever the dice picked. Luke loves D&D; "exploration's
// reward is sound," and a roll is the cheapest replayable surprise: the same
// room sounds different every time you come back to it.
//
// The die is an icosahedron (20 faces = a real d20). The landed number is
// announced on a little plaque above it; the visual orientation is stylized, not
// a per-face solve (overkill for the gag). Reduced-motion gets an instant roll.
// ───────────────────────────────────────────────────────────────────────────

const ROLL_MS = 1100;

export function D20({
  position,
  onRoll,
  lastRoll,
}: {
  position: [number, number, number];
  /** Called with the landed face (1..20) once the tumble settles. */
  onRoll: (face: number) => void;
  /** The face to show on the plaque (null before the first roll). */
  lastRoll: number | null;
}) {
  const { gl } = useThree();
  const dieRef = useRef<THREE.Group>(null);
  const rolling = useRef(false);
  const elapsed = useRef(0);
  const spin = useRef(new THREE.Vector3());
  const reduced = useRef(false);

  const dieMat = useMemo(() => flatMat('#e9e0c8'), []); // bone / ivory
  const pedMat = useMemo(() => flatMat('#2a1430'), []); // dark plinth, matches the room

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

  // The plaque: "d20" + the landed number (or "ROLL ME" before the first roll).
  const plaqueTex = useMemo(
    () =>
      makeTextTexture(lastRoll == null ? 'd20\nROLL ME' : `d20\n${lastRoll}`, {
        fg: '#ffce6b',
        bg: '#160a02',
        w: 128,
        h: 96,
      }),
    [lastRoll],
  );
  const plaqueMat = useMemo(() => new THREE.MeshBasicMaterial({ map: plaqueTex }), [plaqueTex]);
  useEffect(() => () => plaqueTex.dispose(), [plaqueTex]);

  const settle = () => {
    rolling.current = false;
    const face = 1 + Math.floor(Math.random() * 20);
    onRoll(face);
  };

  const roll = () => {
    if (rolling.current) return;
    if (reduced.current) {
      settle(); // no tumble under reduced motion — just announce the result
      return;
    }
    rolling.current = true;
    elapsed.current = 0;
    // A lively random tumble that eases out over ROLL_MS.
    spin.current.set(6 + Math.random() * 8, 6 + Math.random() * 8, 6 + Math.random() * 8);
  };

  useFrame((_, delta) => {
    const g = dieRef.current;
    if (!g) return;
    if (rolling.current) {
      elapsed.current += delta * 1000;
      const k = Math.max(0, 1 - elapsed.current / ROLL_MS); // ease-out factor
      g.rotation.x += spin.current.x * delta * k;
      g.rotation.y += spin.current.y * delta * k;
      g.rotation.z += spin.current.z * delta * k;
      // A little hop while it tumbles, landing back on the pedestal.
      g.position.y = Math.sin((1 - k) * Math.PI) * 0.35;
      if (k <= 0) {
        g.position.y = 0;
        settle();
      }
    } else if (!reduced.current) {
      // Idle slow spin so it reads as interactive — but reduced-motion means NO
      // die animation at all (no tumble AND no idle spin); it sits dead still.
      g.rotation.y += delta * 0.4;
    }
  });

  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  return (
    <group position={position}>
      {/* pedestal */}
      <mesh material={pedMat} position={[0, -0.55, 0]}>
        <cylinderGeometry args={[0.42, 0.5, 0.5, 8]} />
      </mesh>
      {/* the die — the whole thing is the control */}
      <group
        ref={dieRef}
        onClick={(e) => {
          e.stopPropagation();
          roll();
        }}
        onPointerOver={() => {
          gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
        }}
        onPointerOut={() => {
          gl.domElement.style.cursor = 'grab';
        }}
      >
        <mesh material={dieMat}>
          <icosahedronGeometry args={[0.4, 0]} />
        </mesh>
      </group>
      {/* faint glow so it catches the eye in the dim shrine */}
      <pointLight position={[0, 0.4, 0.4]} intensity={0.4} distance={4} color="#ffe6a8" />
      {/* the result plaque, floating just above */}
      <mesh material={plaqueMat} position={[0, 0.95, 0]}>
        <planeGeometry args={[0.7, 0.52]} />
      </mesh>
    </group>
  );
}
