import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeTextTexture } from './ps1';

// ───────────────────────────────────────────────────────────────────────────
// ArcadeCabinet — a procedural PS1 upright arcade machine (replaces the generic
// bought GLB): a chunky body with side art, a lit marquee, a recessed glowing CRT
// (blinking INSERT COIN), and an angled control panel with a ball-top JOYSTICK +
// three chunky buttons. Flat-shaded, sharp, late-90s. `tint` colours the side art
// so two cabinets can read a little different. Faces +Z; place via position/rotationY.
// ───────────────────────────────────────────────────────────────────────────
export function ArcadeCabinet({
  position = [0, 0, 0],
  rotationY = 0,
  tint = '#b8348f',
  marquee = 'PIZZA RUN',
}: {
  position?: [number, number, number];
  rotationY?: number;
  tint?: string;
  marquee?: string;
}) {
  // Unlit (flatMat) materials read by colour + silhouette, not shading — so the
  // body is a readable dark indigo (not near-black) and the front carries bold
  // bright detail (marquee, glowing CRT, grille, joystick, buttons) like the
  // jukebox cabinet does.
  const bodyMat = useMemo(() => flatMat('#42355f'), []); // dark indigo cabinet
  const artMat = useMemo(() => flatMat(tint), [tint]); // side-art accent
  const trimMat = useMemo(() => flatMat('#15121f'), []);
  const panelMat = useMemo(() => flatMat('#2c2740'), []);
  const stickMat = useMemo(() => flatMat('#15141c'), []);
  const ballMat = useMemo(() => flatMat('#e23b2e'), []); // red joystick ball
  const btnMats = useMemo(() => [flatMat('#e23b2e'), flatMat('#ffce4d'), flatMat('#39c0ff')], []);

  // The marquee — a lit banner with the game name.
  const marqueeTex = useMemo(
    () => makeTextTexture(marquee, { fg: '#ffe27a', bg: '#1a0a22', w: 256, h: 64 }),
    [marquee],
  );
  const marqueeMat = useMemo(() => new THREE.MeshBasicMaterial({ map: marqueeTex }), [marqueeTex]);

  // The CRT screen — dark glass with a blinking amber INSERT COIN; a slow scanline
  // shimmer on the glow (WCAG-safe — no strobe).
  const screenTex = useMemo(
    () => makeTextTexture('INSERT\nCOIN', { fg: '#ffb43a', bg: '#070a10', w: 128, h: 128 }),
    [],
  );
  const screenMat = useMemo(() => new THREE.MeshBasicMaterial({ map: screenTex }), [screenTex]);
  const glow = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // gentle CRT breathing + a slow INSERT-COIN blink
    if (glow.current) glow.current.intensity = 0.5 + Math.sin(t * 5) * 0.08;
    screenMat.opacity = Math.sin(t * 1.6) > -0.4 ? 1 : 0.55;
    screenMat.transparent = true;
  });

  useEffect(
    () => () => {
      [bodyMat, artMat, trimMat, panelMat, stickMat, ballMat, marqueeMat, screenMat].forEach((m) =>
        m.dispose(),
      );
      btnMats.forEach((m) => m.dispose());
      marqueeTex.dispose();
      screenTex.dispose();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <group position={position} rotation-y={rotationY}>
      {/* lower body */}
      <mesh material={bodyMat} position={[0, 0.55, 0]}>
        <boxGeometry args={[0.92, 1.1, 0.86]} />
      </mesh>
      {/* side-art panels (the accent colour) */}
      <mesh material={artMat} position={[-0.465, 0.55, 0]}>
        <boxGeometry args={[0.02, 1.06, 0.82]} />
      </mesh>
      <mesh material={artMat} position={[0.465, 0.55, 0]}>
        <boxGeometry args={[0.02, 1.06, 0.82]} />
      </mesh>
      {/* coin door on the lower front */}
      <mesh material={trimMat} position={[0, 0.34, 0.44]}>
        <boxGeometry args={[0.34, 0.26, 0.04]} />
      </mesh>
      <mesh material={artMat} position={[0, 0.34, 0.46]}>
        <boxGeometry args={[0.08, 0.12, 0.02]} />
      </mesh>

      {/* the angled control panel */}
      <group position={[0, 1.12, 0.36]} rotation-x={-0.62}>
        <mesh material={panelMat}>
          <boxGeometry args={[0.9, 0.4, 0.06]} />
        </mesh>
        {/* joystick: base, stick, ball top */}
        <mesh material={stickMat} position={[-0.22, 0, 0.05]}>
          <cylinderGeometry args={[0.07, 0.08, 0.04, 10]} />
        </mesh>
        <mesh material={stickMat} position={[-0.22, 0.09, 0.05]}>
          <cylinderGeometry args={[0.02, 0.02, 0.18, 6]} />
        </mesh>
        <mesh material={ballMat} position={[-0.22, 0.2, 0.05]}>
          <sphereGeometry args={[0.055, 10, 8]} />
        </mesh>
        {/* three chunky buttons */}
        {[0.05, 0.2, 0.35].map((x, i) => (
          <mesh key={x} material={btnMats[i]} position={[x, 0, 0.05]} rotation-x={Math.PI / 2}>
            <cylinderGeometry args={[0.05, 0.05, 0.05, 12]} />
          </mesh>
        ))}
      </group>

      {/* the upper screen housing (set back from the panel) */}
      <mesh material={bodyMat} position={[0, 1.62, -0.05]}>
        <boxGeometry args={[0.92, 0.92, 0.72]} />
      </mesh>
      {/* the recessed dark bezel + the glowing CRT */}
      <mesh material={trimMat} position={[0, 1.66, 0.32]}>
        <planeGeometry args={[0.74, 0.64]} />
      </mesh>
      <mesh material={screenMat} position={[0, 1.66, 0.33]}>
        <planeGeometry args={[0.6, 0.5]} />
      </mesh>
      <pointLight
        ref={glow}
        position={[0, 1.66, 0.9]}
        intensity={0.8}
        distance={4}
        color="#9fd2ff"
      />

      {/* the lit marquee on top */}
      <mesh material={bodyMat} position={[0, 2.18, 0.0]}>
        <boxGeometry args={[0.96, 0.3, 0.78]} />
      </mesh>
      <mesh material={marqueeMat} position={[0, 2.18, 0.4]}>
        <planeGeometry args={[0.86, 0.24]} />
      </mesh>
    </group>
  );
}
