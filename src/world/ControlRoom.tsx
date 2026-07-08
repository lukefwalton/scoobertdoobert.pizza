import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture, makeTextTexture } from './ps1';
import { useDispose } from '../lib/useDispose';
import { fogFor, type Room } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { restoreAtBench, benchRunning } from '../lib/restoration';
import { emitBurst } from './burstBus';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';

// The Control Room — the console room of the Basement Sessions: a slanted mixing
// desk lined with fader nubs + glowing meter dots, two reel-to-reel machines whose
// reels turn, a dark observation window into the live room, and a framed gold
// record on the wall (every fader his own hand — produced/mixed/mastered solo).
// Cool, dim, meter-lit. The desk isn't an instrument (the live room is) — but the
// FIRST reel-to-reel is now the RESTORATION BENCH: play a found song, press E (or
// click the deck), and the rite sweeps it lo-fi → hi-fi for good (lib/restoration).

// A reel-to-reel deck with two slowly turning reels.
function TapeDeck({
  x,
  z,
  rotationY,
  body,
  reelMat,
}: {
  x: number;
  z: number;
  rotationY: number;
  body: THREE.Material;
  reelMat: THREE.Material;
}) {
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (a.current) a.current.rotation.z += dt * 1.1;
    if (b.current) b.current.rotation.z += dt * 1.1;
  });
  return (
    <group position={[x, 0, z]} rotation-y={rotationY}>
      <mesh material={body} position={[0, 0.95, 0]} rotation-x={-0.5}>
        <boxGeometry args={[1.5, 0.9, 0.18]} />
      </mesh>
      <mesh ref={a} material={reelMat} position={[-0.34, 1.1, 0.12]} rotation-x={-0.5}>
        <cylinderGeometry args={[0.26, 0.26, 0.05, 16]} />
      </mesh>
      <mesh ref={b} material={reelMat} position={[0.34, 1.1, 0.12]} rotation-x={-0.5}>
        <cylinderGeometry args={[0.26, 0.26, 0.05, 16]} />
      </mesh>
    </group>
  );
}

/** How close (XZ) the camera must be for the bench prompt — matches the
 *  Interactables REACH so the world's walk-up grammar feels uniform. */
const BENCH_REACH = 3;

// THE RESTORATION BENCH — a TapeDeck promoted to a verb. Its per-frame scan
// publishes nearRestoreBench (the "Press E" prompt + worldActions' E branch);
// clicking the deck fires the same restoreAtBench. While the rite runs the reels
// spin hard and the lamp breathes at 1.5 Hz (a soft dim glow — nowhere near the
// WCAG 3-flashes/sec line, no luminance jump); the collect-burst pops when a
// restoration actually banks, whichever verb (E / click / smoke hook) did it.
function RestorationDeck({
  x,
  z,
  rotationY,
  body,
  reelMat,
}: {
  x: number;
  z: number;
  rotationY: number;
  body: THREE.Material;
  reelMat: THREE.Material;
}) {
  const { camera, gl } = useThree();
  const a = useRef<THREE.Mesh>(null);
  const b = useRef<THREE.Mesh>(null);
  const setNear = useSceneStore((s) => s.setNearRestoreBench);
  const lastNear = useRef(false);

  // The lamp: a small additive dot that idles dim and breathes while restoring.
  const lampMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#7ec9ff',
        transparent: true,
        opacity: 0.25,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );
  // A tiny "RESTORE" placard over the deck so the bench reads as the one deck
  // that DOES something (its twin stays set dressing).
  const signTex = useMemo(
    () => makeTextTexture('RESTORE\n修復', { fg: '#9fd0ff', w: 128, h: 64 }),
    [],
  );
  const signMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: signTex, transparent: true }),
    [signTex],
  );
  useDispose(lampMat, signTex, signMat);

  // The completion burst: watch the durable rite count grow while mounted, so
  // E, the click, and the smoke hook all get the same juice.
  const restoredLen = useProgressStore((s) => s.restoredSongs.length);
  const prevLen = useRef(restoredLen);
  useEffect(() => {
    if (restoredLen > prevLen.current) emitBurst([x, 1.5, z + 0.4], '#8fd8ff');
    prevLen.current = restoredLen;
  }, [restoredLen, x, z]);

  // ?debug-only ACTION hook so the smoke can drive the REAL verb without
  // pixel-walking to the deck (the isDebugEntrance gate, like __sdpRollDice).
  useEffect(() => {
    if (!isDebugEntrance()) return;
    exposeTestGlobal('__sdpRestore', () => {
      void restoreAtBench();
    });
    return () => exposeTestGlobal('__sdpRestore', undefined);
  }, []);

  // Leaving the room must drop the prompt (the sweeps clear it on travel, but a
  // straight unmount — exiting the world — goes through here).
  useEffect(() => {
    return () => useSceneStore.getState().setNearRestoreBench(false);
  }, []);

  useFrame((state, dt) => {
    const running = benchRunning();
    const spin = dt * (running ? 14 : 1.1);
    if (a.current) a.current.rotation.z += spin;
    if (b.current) b.current.rotation.z += spin;
    lampMat.opacity = running
      ? 0.45 + 0.25 * Math.sin(state.clock.elapsedTime * Math.PI * 3)
      : 0.25;
    // Publish proximity (edge-triggered), frozen while a modal/wipe owns input —
    // the Interactables freeze set, so the prompt never surfaces under a dialog.
    const st = useSceneStore.getState();
    if (
      st.paused ||
      st.openHotspot ||
      st.openLookable ||
      st.openNpc ||
      st.pendingRoom ||
      st.transitioning
    )
      return;
    const near = Math.hypot(camera.position.x - x, camera.position.z - z) < BENCH_REACH;
    if (near !== lastNear.current) {
      lastNear.current = near;
      setNear(near);
    }
  });

  return (
    <group
      position={[x, 0, z]}
      rotation-y={rotationY}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        void restoreAtBench();
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      {/* a generous invisible hit target over the whole machine */}
      <mesh position={[0, 1.0, 0.1]}>
        <boxGeometry args={[1.7, 1.4, 0.7]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <mesh material={body} position={[0, 0.95, 0]} rotation-x={-0.5}>
        <boxGeometry args={[1.5, 0.9, 0.18]} />
      </mesh>
      <mesh ref={a} material={reelMat} position={[-0.34, 1.1, 0.12]} rotation-x={-0.5}>
        <cylinderGeometry args={[0.26, 0.26, 0.05, 16]} />
      </mesh>
      <mesh ref={b} material={reelMat} position={[0.34, 1.1, 0.12]} rotation-x={-0.5}>
        <cylinderGeometry args={[0.26, 0.26, 0.05, 16]} />
      </mesh>
      <mesh material={lampMat} position={[0, 1.44, 0.28]} rotation-x={-0.5}>
        <circleGeometry args={[0.045, 8]} />
      </mesh>
      <mesh material={signMat} position={[0, 1.78, 0.1]}>
        <planeGeometry args={[0.7, 0.35]} />
      </mesh>
    </group>
  );
}

