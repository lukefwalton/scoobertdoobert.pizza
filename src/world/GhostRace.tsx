import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat } from './ps1';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useSceneStore } from '../state/sceneStore';
import { exposeTestGlobal } from '../lib/testHooks';
import { useRaceStore, RACE_GATES, nextGateOf, type RacePhase } from '../state/raceStore';

// ───────────────────────────────────────────────────────────────────────────
// GhostRace — the Grassrooms' 3D lap race (ゴーストレース). You race a floating
// GHOST CHARACTER around a loop of checkpoint gates threaded through the big
// white-pillar field, on foot in first person (hold SHIFT to sprint — the only
// way to outrun it). Click the ghost to drop the flag: 3·2·1·GO, then first to
// RACE_LAPS laps wins. Mounted inside GrassroomsRoom, so it lives + dies with the
// room (and resets the race on the way out).
//
// The ghost is an honest racing "ghost": it floats the racing line at a steady
// clip (through the pillars — it's a ghost), a beatable-but-real rival. Sweet +
// non-traumatic (taste guardrail): losing just earns a giggle and a rematch.
//
// State lives in raceStore (shared with the DOM RaceHud); this owns the geometry,
// the ghost's motion, the countdown timer, and the per-frame gate detection.
// ───────────────────────────────────────────────────────────────────────────

// The course: a loop of RACE_GATES gates on a circle of this radius (world units),
// safely inside the room clamp. Index 0 is the start/finish line.
const COURSE_R = 18;
export const GATES: [number, number][] = Array.from({ length: RACE_GATES }, (_, i) => {
  const t = (i / RACE_GATES) * Math.PI * 2;
  return [Math.sin(t) * COURSE_R, Math.cos(t) * COURSE_R];
});

const GATE_R = 4.8; // how close you must pass a gate for it to count (generous)
const GHOST_SPEED = 8.6; // units/s — beatable by a sprinting player (~10.2/s)
const GHOST_REACH = 1.6; // how close the ghost gets to a gate before targeting the next

// A bilingual floating banner over the idle ghost — words stay EN + JP.
function makeBannerTexture(): THREE.Texture {
  const w = 256;
  const h = 80;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#1b2b40';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffd23a';
    ctx.fillRect(0, 0, w, 3);
    ctx.fillRect(0, h - 3, w, 3);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe98a';
    ctx.font = 'bold 30px "Hiragino Kaku Gothic Pro", "Yu Gothic", sans-serif';
    ctx.fillText('ゴーストレース', w / 2, 36);
    ctx.fillStyle = '#bfe0ff';
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillText('CLICK TO RACE THE GHOST', w / 2, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// One checkpoint gate: two posts + a top beam, laid ACROSS the track (rotated to
// the loop's tangent). It glows gold when it's your next target.
function Gate({
  pos,
  highlighted,
  postMat,
  beamMat,
  beaconRef,
}: {
  pos: [number, number];
  highlighted: boolean;
  postMat: THREE.Material;
  beamMat: THREE.Material;
  beaconRef?: (m: THREE.Mesh | null) => void;
}) {
  const yaw = Math.atan2(pos[0], pos[1]); // group +X → loop tangent (across the track)
  const beaconMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: highlighted ? '#ffd23a' : '#9fb6c7' }),
    [highlighted],
  );
  useEffect(() => () => beaconMat.dispose(), [beaconMat]);
  return (
    <group position={[pos[0], 0, pos[1]]} rotation-y={yaw}>
      <mesh material={postMat} position={[-2.0, 1.6, 0]}>
        <boxGeometry args={[0.3, 3.2, 0.3]} />
      </mesh>
      <mesh material={postMat} position={[2.0, 1.6, 0]}>
        <boxGeometry args={[0.3, 3.2, 0.3]} />
      </mesh>
      <mesh material={beamMat} position={[0, 3.3, 0]}>
        <boxGeometry args={[4.6, 0.34, 0.4]} />
      </mesh>
      {/* the gold "next gate" beacon on top (pulses via the ref each frame) */}
      <mesh ref={beaconRef} material={beaconMat} position={[0, 3.9, 0]}>
        <icosahedronGeometry args={[0.34, 0]} />
      </mesh>
    </group>
  );
}

