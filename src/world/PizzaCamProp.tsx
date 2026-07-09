import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeTextTexture, nearestify, seededRandom } from './ps1';
import { useSceneStore } from '../state/sceneStore';

// ───────────────────────────────────────────────────────────────────────────
// PizzaCamProp — the kitchen's in-world entrance to the Pizza Cam™ booth: an
// original low-poly parody of a golf-ball-on-a-stalk 90s webcam, up on a
// tripod next to a small monitor showing frozen static. Press E in range (or
// click it) → openArcade('booth') → the same consent-gated PizzaCamBooth the
// /booth page hosts, in the ArcadeModal.
//
// The monitor's static is a PROCEDURAL seeded-noise texture, generated and
// frozen at mount — no feed of any kind renders in the 3D world (the Webcam
// policy's firewall: the real dithered grid lives only in the DOM booth, and
// the dread system's "sees you" figure lives only on the machine-room CRT;
// none of the three ever share a surface). Desktop-only mount (KitchenRoom
// gates on !useTouchDevice — the booth itself is a parallel-port gag on touch).
// ───────────────────────────────────────────────────────────────────────────

const BOOTH_PROMPT_RADIUS = 3.0;

/** Frozen 64×48 TV static — seeded so every visit's dead monitor looks the same. */
function makeStaticTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 48;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(64, 48);
  const rnd = seededRandom(0x9124);
  for (let p = 0; p < img.data.length; p += 4) {
    const v = 24 + Math.floor(rnd() * 72); // dim grays — a dead channel, not a strobe
    img.data[p] = v;
    img.data[p + 1] = v;
    img.data[p + 2] = v + 6; // faint blue cast
    img.data[p + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return nearestify(new THREE.CanvasTexture(c));
}

export function PizzaCamProp({
  position = [0, 0, 0],
  rotationY = 0,
}: {
  position?: [number, number, number];
  rotationY?: number;
}) {
  const bodyMat = useMemo(() => flatMat('#d8d2c4'), []); // beige 90s plastic
  const darkMat = useMemo(() => flatMat('#3a3630'), []); // tripod + trim
  const lensMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#182034' }), []);
  const monMat = useMemo(() => flatMat('#c9c2b2'), []);
  const staticTex = useMemo(() => makeStaticTexture(), []);
  const staticMat = useMemo(() => new THREE.MeshBasicMaterial({ map: staticTex }), [staticTex]);
  const labelTex = useMemo(
    () => makeTextTexture('PIZZA CAM', { fg: '#c73a2c', bg: '#d8d2c4', w: 256, h: 64 }),
    [],
  );
  const labelMat = useMemo(() => new THREE.MeshBasicMaterial({ map: labelTex }), [labelTex]);

  const { gl, camera } = useThree();
  // Only write the store on a CHANGE (enter/leave range) — the ArcadeCabinet guard.
  const inRange = useRef(false);
  useFrame(() => {
    const st = useSceneStore.getState();
    const frozen =
      st.paused ||
      st.openHotspot !== null ||
      st.transitioning ||
      st.arcadeGame !== null ||
      st.tvVideo !== null ||
      st.divingTo;
    const dx = camera.position.x - position[0];
    const dz = camera.position.z - position[2];
    const near = !frozen && Math.hypot(dx, dz) < BOOTH_PROMPT_RADIUS;
    if (near !== inRange.current) {
      inRange.current = near;
      st.setNearBooth(near);
    }
  });

  // Leaving the room (prop unmounts) must clear any lingering prompt.
  useEffect(() => () => useSceneStore.getState().setNearBooth(false), []);

  useEffect(
    () => () => {
      [bodyMat, darkMat, lensMat, monMat, staticMat, labelMat].forEach((m) => m.dispose());
      staticTex.dispose();
      labelTex.dispose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <group
      position={position}
      rotation-y={rotationY}
      onClick={(e) => {
        e.stopPropagation();
        useSceneStore.getState().openArcade('booth');
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      {/* tripod: three splayed legs + a neck */}
      {[0, (Math.PI * 2) / 3, (Math.PI * 4) / 3].map((a) => (
        <mesh
          key={a}
          material={darkMat}
          position={[Math.sin(a) * 0.28, 0.55, Math.cos(a) * 0.28]}
          rotation={[Math.cos(a) * 0.42, 0, -Math.sin(a) * 0.42]}
        >
          <cylinderGeometry args={[0.025, 0.035, 1.15, 6]} />
        </mesh>
      ))}
      <mesh material={darkMat} position={[0, 1.25, 0]}>
        <cylinderGeometry args={[0.035, 0.035, 0.35, 6]} />
      </mesh>

      {/* the golf-ball camera on its stalk, one big glassy eye facing +Z */}
      <mesh material={bodyMat} position={[0, 1.52, 0]}>
        <sphereGeometry args={[0.16, 12, 10]} />
      </mesh>
      <mesh material={lensMat} position={[0, 1.52, 0.13]}>
        <sphereGeometry args={[0.07, 10, 8]} />
      </mesh>

      {/* the little beige monitor beside it, screen of frozen static */}
      <group position={[0.62, 0, 0.08]} rotation-y={-0.35}>
        <mesh material={darkMat} position={[0, 0.42, 0]}>
          <boxGeometry args={[0.5, 0.84, 0.5]} />
        </mesh>
        <mesh material={monMat} position={[0, 1.06, 0]}>
          <boxGeometry args={[0.56, 0.46, 0.52]} />
        </mesh>
        <mesh material={staticMat} position={[0, 1.06, 0.265]}>
          <planeGeometry args={[0.42, 0.32]} />
        </mesh>
      </group>

      {/* the PIZZA CAM decal strapped to the tripod neck */}
      <mesh material={labelMat} position={[0, 1.02, 0.06]}>
        <planeGeometry args={[0.42, 0.11]} />
      </mesh>
    </group>
  );
}
