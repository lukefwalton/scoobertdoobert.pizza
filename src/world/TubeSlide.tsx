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

// ── the shape ────────────────────────────────────────────────────────────────
// A real play-place silhouette, built programmatically so the tube can never
// self-intersect into a blob: one steep SWALLOW leg from the ground mouth up to
// the tower top, then a ¾-turn DESCENDING helix wrapped around the tower, then
// the exit tangent that shoots you out. The helix drops 3.3 units over 270°, and
// nothing else enters its cylinder — every non-adjacent pair of path points
// stays > 2× the tube radius apart.
const TOWER = { x: -6.6, z: -6.6 };
const HELIX_R = 2.3;
const TUBE_R = 1.0;

function buildPath(): THREE.Vector3[] {
  const pts: THREE.Vector3[] = [];
  const th0 = Math.atan2(-3.0 - TOWER.x, -4.0 - TOWER.z); // mouth bearing off the tower
  pts.push(new THREE.Vector3(-3.0, 1.8, -4.0)); // the ground mouth (the trigger)
  pts.push(new THREE.Vector3(-3.9, 3.4, -4.65)); // swallowed — hauled up the swallow leg
  const SEG = 6;
  for (let i = 0; i <= SEG; i++) {
    const th = th0 - (i / SEG) * 1.5 * Math.PI; // ¾ of a turn, clockwise, descending
    pts.push(
      new THREE.Vector3(
        TOWER.x + Math.sin(th) * HELIX_R,
        4.9 - (i / SEG) * 3.3, // the whistle peak → knee height
        TOWER.z + Math.cos(th) * HELIX_R,
      ),
    );
  }
  // The helix's clockwise exit tangent — the direction it spits you.
  const thEnd = th0 - 1.5 * Math.PI;
  const tx = -Math.cos(thEnd);
  const tz = Math.sin(thEnd);
  const last = pts[pts.length - 1];
  pts.push(new THREE.Vector3(last.x + tx * 1.7, 1.5, last.z + tz * 1.7)); // the low exit mouth
  pts.push(new THREE.Vector3(last.x + tx * 3.0, 2.2, last.z + tz * 3.0)); // popped out, standing
  return pts;
}
const PTS = buildPath();
const ENTRY = PTS[0];
const EXIT_MOUTH = PTS[PTS.length - 2];

const RIDE_SECONDS = 3.6;
const POINTS_PER_RIDE = 15;

export function TubeSlide() {
  const { camera } = useThree();

  const curve = useMemo(() => new THREE.CatmullRomCurve3(PTS), []);
  // The exit heading Controls resumes with: yaw AND pitch of the last path leg,
  // so the view doesn't snap to a default angle the instant the ride ends (the
  // camera keeps looking the way the slide spat you). Pitch is the leg's rise
  // over its run, clamped to the look range.
  const [exitYaw, exitPitch] = useMemo(() => {
    const a = PTS[PTS.length - 2];
    const b = PTS[PTS.length - 1];
    const yaw = Math.atan2(b.x - a.x, b.z - a.z);
    const run = Math.hypot(b.x - a.x, b.z - a.z);
    const pitch = Math.max(-0.9, Math.min(0.9, Math.atan2(b.y - a.y, run)));
    return [yaw, pitch] as const;
  }, []);

  // Ringed two-tone green along the tube length so the ride READS as speed —
  // a flat solid interior would just fill the screen with one color. The deep
  // pine green of the reference photo, not a bright teal.
  const tubeTex = useMemo(() => {
    const t = makeCheckerTexture(2, '#245448', '#1d4a3f');
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
  const rimMat = useMemo(() => flatMat('#2f6a58'), []);
  const poleMat = useMemo(() => flatMat('#a9b8ae'), []); // galvanized play-place steel
  const deckMat = useMemo(() => flatMat('#8ea698'), []);
  const tubeGeom = useMemo(() => new THREE.TubeGeometry(curve, 96, TUBE_R, 10, false), [curve]);
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
    handOffHeading(exitYaw, exitPitch);
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
      const dx = camera.position.x - ENTRY.x;
      const dz = camera.position.z - ENTRY.z;
      if (dx * dx + dz * dz < 1.35 * 1.35) startRide();
    }
  });

  // ── the structure (visual) ────────────────────────────────────────────────
  // Four galvanized legs planted at the tower corners, each rising to the deck —
  // the play-place scaffold the corkscrew wraps. Sampled poles UNDER the raised
  // tube would poke through it now that the run is a clean helix, so we plant
  // the tower legs explicitly instead.
  const entryYaw = useMemo(() => Math.atan2(PTS[1].x - PTS[0].x, PTS[1].z - PTS[0].z), []);
  const DECK_Y = 5.0; // just under the helix top
  const legs = useMemo(
    () =>
      (
        [
          [-1.5, -1.5],
          [1.5, -1.5],
          [-1.5, 1.5],
          [1.5, 1.5],
        ] as const
      ).map(([dx, dz]) => ({ x: TOWER.x + dx, z: TOWER.z + dz })),
    [],
  );

  return (
    <group>
      {/* the tube itself — one continuous ringed corkscrew */}
      <mesh geometry={tubeGeom} material={tubeMat} />
      {/* rim rings at the two mouths (the bolted flange look) */}
      <mesh material={rimMat} position={[ENTRY.x, ENTRY.y, ENTRY.z]} rotation={[0, entryYaw, 0]}>
        <torusGeometry args={[TUBE_R + 0.12, 0.14, 6, 14]} />
      </mesh>
      <mesh
        material={rimMat}
        position={[EXIT_MOUTH.x, EXIT_MOUTH.y, EXIT_MOUTH.z]}
        rotation={[0, exitYaw, 0]}
      >
        <torusGeometry args={[TUBE_R + 0.12, 0.14, 6, 14]} />
      </mesh>
      {/* the tower: four legs + the deck the corkscrew wraps (pure dressing) */}
      {legs.map((p, i) => (
        <mesh key={i} material={poleMat} position={[p.x, DECK_Y / 2, p.z]}>
          <cylinderGeometry args={[0.1, 0.1, DECK_Y, 6]} />
        </mesh>
      ))}
      <group position={[TOWER.x, 0, TOWER.z]}>
        <mesh material={deckMat} position={[0, DECK_Y, 0]}>
          <boxGeometry args={[3.6, 0.16, 3.6]} />
        </mesh>
        {/* guard rails around the deck (three sides — the slide mouth is open) */}
        {(
          [
            [0, -1.7, 3.4, 0],
            [-1.7, 0, 3.4, Math.PI / 2],
            [1.7, 0, 3.4, Math.PI / 2],
          ] as const
        ).map(([x, z, len, rot], i) => (
          <mesh
            key={i}
            material={poleMat}
            position={[x, DECK_Y + 0.6, z]}
            rotation={[0, rot, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.05, 0.05, len, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
