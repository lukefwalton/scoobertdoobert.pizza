import { useEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat } from './ps1';
import { ChimesSim } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';
import { audio } from '../audio/engine';
import { cueUrl, loopIndexForUrl } from '../data/music';
import { useMusicStore } from '../state/musicStore';
import { useProgressStore } from '../state/progressStore';
import type { Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// PracticeRoom — Phase 6, the "play it" rung of the music ladder. Backstage from
// the jukebox: a warm, SAFE relief room (kept sweet — see DESIGN dosage). Two
// beats in one:
//   1. A wall of six PADS you can actually play — a C-major pentatonic, so any
//      noodling sounds nice (mute-aware tones through the engine's limiter).
//   2. A 4-track that runs a call-and-response SEQUENCE GAME (the "door-game"):
//      it calls a growing phrase, you play it back; clear four rounds and it
//      fires the (previously unused) clearGame() unlock + plays a sealed demo.
// Procedural PS1 — original parody only.
// ───────────────────────────────────────────────────────────────────────────

// C-major pentatonic (C D E G A C') — pads ordered low→high, laid out L→R.
const PADS = [
  { freq: 261.63, dim: '#5a3a2a', lit: '#ffd9a0' },
  { freq: 293.66, dim: '#5a4a28', lit: '#ffe6a0' },
  { freq: 329.63, dim: '#3f5230', lit: '#cdf0a0' },
  { freq: 392.0, dim: '#2f4a52', lit: '#a0e6f0' },
  { freq: 440.0, dim: '#3a3a5e', lit: '#c0c0ff' },
  { freq: 523.25, dim: '#552a44', lit: '#ffb0e0' },
];
const ROUNDS_TO_WIN = 4; // play back phrases of length 1,2,3,4 — short (friction budget)

type Phase = 'idle' | 'demo' | 'listen' | 'won';

function PadInstrument({ room, deckMat }: { room: Room; deckMat: THREE.Material }) {
  const D = room.dims.halfD;
  const [lit, setLit] = useState(-1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [cleared, setCleared] = useState(() =>
    useProgressStore.getState().clearedGames.includes('practice'),
  );

  const seq = useRef<number[]>([]);
  const inputIdx = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  // The win fires on a short delay (a stinger pause) after the last correct note.
  // This guards that window: start() is blocked until win() resolves, so hitting
  // REC in those ~450ms can't clearTimers() and silently cancel the unlock.
  const pendingWin = useRef(false);

  const setPhaseBoth = (p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  };
  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const push = (t: ReturnType<typeof setTimeout>) => timers.current.push(t);

  // Flash a pad + sound it (the shared "hit" used by both demo playback and play).
  const flash = (i: number, durMs = 340) => {
    setLit(i);
    // Bell voices (the shared chimes engine), so the pads match the centre rig —
    // a short pluck (decayScale 0.4) so a fast call-and-response stays legible.
    audio.playChime(PADS[i].freq, 0, 0.22, 0.4);
    push(setTimeout(() => setLit((cur) => (cur === i ? -1 : cur)), durMs * 0.8));
  };

  // Call the current phrase, then hand control to the player.
  const playDemo = () => {
    setPhaseBoth('demo');
    clearTimers();
    const step = 520;
    seq.current.forEach((idx, k) => push(setTimeout(() => flash(idx, 360), 450 + k * step)));
    push(
      setTimeout(
        () => {
          inputIdx.current = 0;
          setPhaseBoth('listen');
        },
        450 + seq.current.length * step + 150,
      ),
    );
  };

  const start = () => {
    // Don't interrupt the machine mid-call, NOR a pending win (else clearTimers()
    // here would cancel the unlock that's about to fire).
    if (phaseRef.current === 'demo' || pendingWin.current) return;
    clearTimers();
    seq.current = [Math.floor(Math.random() * PADS.length)];
    setRound(1);
    playDemo();
  };

  const win = () => {
    pendingWin.current = false;
    setPhaseBoth('won');
    setCleared(true);
    // The unlock: the previously-unused persistence hook fires, the rat clocks it,
    // and the sealed demo plays (exploration's reward is sound).
    useProgressStore.getState().clearGame('practice');
    useProgressStore.getState().findSecret('practice');
    // You EARNED it: promote the sealed demo to the user's preferred track, so it
    // becomes your loop (and shows in the pause-menu readout) instead of a
    // transient stinger. Consistent with the "manual selection wins" rule.
    useMusicStore.getState().setIndex(loopIndexForUrl(cueUrl('practiceDemo')));
  };

  // Press a pad: always sounds it (free play); during 'listen' it also scores.
  const press = (i: number) => {
    if (phaseRef.current === 'demo') return; // input locked while it's calling
    flash(i, 300);
    if (phaseRef.current !== 'listen') return; // idle / won → free noodling
    if (i === seq.current[inputIdx.current]) {
      inputIdx.current += 1;
      if (inputIdx.current >= seq.current.length) {
        // phrase complete. four rounds (= length 4) clears it.
        if (seq.current.length >= ROUNDS_TO_WIN) {
          pendingWin.current = true; // lock start() until win() resolves
          setPhaseBoth('idle');
          push(setTimeout(win, 450));
        } else {
          seq.current = [...seq.current, Math.floor(Math.random() * PADS.length)];
          setRound(seq.current.length);
          setPhaseBoth('demo');
          push(setTimeout(playDemo, 650));
        }
      }
    } else {
      // wrong note — gentle: re-call a fresh round-1 phrase, no harsh fail/penalty
      seq.current = [Math.floor(Math.random() * PADS.length)];
      setRound(1);
      setPhaseBoth('demo');
      push(setTimeout(playDemo, 650));
    }
  };

  // Test hook (gated to ?world / ?debug) — lets shoot:practice drive the game
  // deterministically: read the expected phrase while listening, play it back.
  useEffect(() => {
    exposeTestGlobal('__sdpPractice', {
      phase,
      round,
      cleared,
      expected: seq.current.slice(),
      start,
      press,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round, cleared]);

  useEffect(() => () => clearTimers(), []);

  // ── geometry: six pads on the back (-Z) wall, in two rows of three ──
  const padMeshes = PADS.map((p, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = (col - 1) * 1.5;
    const y = 2.4 - row * 1.1;
    const isLit = lit === i;
    return (
      <mesh
        key={i}
        position={[x, y, -D + 0.32]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation();
          press(i);
        }}
      >
        <boxGeometry args={[1.15, 0.85, 0.18]} />
        <meshBasicMaterial color={isLit ? p.lit : p.dim} />
      </mesh>
    );
  });

  return (
    <group>
      {padMeshes}
      {/* the 4-track that calls the phrase — click it to start the game */}
      <group position={[3.6, 0, -2.2]}>
        <mesh material={deckMat} position={[0, 0.6, 0]}>
          <boxGeometry args={[1.6, 1.2, 1.0]} />
        </mesh>
        <mesh
          position={[0, 1.05, 0.46]}
          onClick={(e: ThreeEvent<MouseEvent>) => {
            e.stopPropagation();
            start();
          }}
        >
          <boxGeometry args={[0.5, 0.22, 0.1]} />
          {/* red 'REC' button → green once you've cleared it */}
          <meshBasicMaterial color={cleared ? '#7CFC9A' : '#e0483a'} />
        </mesh>
      </group>
    </group>
  );
}

// ── The CHIME RIG — the room's focal point (Luke: "give it a focal point"). A
//    spotlit row of pendulum chimes hung in the centre that swings in a pendulum
//    wave and rings itself through the SHARED bell engine (audio.playChime /
//    src/lib/chimes) — the /chimes cabinet made a physical, in-world instrument
//    (the "deep 3D instrument room"). Click any bell to re-launch the wave. The
//    pads on the back wall become its backing. Kept SWEET (it's a relief room).
const WHITE = new THREE.Color('#ffffff');
const BOB_PALETTE = ['#ffcf8f', '#ffe0a0', '#cdef9c', '#a0e6f0', '#c0c0ff', '#ffb0e0', '#ffd27a'];
const RIG_COUNT = 7;
const RIG_SPAN = 3.0;
const RIG_Z = -0.6;

function ChimeRig({ room }: { room: Room }) {
  const H = room.dims.height;
  const beamY = H - 0.5;
  const restY = 1.7; // bobs hang to about chest/eye height — a clear target
  const L = Math.max(0.8, beamY - restY);

  const sim = useMemo(() => {
    const s = new ChimesSim(RIG_COUNT, true);
    s.tempo = 0.7; // gentle, so the chimes are ambience you can play over
    s.swingAmp = 0.5;
    return s;
  }, []);

  const pivots = useRef<(THREE.Group | null)[]>([]);
  const bobMats = useMemo(
    () => BOB_PALETTE.slice(0, RIG_COUNT).map((c) => new THREE.MeshBasicMaterial({ color: c })),
    [],
  );
  const baseColors = useMemo(() => bobMats.map((m) => m.color.clone()), [bobMats]);
  const frameMat = useMemo(() => flatMat('#2a201a'), []);
  const stringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#7a6a52' }), []);
  useEffect(
    () => () => {
      bobMats.forEach((m) => m.dispose());
      frameMat.dispose();
      stringMat.dispose();
    },
    [bobMats, frameMat, stringMat],
  );

  const xs = useMemo(
    () =>
      Array.from({ length: RIG_COUNT }, (_, i) =>
        RIG_COUNT > 1 ? (i / (RIG_COUNT - 1) - 0.5) * RIG_SPAN : 0,
      ),
    [],
  );

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    for (const s of sim.step(dt)) audio.playChime(s.freq, s.pan, 0.07); // soft, ambient
    const pend = sim.pendulums;
    for (let i = 0; i < pend.length; i++) {
      const g = pivots.current[i];
      if (g) g.rotation.x = pend[i].theta; // swing forward/back — the pendulum wave
      const mat = bobMats[i];
      if (mat) mat.color.copy(baseColors[i]).lerp(WHITE, Math.min(1, pend[i].flash * 0.85));
    }
  });

  const reswing = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    audio.unlock(); // the click is the gesture
    sim.reset();
    // an instant chord + flash so the click feels responsive, then the wave runs
    for (const p of sim.pendulums) {
      p.flash = 1;
      audio.playChime(p.freq, p.index % 2 ? 0.35 : -0.35, 0.08);
    }
  };

  return (
    <group position={[0, 0, RIG_Z]}>
      {/* the focal spotlight — the rig is the brightest thing, drawing the eye */}
      <pointLight position={[0, beamY - 0.3, 0.6]} intensity={0.95} distance={10} color="#ffe6b0" />
      {/* the beam the chimes hang from (clickable) + posts up to the ceiling */}
      <mesh material={frameMat} position={[0, beamY, 0]} onClick={reswing}>
        <boxGeometry args={[RIG_SPAN + 0.6, 0.16, 0.16]} />
      </mesh>
      <mesh material={frameMat} position={[-(RIG_SPAN / 2 + 0.3), beamY + (H - beamY) / 2, 0]}>
        <boxGeometry args={[0.12, H - beamY, 0.12]} />
      </mesh>
      <mesh material={frameMat} position={[RIG_SPAN / 2 + 0.3, beamY + (H - beamY) / 2, 0]}>
        <boxGeometry args={[0.12, H - beamY, 0.12]} />
      </mesh>
      {/* the pendulum bells — click any to re-launch the wave */}
      {xs.map((x, i) => (
        <group
          key={i}
          position={[x, beamY, 0]}
          ref={(el) => {
            pivots.current[i] = el;
          }}
        >
          <mesh material={stringMat} position={[0, -L / 2, 0]}>
            <boxGeometry args={[0.02, L, 0.02]} />
          </mesh>
          <mesh material={bobMats[i]} position={[0, -L, 0]} onClick={reswing}>
            <cylinderGeometry args={[0.05, 0.12, 0.18, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export function PracticeRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;

  const wallMat = useMemo(() => flatMat('#3a2a1c', { side: THREE.DoubleSide }), []); // warm wood-panel
  const floorMat = useMemo(() => flatMat('#241810'), []);
  const ceilMat = useMemo(() => flatMat('#16100a'), []);
  const trimMat = useMemo(() => flatMat('#52331f'), []);
  const ampMat = useMemo(() => flatMat('#1b1410'), []);
  const deckMat = useMemo(() => flatMat('#2a2420'), []);

  useEffect(
    () => () => {
      [wallMat, floorMat, ceilMat, trimMat, ampMat, deckMat].forEach((m) => m.dispose());
    },
    [wallMat, floorMat, ceilMat, trimMat, ampMat, deckMat],
  );

  return (
    <group>
      {/* warm, cosy light — a relief room, kept sweet */}
      <ambientLight intensity={0.5} color="#ffdcae" />
      <hemisphereLight args={['#ffcf95', '#2a1d0e', 0.5]} />
      <pointLight position={[0, H - 1, 0]} intensity={0.5} distance={16} color="#ffcc88" />

      {/* shell */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      <mesh material={ceilMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      <mesh material={wallMat} position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} position={[0, H / 2, D]} rotation-y={Math.PI}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} position={[-W, H / 2, 0]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} position={[W, H / 2, 0]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>

      {/* a strip of trim framing the pad wall */}
      <mesh material={trimMat} position={[0, 0.9, -D + 0.2]}>
        <boxGeometry args={[W * 2 - 0.4, 0.12, 0.1]} />
      </mesh>
      <mesh material={trimMat} position={[0, 3.1, -D + 0.2]}>
        <boxGeometry args={[W * 2 - 0.4, 0.12, 0.1]} />
      </mesh>

      {/* a beat-up amp in the corner for character */}
      <group position={[-3.8, 0, -3.4]}>
        <mesh material={ampMat} position={[0, 0.9, 0]}>
          <boxGeometry args={[1.4, 1.8, 1.0]} />
        </mesh>
        <mesh material={trimMat} position={[0, 1.4, 0.52]}>
          <boxGeometry args={[1.1, 0.7, 0.06]} />
        </mesh>
      </group>

      <PadInstrument room={room} deckMat={deckMat} />

      {/* the focal point: a spotlit pendulum-chime rig in the centre */}
      <ChimeRig room={room} />
    </group>
  );
}
