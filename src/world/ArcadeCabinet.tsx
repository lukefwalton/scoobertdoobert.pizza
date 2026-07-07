import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeTextTexture } from './ps1';
import { useSceneStore } from '../state/sceneStore';
import { launchArcadeGame, launchRandomArcade } from '../lib/arcade';
import { arcadeGameTitle, type ArcadeGameId } from '../data/arcadeGames';

// ───────────────────────────────────────────────────────────────────────────
// ArcadeCabinet — a procedural PS1 upright arcade machine (replaces the generic
// bought GLB): a chunky body with side art, a lit marquee, a recessed glowing CRT
// (blinking INSERT COIN), and an angled control panel with a ball-top JOYSTICK +
// three chunky buttons. Flat-shaded, sharp, late-90s. `tint` colours the side art
// so two cabinets can read a little different. Faces +Z; place via position/rotationY.
//
// It's PLAYABLE: click it (or press E in range). A DEDICATED cabinet (pass `game`)
// launches ITS one game — the machine's marquee = what it plays. A cabinet with NO
// `game` is the MYSTERY machine: it ROLLS a random game (a slot-pull that keeps it
// feeling alive, rhyming with the site's d20/luck chaos). Proximity drives the
// "Press E to play" prompt, mirroring the album TVs.
// ───────────────────────────────────────────────────────────────────────────

// How close (horizontal) the camera must be for the "play" prompt — matches the TV.
const ARCADE_PROMPT_RADIUS = 3.4;
export function ArcadeCabinet({
  position = [0, 0, 0],
  rotationY = 0,
  tint = '#b8348f',
  game,
  marquee,
}: {
  position?: [number, number, number];
  rotationY?: number;
  tint?: string;
  /** The one game this machine plays. Omit for the MYSTERY cabinet (random roll). */
  game?: ArcadeGameId;
  /** Marquee text; defaults to the game's title (or "?? MYSTERY ??" when random). */
  marquee?: string;
}) {
  // A dedicated cabinet advertises its game; a mystery one flaunts the "?????".
  const resolvedMarquee = marquee ?? (game ? arcadeGameTitle(game) : '?? MYSTERY ??');
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
    () => makeTextTexture(resolvedMarquee, { fg: '#ffe27a', bg: '#1a0a22', w: 256, h: 64 }),
    [resolvedMarquee],
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
  const { gl, camera } = useThree();
  // Only write the store on a CHANGE (enter/leave range), not every frame — the
  // same guard the doors + TV use.
  const inRange = useRef(false);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // gentle CRT breathing + a slow INSERT-COIN blink
    if (glow.current) glow.current.intensity = 0.5 + Math.sin(t * 5) * 0.08;
    screenMat.opacity = Math.sin(t * 1.6) > -0.4 ? 1 : 0.55;
    screenMat.transparent = true;

    // "Press E to play" proximity — no prompt under a modal / mid-transition / while
    // a game is already up (mirrors TvSet's frozen check).
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
    const near = !frozen && Math.hypot(dx, dz) < ARCADE_PROMPT_RADIUS;
    if (near !== inRange.current) {
      inRange.current = near;
      st.setNearArcade(near, game ?? null); // carry WHICH game (null = mystery roll)
    }
  });

  // Leaving the room (cabinet unmounts) must clear any lingering prompt.
  useEffect(() => () => useSceneStore.getState().setNearArcade(false), []);

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
    <group
      position={position}
      rotation-y={rotationY}
      onClick={(e) => {
        e.stopPropagation();
        // A dedicated cabinet launches ITS game; a mystery one rolls (same as E).
        if (game) launchArcadeGame(game);
        else launchRandomArcade();
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
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
