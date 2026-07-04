import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeCheckerTexture } from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { announce } from '../state/toastStore';
import { useSceneStore } from '../state/sceneStore';
import { useScoreStore } from '../state/scoreStore';
import { useProgressStore } from '../state/progressStore';
import { setRiding, isRiding } from './rideState';
import { handOffHeading } from './cameraRig';
import { inputFrozen } from './inputFrozen';
import { isDebugEntrance, exposeTestGlobal } from '../lib/testHooks';

// ───────────────────────────────────────────────────────────────────────────
// TubeSlide — the botanical garden's fast-food-play-place tube slide (the deep
// green corkscrew on galvanized poles, straight out of a 90s PlayPlace — original
// parody geometry, no marks). It's a RIDE, not a prop: walk into the ground-level
// mouth and the camera is swallowed and carried along the tube — up the tower,
// over the top, and shot out the low exit — while a slide-whistle voice
// (audio.startVoice) glisses with your height and the FOV kicks with speed.
//
// Play-place physics, on purpose: the tube pulls you UP first. First-person can't
// climb ladders; a slide that drinks you from the ground and does the climbing
// itself is funnier and truer to the site (some glitches are OK — this one's
// load-bearing).
//
// The ride pays like the collectathon: each ride scores PIZZA POINTS through the
// same scoreStore.collectLoot path (per-ride id, so back-to-back rides chain the
// combo), and the FIRST ride ever banks a durable secret + a little luck. Input
// is frozen for the duration (rideState → inputFrozen); on exit the heading is
// handed back to Controls (cameraRig) so the view keeps facing where the slide
// spat you, no snap-back.
// ───────────────────────────────────────────────────────────────────────────

/** The camera's path through the tube, mouth → over the tower → exit. */
const PATH: [number, number, number][] = [
  [-4.2, 1.9, -4.2], // the mouth (ground level, facing the garden)
  [-5.6, 2.2, -5.6], // swallowed — the tube starts pulling you up
  [-6.9, 3.7, -6.3], // climbing the tower
  [-7.3, 5.1, -7.2], // the top (whistle peak)
  [-5.6, 4.7, -7.9], // over the elbow
  [-3.9, 3.1, -7.5], // the swoop
  [-2.7, 1.8, -6.3], // the drop
  [-1.7, 1.3, -4.9], // the low exit mouth
  [-0.8, 2.2, -3.5], // popped out, standing back up
];

const RIDE_SECONDS = 3.6;
const POINTS_PER_RIDE = 15;

