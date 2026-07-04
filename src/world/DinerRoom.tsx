import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeCheckerTexture, makeAffineTexturedMaterial } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { FirstEntryReward } from './FirstEntryReward';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// DinerRoom — THE ALL-NIGHT DINER off Main Street: a checker floor, a counter of
// chrome stools, a row of booths, a pie case, a warm buzzing sign — and a row of
// low-poly TAXIDERMY ANIMAL HEADS mounted on the back wall that slowly TURN to
// track you as you move (the whole uncanny beat, WCAG-safe: a gentle continuous
// look, never a jump). Warm-but-wrong: cozy amber light held close by dark fog.
//
// REGISTER: warm-uncanny (unease 0.07 — funny, not grim; taste guardrail). A
// musicRoom: a fridge hum + a ceiling-fan tick + the sign's neon buzz. First
// entry tips a little luck (the diner's on the house).
// ───────────────────────────────────────────────────────────────────────────

// The mounted heads: [x, y, colourIndex, hasAntlers]. Spread along the -X wall.
const HEADS: [number, number, number, boolean][] = [
  [-2, 3.2, 0, true], // a buck
  [1, 3.4, 1, false], // a bear-ish
  [3.4, 3.1, 2, true], // a smaller deer
];

/** One mounted head that swivels a little to face the camera (the watch). */
function AnimalHead({
  x,
  y,
  furMat,
  hornMat,
  eyeMat,
  boardMat,
  antlers,
}: {
  x: number;
  y: number;
  furMat: THREE.Material;
  hornMat: THREE.Material;
  eyeMat: THREE.Material;
  boardMat: THREE.Material;
  antlers: boolean;
}) {
  const { camera } = useThree();
  const head = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!head.current) return;
    // aim a touch toward the camera, clamped so it stays "mounted on the wall"
    // (small yaw/pitch, eased) — the room watches, softly.
    const dx = camera.position.x - x;
    const dz = camera.position.z - 0; // wall is at -Z-ish; measure from head plane
    const wantYaw = THREE.MathUtils.clamp(Math.atan2(dx, Math.abs(dz) + 2), -0.5, 0.5);
    const dy = camera.position.y - y;
    const wantPitch = THREE.MathUtils.clamp(-Math.atan2(dy, Math.abs(dz) + 2), -0.35, 0.35);
    head.current.rotation.y += (wantYaw - head.current.rotation.y) * 0.05;
    head.current.rotation.x += (wantPitch - head.current.rotation.x) * 0.05;
  });
  return (
    <group position={[x, y, 0]}>
      {/* the mount plaque */}
      <mesh material={boardMat} position={[0, 0, -0.12]}>
        <boxGeometry args={[0.9, 1.0, 0.12]} />
      </mesh>
      {/* the swivelling head */}
      <group ref={head}>
        <mesh material={furMat} position={[0, 0, 0.35]}>
          <sphereGeometry args={[0.38, 10, 8]} />
        </mesh>
        {/* snout */}
        <mesh material={furMat} position={[0, -0.12, 0.72]}>
          <boxGeometry args={[0.24, 0.24, 0.34]} />
        </mesh>
        {/* ears */}
        {[-0.28, 0.28].map((ex, i) => (
          <mesh key={i} material={furMat} position={[ex, 0.28, 0.34]} rotation={[0, 0, ex * 1.5]}>
            <coneGeometry args={[0.1, 0.28, 5]} />
          </mesh>
        ))}
        {/* eyes (glassy) */}
        {[-0.16, 0.16].map((ex, i) => (
          <mesh key={i} material={eyeMat} position={[ex, 0.05, 0.62]}>
            <sphereGeometry args={[0.06, 6, 5]} />
          </mesh>
        ))}
        {/* antlers */}
        {antlers &&
          [-1, 1].map((s) => (
            <group key={s} position={[s * 0.2, 0.34, 0.3]} rotation={[0, 0, -s * 0.4]}>
              <mesh material={hornMat} position={[0, 0.3, 0]}>
                <cylinderGeometry args={[0.03, 0.05, 0.7, 4]} />
              </mesh>
              <mesh material={hornMat} position={[s * 0.16, 0.6, 0]} rotation={[0, 0, -s * 0.7]}>
                <cylinderGeometry args={[0.02, 0.03, 0.4, 4]} />
              </mesh>
              <mesh material={hornMat} position={[s * 0.28, 0.5, 0]} rotation={[0, 0, -s * 1.1]}>
                <cylinderGeometry args={[0.02, 0.03, 0.32, 4]} />
              </mesh>
            </group>
          ))}
      </group>
    </group>
  );
}

