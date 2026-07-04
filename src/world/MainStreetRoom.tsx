import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeCheckerTexture, makeAffineTexturedMaterial, seededRandom } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// MainStreetRoom — MAIN STREET, a liminal small-town-America street at dead of
// night off North Park. Dark storefronts down both sides, a lone caution light
// blinking amber over an empty intersection, a flickering streetlamp, power
// poles — the uncanny of your emptied hometown, perfectly lit and waiting. One
// warm doorway (the all-night diner) is the only lit thing on the block.
//
// REGISTER: the biggest SURFACE tickle (unease 0.12) but still WARM-uncanny,
// never a scare (taste guardrail). A musicRoom: a low night hum + a lone cricket
// + the caution light's tick. WCAG-safe: the caution blink is slow (~0.7s) and
// small; the lamp is a gentle brightness wobble, never a strobe; and the whole
// 3D world is off under reduced-motion anyway.
// ───────────────────────────────────────────────────────────────────────────

export function MainStreetRoom({ room }: { room: Room }) {
  const fog = fogFor(room);
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;

  // Wet asphalt down the middle (affine, so the road swims a little).
  const roadTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#14161c', '#181b22');
    t.repeat.set(1, 10);
    return t;
  }, []);
  const roadMat = useMemo(
    () => makeAffineTexturedMaterial(roadTex, 3, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [roadTex, fog.color, fog.near, fog.far],
  );
  const walkMat = useMemo(() => flatMat('#2a2c33'), []); // sidewalk concrete
  const bldgMat = useMemo(() => flatMat('#161821'), []);
  const bldgMat2 = useMemo(() => flatMat('#1b1d27'), []);
  const trimMat = useMemo(() => flatMat('#22242e'), []);
  const darkWin = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0c0d12' }), []);
  const litWin = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3b3320' }), []); // one warm window
  const poleMat = useMemo(() => flatMat('#101014'), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c98b2e' }), []); // diner-door glow
  const amberMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e0a020' }), []);
  const lampMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f0d69a' }), []);
  useDispose(roadTex, roadMat, walkMat, bldgMat, bldgMat2, trimMat);
  useDispose(darkWin, litWin, poleMat, glowMat, amberMat, lampMat);

  // Storefronts down both sidewalks — a seeded run of dark blocks with window
  // grids, one lit window here and there (someone's still up, or the light's
  // just on). Kept off the road + off the -X diner doorway.
  const shops = useMemo(() => {
    const rnd = seededRandom(1997);
    const out: { x: number; z: number; w: number; h: number; d: number; lit: number }[] = [];
    for (const side of [-1, 1]) {
      let z = -D + 1.5;
      while (z < D - 1.5) {
        const depth = 2 + rnd() * 1.4;
        const h = 3.2 + rnd() * 2.6;
        const w = 2.4 + rnd() * 1.6;
        out.push({
          x: side * (W - depth / 2 - 0.2),
          z: z + w / 2,
          w,
          h,
          d: depth,
          lit: rnd() < 0.16 ? Math.floor(rnd() * 6) : -1, // which window is warm (or none)
        });
        z += w + 0.15;
      }
    }
    return out;
  }, [W, D]);

  // ── ambient + the slow blinks ───────────────────────────────────────────
  const amber = useRef(0);
  const night = useRef(2.0);
  const cricket = useRef(3.5);
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq('E', 1), 0, 0.05); // the low night hum, straight away
  }, []);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // caution light: a slow amber blink (~0.7s on/off), a gentle fade not a strobe
    const blink = (Math.sin(t * 4.4) + 1) / 2; // ~0.7Hz, smooth
    amberMat.color.setRGB(0.16 + blink * 0.72, 0.1 + blink * 0.5, 0.04 + blink * 0.06);
    // streetlamp: a faint uneasy brightness wobble (never off)
    const wob = 0.82 + Math.sin(t * 2.3) * 0.06 + Math.sin(t * 7.1) * 0.03;
    lampMat.color.setRGB(0.94 * wob, 0.84 * wob, 0.6 * wob);

    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    const dt = Math.min(delta, 0.05);
    amber.current -= dt;
    if (amber.current <= 0) {
      audio.playChime(noteToFreq('C', 3), 0.3, 0.03, 0.2); // the light's soft tick
      amber.current = 1.4;
    }
    night.current -= dt;
    if (night.current <= 0) {
      audio.playColony(noteToFreq(Math.random() < 0.5 ? 'E' : 'B', 1), 0, 0.045);
      night.current = 8 + Math.random() * 5;
    }
    cricket.current -= dt;
    if (cricket.current <= 0) {
      audio.playChime(noteToFreq('B', 6), (Math.random() - 0.5) * 1.8, 0.03, 0.3); // a lone cricket
      cricket.current = 4 + Math.random() * 6;
    }
  });

  return (
    <group>
      {/* deep night: a dim cool ambient + the warm pools of the lamp + diner door */}
      <ambientLight intensity={0.22} color="#4a5273" />
      <pointLight position={[3.5, 5, 3]} intensity={0.7} distance={13} color="#f0d69a" />
      <pointLight position={[-6.5, 2.4, -2]} intensity={0.8} distance={8} color="#c98b2e" />
      <hemisphereLight args={['#20263e', '#0c1020', 0.3]} />

      {/* the road + two sidewalks */}
      <mesh material={roadMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[5, D * 2 + 6]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} material={walkMat} rotation-x={-Math.PI / 2} position={[s * 4.4, 0.02, 0]}>
          <planeGeometry args={[W * 2 - 5, D * 2 + 6]} />
        </mesh>
      ))}

      {/* storefronts down both sides */}
      {shops.map((b, i) => (
        <group key={i} position={[b.x, 0, b.z]}>
          <mesh material={i % 2 ? bldgMat : bldgMat2} position={[0, b.h / 2, 0]}>
            <boxGeometry args={[b.d, b.h, b.w]} />
          </mesh>
          {/* window grid on the street-facing side (toward the road, ±X inward) */}
          {Array.from({ length: 6 }, (_, w) => {
            const col = w % 2;
            const row = Math.floor(w / 2);
            const inward = b.x > 0 ? -1 : 1;
            return (
              <mesh
                key={w}
                material={b.lit === w ? litWin : darkWin}
                position={[
                  (inward * b.d) / 2 - inward * 0.01,
                  0.9 + row * 0.95,
                  (col - 0.5) * (b.w * 0.5),
                ]}
                rotation={[0, Math.PI / 2, 0]}
              >
                <planeGeometry args={[b.w * 0.32, 0.62]} />
              </mesh>
            );
          })}
          {/* a flat parapet trim */}
          <mesh material={trimMat} position={[0, b.h + 0.08, 0]}>
            <boxGeometry args={[b.d + 0.1, 0.16, b.w + 0.1]} />
          </mesh>
        </group>
      ))}

      {/* the caution light on a mast over the intersection (mid-street) */}
      <group position={[0, 0, -1]}>
        <mesh material={poleMat} position={[3.2, 2.4, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 4.8, 6]} />
        </mesh>
        <mesh material={poleMat} position={[1.6, 4.6, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.06, 0.06, 3.4, 6]} />
        </mesh>
        <mesh material={poleMat} position={[0, 4.2, 0]}>
          <boxGeometry args={[0.34, 0.8, 0.34]} />
        </mesh>
        <mesh material={amberMat} position={[0, 4.2, 0.18]}>
          <circleGeometry args={[0.13, 12]} />
        </mesh>
        <pointLight position={[0, 4.2, 0.5]} intensity={0.4} distance={5} color="#e0a020" />
      </group>

      {/* a streetlamp casting the warm pool up the block */}
      <group position={[3.6, 0, 3]}>
        <mesh material={poleMat} position={[0, 2.6, 0]}>
          <cylinderGeometry args={[0.09, 0.12, 5.2, 6]} />
        </mesh>
        <mesh material={poleMat} position={[-0.7, 5.1, 0]} rotation={[0, 0, Math.PI / 2.6]}>
          <cylinderGeometry args={[0.05, 0.05, 1.4, 6]} />
        </mesh>
        <mesh material={lampMat} position={[-1.2, 5.35, 0]}>
          <sphereGeometry args={[0.26, 8, 6]} />
        </mesh>
      </group>

      {/* power poles marching down the far sidewalk (the liminal cabling) */}
      {[-6, 0, 6].map((z, i) => (
        <group key={i} position={[-4, 0, z]}>
          <mesh material={poleMat} position={[0, 3, 0]}>
            <cylinderGeometry args={[0.11, 0.13, 6, 6]} />
          </mesh>
          <mesh material={poleMat} position={[0, 5.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <boxGeometry args={[0.1, 0.1, 1.6]} />
          </mesh>
        </group>
      ))}

      {/* the diner's warm doorway glow on the -X wall (marks the way in) */}
      <mesh material={glowMat} position={[-W + 0.15, 1.4, -2]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[2.0, 2.8]} />
      </mesh>

      {/* a low starless sky cap so you don't see out the top into void */}
      <mesh material={bldgMat} position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 8, D * 2 + 8]} />
      </mesh>
    </group>
  );
}
