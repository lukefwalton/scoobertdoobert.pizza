import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeCheckerTexture, makeAffineTexturedMaterial, seededRandom } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { ArcadeCabinet } from './ArcadeCabinet';
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
  // The SAME street, two times of day: you arrive at night off North Park, but
  // the diner's kitchen back door drops you out here at a hazy, overexposed,
  // just-as-empty NOON (the liminal shift — see the 'mainstreetday' room). One
  // component, switched by id; the sky/fog auto-shift comes from the palette.
  const day = room.id === 'mainstreetday';

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
  const walkMat = useMemo(() => flatMat('#2f313a'), []); // sidewalk concrete
  // Storefront albedos lifted off near-black (#161821 was ~8% reflectance, so no
  // amount of light — the streetlamp, the diner glow, or the Light cantrip — could
  // lift them). Still a dark, empty-hometown night, but now lightable.
  const bldgMat = useMemo(() => flatMat('#242938'), []);
  const bldgMat2 = useMemo(() => flatMat('#2a2f3f'), []);
  const trimMat = useMemo(() => flatMat('#31343f'), []);
  const darkWin = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0c0d12' }), []);
  const litWin = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3b3320' }), []); // one warm window
  const poleMat = useMemo(() => flatMat('#101014'), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c98b2e' }), []); // diner-door glow
  const amberMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#e0a020' }), []);
  const lampMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f0d69a' }), []);
  // The sky cap overhead: a dark starless lid at night, a pale hazy sky by day.
  const capMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: day ? '#cdd7db' : '#0e1018' }),
    [day],
  );
  useDispose(roadTex, roadMat, walkMat, bldgMat, bldgMat2, trimMat);
  useDispose(darkWin, litWin, poleMat, glowMat, amberMat, lampMat, capMat);

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
  // The bed is time-of-day aware: NIGHT is a low hum + a lone cricket + the
  // caution light's tick; DAY swaps to a hazy, quiet noon — a lazy cicada drone
  // + the odd bird, no cricket, no night hum (a true day flip, not half-night).
  const amber = useRef(0);
  const bedA = useRef(2.0); // night hum / day cicada bed
  const bedB = useRef(3.5); // cricket / bird
  useEffect(() => {
    audio.unlock();
    audio.playColony(noteToFreq(day ? 'A' : 'E', day ? 2 : 1), 0, 0.05); // set the tone at once
  }, [day]);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    // the caution light still blinks by day (realistic) but the streetlamp only
    // reads at night — leave the lamp bulb steady/off in daylight.
    const blink = (Math.sin(t * 4.4) + 1) / 2; // ~0.7Hz, smooth (WCAG-safe)
    amberMat.color.setRGB(0.16 + blink * 0.72, 0.1 + blink * 0.5, 0.04 + blink * 0.06);
    if (!day) {
      const wob = 0.82 + Math.sin(t * 2.3) * 0.06 + Math.sin(t * 7.1) * 0.03;
      lampMat.color.setRGB(0.94 * wob, 0.84 * wob, 0.6 * wob);
    }

    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    const dt = Math.min(delta, 0.05);
    amber.current -= dt;
    if (amber.current <= 0) {
      audio.playChime(noteToFreq('C', 3), 0.3, 0.03, 0.2); // the light's soft tick (both)
      amber.current = 1.4;
    }
    bedA.current -= dt;
    if (bedA.current <= 0) {
      // night: the low hum; day: a lazy cicada drone up an octave
      audio.playColony(
        noteToFreq(day ? 'A' : Math.random() < 0.5 ? 'E' : 'B', day ? 2 : 1),
        0,
        0.045,
      );
      bedA.current = day ? 5 + Math.random() * 3 : 8 + Math.random() * 5;
    }
    bedB.current -= dt;
    if (bedB.current <= 0) {
      if (day) {
        // a distant midday bird, panned
        audio.playChime(noteToFreq('E', 6), (Math.random() - 0.5) * 1.6, 0.03, 0.28);
        window.setTimeout(() => audio.playChime(noteToFreq('C', 6), 0, 0.025, 0.3), 130);
        bedB.current = 5 + Math.random() * 5;
      } else {
        audio.playChime(noteToFreq('B', 6), (Math.random() - 0.5) * 1.8, 0.03, 0.3); // a lone cricket
        bedB.current = 4 + Math.random() * 6;
      }
    }
  });

  return (
    <group>
      {/* NIGHT: a dim cool ambient + the warm pools of the lamp + diner door.
          DAY: a flat, hazy, overexposed noon — bright ambient, a high white sun,
          none of the warm night pools (the emptiness reads worse in daylight). */}
      {day ? (
        <>
          <ambientLight intensity={0.95} color="#eef2f0" />
          <directionalLight position={[4, 14, 3]} intensity={0.7} color="#fffdf4" />
          <hemisphereLight args={['#dfeaf0', '#8a8f88', 0.6]} />
        </>
      ) : (
        <>
          <ambientLight intensity={0.22} color="#4a5273" />
          <pointLight position={[3.5, 5, 3]} intensity={0.7} distance={13} color="#f0d69a" />
          <pointLight position={[-6.5, 2.4, -2]} intensity={0.8} distance={8} color="#c98b2e" />
          <hemisphereLight args={['#20263e', '#0c1020', 0.3]} />
        </>
      )}

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

      {/* the diner's warm doorway glow on the -X wall (marks the way in) — a
          NIGHT tell only; by day the doorway is just a dark opening */}
      {!day && (
        <mesh material={glowMat} position={[-W + 0.15, 1.4, -2]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[2.0, 2.8]} />
        </mesh>
      )}

      {/* DELIVERY DASH — a lone cabinet glowing on the empty +X sidewalk (a courier
          game on the very street it's set on); clear of the poles, lamp + caution mast */}
      <ArcadeCabinet
        position={[4.6, 0, -4]}
        rotationY={-Math.PI / 2}
        tint="#c9432e"
        game="delivery-dash"
      />

      {/* the sky cap so you don't see out the top into void — dark at night, a
          flat overexposed haze by day */}
      <mesh material={capMat} position={[0, H, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 8, D * 2 + 8]} />
      </mesh>
    </group>
  );
}