export function DinerRoom({ room }: { room: Room }) {
  const fog = fogFor(room);
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;

  // Checkerboard floor (affine — a little diner-tile swim).
  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(2, '#c9c3b4', '#20222a');
    t.repeat.set(8, 7);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 9, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#3a2c1c', side: THREE.DoubleSide }),
    [],
  );
  const ceilMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#241a0e' }), []);
  const chromeMat = useMemo(() => flatMat('#9aa0a6'), []);
  const counterMat = useMemo(() => flatMat('#b23b2e'), []); // red laminate counter
  const seatMat = useMemo(() => flatMat('#c23f36'), []); // red vinyl booths/stools
  const tableMat = useMemo(() => flatMat('#d8d2c0'), []);
  const caseMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#bfe8ff', transparent: true, opacity: 0.35 }),
    [],
  );
  const pieMat = useMemo(() => flatMat('#e0b45a'), []);
  const signMatObj = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e85a6a' }), []);
  // Animal-head materials.
  const furMats = useMemo(() => [flatMat('#7a5a38'), flatMat('#4a3a2a'), flatMat('#8a6a44')], []);
  const hornMat = useMemo(() => flatMat('#d8cbae'), []);
  const eyeMat = useMemo(() => flatMat('#0a0a0c'), []);
  const boardMat = useMemo(() => flatMat('#3a2416'), []);
  useDispose(floorTex, floorMat, wallMat, ceilMat, chromeMat, counterMat, seatMat, tableMat);
  useDispose(caseMat, pieMat, signMatObj, ...furMats, hornMat, eyeMat, boardMat);

  // ── ambient: fridge hum + fan tick + neon buzz ──────────────────────────
  const fan = useRef<THREE.Group>(null);
  const hum = useRef(1.5);
  const buzz = useRef(2.5);
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('F', 2), 0, 0.05);
  }, []);
  useFrame((state, delta) => {
    if (fan.current) fan.current.rotation.y = state.clock.elapsedTime * 2.2; // the ceiling fan
    // the sign's neon buzz — a faint colour flicker (gentle, never a strobe)
    const f = 0.86 + Math.sin(state.clock.elapsedTime * 9) * 0.05;
    signMatObj.color.setRGB(0.91 * f, 0.35 * f, 0.42 * f);
    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    const dt = Math.min(delta, 0.05);
    hum.current -= dt;
    if (hum.current <= 0) {
      audio.playColony(noteToFreq('F', 2), -0.4, 0.045); // the fridge, low-left
      hum.current = 6 + Math.random() * 3;
    }
    buzz.current -= dt;
    if (buzz.current <= 0) {
      audio.playChime(noteToFreq('A', 6), 0.5, 0.02, 0.25); // the neon tick, high-right
      buzz.current = 3 + Math.random() * 3;
    }
  });

  return (
    <group>
      {/* warm diner light, held close */}
      <ambientLight intensity={0.5} color="#ffdfa8" />
      <pointLight position={[0, H - 0.4, 0]} intensity={0.8} distance={12} color="#ffcf7a" />
      <pointLight position={[-W + 1.5, 2.4, 0]} intensity={0.4} distance={7} color="#bfe8ff" />

      {/* floor + walls + ceiling */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {(
        [
          [0, -D, W * 2, 0],
          [0, D, W * 2, 0],
          [-W, 0, D * 2, Math.PI / 2],
          [W, 0, D * 2, Math.PI / 2],
        ] as const
      ).map(([x, z, len, r], i) => (
        <mesh key={i} material={wallMat} position={[x, H / 2, z]} rotation={[0, r, 0]}>
          <planeGeometry args={[len, H]} />
        </mesh>
      ))}
      <mesh material={ceilMat} position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>

      {/* the counter along the -X back, with a chrome kick + a row of stools */}
      <group position={[-W + 1.6, 0, 0]}>
        <mesh material={counterMat} position={[0, 1.0, 0]}>
          <boxGeometry args={[1.1, 0.3, D * 2 - 2]} />
        </mesh>
        <mesh material={chromeMat} position={[0, 0.5, 0]}>
          <boxGeometry args={[1.0, 1.0, D * 2 - 2]} />
        </mesh>
        {Array.from({ length: 6 }, (_, i) => {
          const z = -D + 2 + i * ((D * 2 - 4) / 5);
          return (
            <group key={i} position={[1.3, 0, z]}>
              <mesh material={chromeMat} position={[0, 0.5, 0]}>
                <cylinderGeometry args={[0.06, 0.06, 1.0, 6]} />
              </mesh>
              <mesh material={seatMat} position={[0, 1.05, 0]}>
                <cylinderGeometry args={[0.26, 0.26, 0.14, 12]} />
              </mesh>
            </group>
          );
        })}
        {/* the glass pie case on the counter */}
        <group position={[0, 1.15, -D + 2.5]}>
          <mesh material={caseMat} position={[0, 0.35, 0]}>
            <boxGeometry args={[0.9, 0.7, 0.9]} />
          </mesh>
          {[0.12, 0.42].map((y, i) => (
            <mesh key={i} material={pieMat} position={[0, y, 0]}>
              <cylinderGeometry args={[0.32, 0.34, 0.1, 12]} />
            </mesh>
          ))}
        </group>
      </group>

      {/* booths along the +Z and -Z walls */}
      {[-1, 1].map((s) =>
        [2.5, 5.2].map((ax, i) => (
          <group key={`${s}-${i}`} position={[ax, 0, s * (D - 1.1)]}>
            <mesh material={tableMat} position={[0, 0.75, 0]}>
              <boxGeometry args={[1.2, 0.1, 0.8]} />
            </mesh>
            <mesh material={chromeMat} position={[0, 0.38, 0]}>
              <cylinderGeometry args={[0.07, 0.07, 0.75, 6]} />
            </mesh>
            {[-0.75, 0.75].map((bz, j) => (
              <mesh key={j} material={seatMat} position={[0, 0.45, bz]}>
                <boxGeometry args={[1.3, 0.5, 0.45]} />
              </mesh>
            ))}
          </group>
        )),
      )}

      {/* a slow ceiling fan */}
      <group ref={fan} position={[1.5, H - 0.35, 0]}>
        <mesh material={chromeMat}>
          <cylinderGeometry args={[0.12, 0.12, 0.16, 8]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh
            key={i}
            material={boardMat}
            position={[0, 0, 0]}
            rotation={[0, (i * Math.PI) / 2, 0]}
          >
            <boxGeometry args={[1.7, 0.03, 0.22]} />
          </mesh>
        ))}
      </group>

      {/* the buzzing DINER sign over the door (+X wall) */}
      <mesh material={signMatObj} position={[W - 0.15, 3.4, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[2.6, 0.7]} />
      </mesh>

      {/* THE HEADS — mounted on the -X wall, above the counter, watching */}
      <group position={[-W + 0.25, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {HEADS.map(([hx, hy, ci, antlers], i) => (
          <AnimalHead
            key={i}
            x={hx}
            y={hy}
            furMat={furMats[ci]}
            hornMat={hornMat}
            eyeMat={eyeMat}
            boardMat={boardMat}
            antlers={antlers}
          />
        ))}
      </group>

      {/* first time in: the diner's on the house (durable luck, once) */}
      <FirstEntryReward secret="diner-found" message="the coffee’s on — +1 LUCK" luck={1} />
    </group>
  );
}