export function GhostRace() {
  const { camera } = useThree();
  const phase = useRaceStore((s) => s.phase);
  const playerProgress = useRaceStore((s) => s.playerProgress);

  const bannerTex = useMemo(makeBannerTexture, []);
  const bannerMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({ map: bannerTex, transparent: true, side: THREE.DoubleSide }),
    [bannerTex],
  );
  const postMat = useMemo(() => flatMat('#eef1ec'), []);
  const beamMat = useMemo(() => flatMat('#d23b4f'), []); // a racing-stripe red beam
  const ghostMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#f4f0ff', transparent: true, opacity: 0.9 }),
    [],
  );
  const eyeMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#3a2f55' }), []);

  useEffect(
    () => () => {
      bannerTex.dispose();
      [bannerMat, postMat, beamMat, ghostMat, eyeMat].forEach((m) => m.dispose());
    },
    [bannerTex, bannerMat, postMat, beamMat, ghostMat, eyeMat],
  );

  // The ghost's live position (floats the racing line); the group follows it.
  const ghostGroup = useRef<THREE.Group>(null);
  const bannerGroup = useRef<THREE.Group>(null);
  const ghostPos = useRef(new THREE.Vector3(GATES[0][0], 1.3, GATES[0][1]));
  const beacons = useRef<(THREE.Mesh | null)[]>([]);
  const cdTimer = useRef(0); // countdown seconds accumulator
  const finishedAccum = useRef(0); // seconds since the race finished (→ auto-rematch)
  const lastPhase = useRef<RacePhase>('idle');

  // Reset the race when the room unmounts (you left the Grassrooms).
  useEffect(() => {
    return () => {
      useRaceStore.getState().reset();
    };
  }, []);

  // Test hooks (?world / ?debug): start + force-finish so the smoke can drive a
  // real WIN (and its reward) without running the whole lap in 3D.
  useEffect(() => {
    exposeTestGlobal('__sdpRaceStart', () => useRaceStore.getState().start());
    exposeTestGlobal('__sdpRaceForce', (winner: 'you' | 'ghost') => {
      const r = useRaceStore.getState();
      if (r.phase === 'idle') r.start();
      r.go();
      r.finish(winner);
    });
    exposeTestGlobal('__sdpRaceState', () => {
      const r = useRaceStore.getState();
      return { phase: r.phase, playerProgress: r.playerProgress, ghostProgress: r.ghostProgress };
    });
    return () => {
      exposeTestGlobal('__sdpRaceStart', undefined);
      exposeTestGlobal('__sdpRaceForce', undefined);
      exposeTestGlobal('__sdpRaceState', undefined);
    };
  }, []);

  const startRace = () => {
    if (useRaceStore.getState().phase === 'idle') {
      useRaceStore.getState().start();
      audio.unlock();
      audio.playChime(noteToFreq('E', 5), 0, 0.14);
    }
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const r = useRaceStore.getState();
    const sc = useSceneStore.getState();
    const frozen = sc.paused || sc.transitioning;
    const t = state.clock.elapsedTime;

    // ── phase transitions (drive the countdown, schedule the rematch reset) ──
    if (r.phase !== lastPhase.current) {
      if (r.phase === 'countdown') {
        cdTimer.current = 0;
        ghostPos.current.set(GATES[0][0], 1.3, GATES[0][1]);
      }
      if (r.phase === 'won' || r.phase === 'lost') finishedAccum.current = 0;
      lastPhase.current = r.phase;
    }

    if (!frozen) {
      if (r.phase === 'countdown') {
        cdTimer.current += dt;
        const remaining = 3 - Math.floor(cdTimer.current);
        if (remaining !== r.countdown) r.setCountdown(remaining);
        if (cdTimer.current >= 3) {
          r.go();
          audio.playChime(noteToFreq('C', 6), 0, 0.18); // GO!
        }
      } else if (r.phase === 'racing') {
        // your gate: cross the next checkpoint in order → it counts + chimes.
        const pg = GATES[nextGateOf(r.playerProgress)];
        if (Math.hypot(camera.position.x - pg[0], camera.position.z - pg[1]) < GATE_R) {
          r.passPlayerGate();
          audio.playChime(noteToFreq('A', 5), 0.2, 0.1);
        }
        // the ghost floats toward its next gate; advance when it arrives.
        const tg = GATES[nextGateOf(r.ghostProgress)];
        const gx = tg[0] - ghostPos.current.x;
        const gz = tg[1] - ghostPos.current.z;
        const gd = Math.hypot(gx, gz);
        if (gd < GHOST_REACH) {
          r.passGhostGate();
        } else {
          ghostPos.current.x += (gx / gd) * GHOST_SPEED * dt;
          ghostPos.current.z += (gz / gd) * GHOST_SPEED * dt;
        }
      } else {
        // idle / won / lost: drift the ghost gently back to the start line.
        ghostPos.current.x += (GATES[0][0] - ghostPos.current.x) * Math.min(1, dt * 1.5);
        ghostPos.current.z += (GATES[0][1] - ghostPos.current.z) * Math.min(1, dt * 1.5);
        // auto-rematch a few beats after a finish — driven here (not a setTimeout)
        // so it RESPECTS pause: a paused finish card won't tick toward reset.
        if (r.phase === 'won' || r.phase === 'lost') {
          finishedAccum.current += dt;
          if (finishedAccum.current >= 4.5) useRaceStore.getState().reset();
        }
      }
    }

    // place + bob the ghost; face its travel (toward its next gate while racing)
    const gg = ghostGroup.current;
    if (gg) {
      gg.position.set(ghostPos.current.x, 1.3 + Math.sin(t * 2) * 0.18, ghostPos.current.z);
      const aim =
        r.phase === 'racing' ? GATES[nextGateOf(r.ghostProgress)] : [GATES[0][0], GATES[0][1]];
      gg.rotation.y = Math.atan2(aim[0] - ghostPos.current.x, aim[1] - ghostPos.current.z);
    }

    // the idle "click to race" banner floats above the ghost + faces the camera.
    const bg = bannerGroup.current;
    if (bg) {
      bg.position.set(ghostPos.current.x, 3.0 + Math.sin(t * 2) * 0.18, ghostPos.current.z);
      bg.lookAt(camera.position.x, bg.position.y, camera.position.z);
    }

    // pulse the player's next-gate beacon (gold), dim the rest (a calm pulse).
    const nextGate = nextGateOf(r.playerProgress);
    const racing = r.phase === 'racing';
    for (let i = 0; i < beacons.current.length; i++) {
      const m = beacons.current[i];
      if (!m) continue;
      const isNext = racing && i === nextGate;
      m.scale.setScalar(isNext ? 1 + Math.sin(t * 6) * 0.3 : 1);
    }
  });

  const idle = phase === 'idle';

  return (
    <group>
      {/* the checkpoint gates around the loop */}
      {GATES.map((pos, i) => (
        <Gate
          key={i}
          pos={pos}
          highlighted={phase === 'racing' && i === nextGateOf(playerProgress)}
          postMat={postMat}
          beamMat={beamMat}
          beaconRef={(m) => {
            beacons.current[i] = m;
          }}
        />
      ))}

      {/* the ghost racer — a floating character; click it (while idle) to race */}
      <group
        ref={ghostGroup}
        onClick={(e) => {
          e.stopPropagation();
          startRace();
        }}
      >
        <mesh material={ghostMat}>
          <sphereGeometry args={[0.7, 12, 10]} />
        </mesh>
        <mesh material={ghostMat} position={[0, -0.55, 0]}>
          <coneGeometry args={[0.7, 0.9, 12]} />
        </mesh>
        <mesh material={eyeMat} position={[-0.22, 0.12, 0.6]}>
          <sphereGeometry args={[0.1, 8, 8]} />
        </mesh>
        <mesh material={eyeMat} position={[0.22, 0.12, 0.6]}>
          <sphereGeometry args={[0.1, 8, 8]} />
        </mesh>
      </group>

      {/* the bilingual "click to race" banner — billboarded above the idle ghost
          (it IS the prompt); also clickable to start. */}
      {idle && (
        <group
          ref={bannerGroup}
          onClick={(e) => {
            e.stopPropagation();
            startRace();
          }}
        >
          <mesh material={bannerMat}>
            <planeGeometry args={[3.4, 1.06]} />
          </mesh>
        </group>
      )}
    </group>
  );
}