export function TubeSlide() {
  const { camera } = useThree();

  const curve = useMemo(
    () => new THREE.CatmullRomCurve3(PATH.map((p) => new THREE.Vector3(...p))),
    [],
  );
  // The exit heading Controls resumes with: the direction of the last path leg.
  const exitYaw = useMemo(() => {
    const a = PATH[PATH.length - 2];
    const b = PATH[PATH.length - 1];
    return Math.atan2(b[0] - a[0], b[2] - a[2]);
  }, []);

  // Ringed two-tone green along the tube length so the ride READS as speed —
  // a flat solid interior would just fill the screen with one color.
  const tubeTex = useMemo(() => {
    const t = makeCheckerTexture(2, '#2c6b60', '#245a50');
    t.repeat.set(26, 1);
    return t;
  }, []);
  const tubeMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tubeTex,
        side: THREE.DoubleSide, // seen from outside AND ridden through inside
      }),
    [tubeTex],
  );
  const rimMat = useMemo(() => flatMat('#3f8577'), []);
  const poleMat = useMemo(() => flatMat('#a9b8ae'), []); // galvanized play-place steel
  const deckMat = useMemo(() => flatMat('#8ea698'), []);
  const tubeGeom = useMemo(() => new THREE.TubeGeometry(curve, 72, 1.35, 10, false), [curve]);
  useDispose(tubeTex, tubeMat, rimMat, poleMat, deckMat, tubeGeom);

  // ── the ride ──────────────────────────────────────────────────────────────
  const t = useRef(0);
  const rides = useRef(0);
  const whistle = useRef<ReturnType<typeof audio.startVoice>>(null);
  const pos = useRef(new THREE.Vector3());
  const look = useRef(new THREE.Vector3());
  const prev = useRef(new THREE.Vector3());

  const startRide = () => {
    if (isRiding()) return;
    setRiding(true);
    t.current = 0;
    prev.current.copy(camera.position);
    audio.unlock();
    whistle.current = audio.startVoice();
    exposeTestGlobal('__sdpSlide', { rides: rides.current, riding: true });
  };

  const endRide = () => {
    whistle.current?.stop();
    whistle.current = null;
    setRiding(false);
    handOffHeading(exitYaw);
    rides.current += 1;
    // The landing "boing" — a quick down-up pair through the shared bell engine
    // (mute-aware + limited like every other one-shot).
    audio.playChime(noteToFreq('G', 3), 0, 0.12, 0.5);
    window.setTimeout(() => audio.playChime(noteToFreq('D', 4), 0, 0.12, 0.7), 90);
    // Pizza points through the SAME collect path as loot, so rides chain the combo
    // and the durable best keeps recording — the slide is part of the arcade run.
    const award = useScoreStore
      .getState()
      .collectLoot(`garden-slide-${rides.current}`, POINTS_PER_RIDE, 0);
    if (award) {
      const comboTag = award.combo > 1 ? ` ×${award.combo}` : '';
      announce(`WHEEE! +${award.awarded}${comboTag}`, award.combo >= 5 ? 'crit-good' : 'luck');
    }
    // First ride EVER: a durable secret + a little luck (once, like a reward nook).
    const prog = useProgressStore.getState();
    if (!prog.secretsFound.includes('garden-slide')) {
      prog.findSecret('garden-slide');
      prog.gainLuck(2);
      announce('the slide approves — +2 LUCK', 'luck');
    }
    exposeTestGlobal('__sdpSlide', { rides: rides.current, riding: false });
  };

  // Deterministic ride hook for the smoke (ACTION → the narrower ?debug gate:
  // it scores points + can bank luck, so it must never ride on plain ?world).
  useEffect(() => {
    if (isDebugEntrance()) exposeTestGlobal('__sdpRideSlide', () => startRide());
    return () => {
      exposeTestGlobal('__sdpRideSlide', undefined);
      exposeTestGlobal('__sdpSlide', undefined);
      // Unmount mid-ride (door smoke-hook / world exit): never leave the world frozen.
      if (isRiding()) setRiding(false);
      whistle.current?.stop();
      whistle.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    const sc = useSceneStore.getState();
    if (isRiding() && t.current <= 1) {
      // Freeze the ride under the pause menu / a wipe, like the ghost race.
      if (sc.paused || sc.transitioning) return;
      const dt = Math.min(delta, 0.05);
      t.current = Math.min(1, t.current + dt / RIDE_SECONDS);
      // Ease: slow swallow, fast drop (u^1.5) — slides accelerate, then POP.
      const e = Math.pow(t.current, 1.5);
      curve.getPointAt(e, pos.current);
      camera.position.copy(pos.current);
      curve.getPointAt(Math.min(1, e + 0.04), look.current);
      camera.lookAt(look.current);
      // FOV kicks with real speed (same speed-feel grammar as sprint).
      const speed = pos.current.distanceTo(prev.current) / Math.max(dt, 1e-4);
      prev.current.copy(pos.current);
      const pcam = camera as THREE.PerspectiveCamera;
      const target = 72 + Math.min(1, speed / 11) * 15;
      pcam.fov += (target - pcam.fov) * Math.min(1, dt * 10);
      pcam.updateProjectionMatrix();
      // The slide whistle: pitch rides your height, up the tower and down again.
      whistle.current?.set(240 + Math.max(0, pos.current.y - 1.2) * 150, 0.1);
      if (t.current >= 1) endRide();
      return;
    }
    // Entry: walking into the mouth swallows you (playground logic — no prompt,
    // no key; the mouth IS the button). XZ distance so jumping in counts too.
    if (!inputFrozen()) {
      const dx = camera.position.x - PATH[0][0];
      const dz = camera.position.z - PATH[0][2];
      if (dx * dx + dz * dz < 1.35 * 1.35) startRide();
    }
  });

  // ── the structure (visual) ────────────────────────────────────────────────
  // Support poles sampled under the tube's high half + the platform tower the
  // corkscrew wraps, all in play-place galvanized steel.
  const poles = useMemo(() => {
    const out: { x: number; z: number; h: number }[] = [];
    for (const u of [0.28, 0.42, 0.58, 0.74]) {
      const p = curve.getPointAt(u);
      out.push({ x: p.x, z: p.z, h: p.y - 0.9 });
    }
    return out;
  }, [curve]);

  return (
    <group>
      {/* the tube itself — one continuous ringed corkscrew */}
      <mesh geometry={tubeGeom} material={tubeMat} />
      {/* rim rings at the two mouths (the bolted flange look) */}
      <mesh
        material={rimMat}
        position={PATH[0]}
        rotation={[0, Math.atan2(PATH[1][0] - PATH[0][0], PATH[1][2] - PATH[0][2]), 0]}
      >
        <torusGeometry args={[1.4, 0.14, 6, 14]} />
      </mesh>
      <mesh material={rimMat} position={PATH[PATH.length - 2]} rotation={[0, exitYaw, 0]}>
        <torusGeometry args={[1.4, 0.14, 6, 14]} />
      </mesh>
      {/* galvanized support poles under the raised run */}
      {poles.map((p, i) => (
        <mesh key={i} material={poleMat} position={[p.x, p.h / 2, p.z]}>
          <cylinderGeometry args={[0.09, 0.09, p.h, 6]} />
        </mesh>
      ))}
      {/* the little platform deck + rails the corkscrew wraps (pure dressing) */}
      <group position={[-6.6, 0, -7.2]}>
        <mesh material={deckMat} position={[0, 3.1, 0]}>
          <boxGeometry args={[2.6, 0.16, 2.2]} />
        </mesh>
        {[
          [-1.2, -1.0],
          [1.2, -1.0],
          [-1.2, 1.0],
          [1.2, 1.0],
        ].map(([x, z], i) => (
          <mesh key={i} material={poleMat} position={[x, 1.55, z]}>
            <cylinderGeometry args={[0.08, 0.08, 3.1, 6]} />
          </mesh>
        ))}
        {/* guard rails around the deck */}
        {(
          [
            [0, -1.0, 2.6, 0],
            [0, 1.0, 2.6, 0],
            [-1.2, 0, 2.2, Math.PI / 2],
          ] as const
        ).map(([x, z, len, rot], i) => (
          <mesh key={i} material={poleMat} position={[x, 3.75, z]} rotation={[0, rot, Math.PI / 2]}>
            <cylinderGeometry args={[0.05, 0.05, len, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