export function ControlRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#0d1118', '#121826');
    t.repeat.set(4, 4);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 5, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#0e131c', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#080b12'), []);
  // The desk is the hero prop — keep it cool/dark but light enough to READ as a
  // console, not a void (a self-lit emissive floor so the slanted face isn't black).
  const deskMat = useMemo(() => {
    const m = flatMat('#2b3242');
    m.emissive.setRGB(0.06, 0.07, 0.1);
    return m;
  }, []);
  const faderMat = useMemo(() => flatMat('#c9c2b0'), []);
  const reelMat = useMemo(() => flatMat('#2a2622'), []);
  const glassMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#1d2b3a', transparent: true, opacity: 0.55 }),
    [],
  );
  const frameMat = useMemo(() => flatMat('#caa24a'), []); // gold record frame
  // glowing meter dots (additive so they pop against the dark desk)
  const meterMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#46e0a0',
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  useDispose(floorTex);

  // a row of fader nubs + a row of meter dots across the desk
  const faders = useMemo(() => Array.from({ length: 10 }, (_, i) => -1.8 + i * 0.4), []);

  return (
    <group>
      <ambientLight intensity={0.46} color="#bcd0ff" />
      <pointLight position={[-3.5, 2.2, 0]} intensity={0.85} distance={14} color="#9fd0ff" />
      <pointLight position={[3, 2.4, 2]} intensity={0.3} distance={10} color="#ffcaa0" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* the mixing desk along the -X wall (the player faces it on arrival) */}
      <group position={[-4.2, 0, 0]} rotation-y={Math.PI / 2}>
        {/* the slab + a slanted top */}
        <mesh material={deskMat} position={[0, 0.5, 0]}>
          <boxGeometry args={[4.6, 1.0, 1.1]} />
        </mesh>
        <mesh material={deskMat} position={[0, 1.06, 0.12]} rotation-x={-0.45}>
          <boxGeometry args={[4.6, 0.1, 0.9]} />
        </mesh>
        {/* fader nubs + meter dots on the slanted top */}
        {faders.map((fx, i) => (
          <group key={i}>
            <mesh material={faderMat} position={[fx, 1.16, 0.2]} rotation-x={-0.45}>
              <boxGeometry args={[0.05, 0.06, 0.22]} />
            </mesh>
            <mesh material={meterMat} position={[fx, 1.22, -0.05]} rotation-x={-0.45}>
              <circleGeometry args={[0.035, 8]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* the observation window into the live room, high on the -X wall */}
      <mesh material={glassMat} position={[-5.9, 2.4, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[3.4, 1.3]} />
      </mesh>

      {/* two reel-to-reel decks on a stand against the +Z wall — the first is the
          RESTORATION BENCH (walk up + E, or click), its twin stays set dressing */}
      <RestorationDeck x={-1.6} z={4.6} rotationY={Math.PI} body={deskMat} reelMat={reelMat} />
      <TapeDeck x={0.4} z={4.6} rotationY={Math.PI} body={deskMat} reelMat={reelMat} />

      {/* a framed gold record on the +Z wall (his "Don't Worry" hit #1 on egoFM) */}
      <group position={[3.2, 2.2, 4.85]}>
        <mesh material={frameMat}>
          <boxGeometry args={[1.0, 1.0, 0.06]} />
        </mesh>
        <mesh material={faderMat} position={[0, 0, 0.04]}>
          <circleGeometry args={[0.38, 20]} />
        </mesh>
      </group>
    </group>
  );
}
