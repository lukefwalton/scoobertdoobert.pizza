import { useEffect, useMemo, useRef, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { applyVertexSnap } from './ps1';
import { audio } from '../audio/engine';
import { jukeboxTrackUrl } from '../data/jukebox';
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
const SEALED_SLUG = 'jolly-roger-bay'; // the sealed demo the game unlocks

function flatMat(color: string, side: THREE.Side = THREE.FrontSide): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true, side });
  applyVertexSnap(m, 64);
  return m;
}

type Phase = 'idle' | 'demo' | 'listen' | 'won';

function PadInstrument({ room, deckMat }: { room: Room; deckMat: THREE.Material }) {
  const D = room.dims.halfD;
  const [lit, setLit] = useState(-1);
  const [phase, setPhase] = useState<Phase>('idle');
  const [round, setRound] = useState(0);
  const [cleared, setCleared] = useState(
    () => useProgressStore.getState().clearedGames.includes('practice'),
  );

  const seq = useRef<number[]>([]);
  const inputIdx = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

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
    audio.playTone(PADS[i].freq, durMs);
    push(setTimeout(() => setLit((cur) => (cur === i ? -1 : cur)), durMs * 0.8));
  };

  // Call the current phrase, then hand control to the player.
  const playDemo = () => {
    setPhaseBoth('demo');
    clearTimers();
    const step = 520;
    seq.current.forEach((idx, k) => push(setTimeout(() => flash(idx, 360), 450 + k * step)));
    push(
      setTimeout(() => {
        inputIdx.current = 0;
        setPhaseBoth('listen');
      }, 450 + seq.current.length * step + 150),
    );
  };

  const start = () => {
    if (phaseRef.current === 'demo') return; // can't interrupt the machine mid-call
    clearTimers();
    seq.current = [Math.floor(Math.random() * PADS.length)];
    setRound(1);
    playDemo();
  };

  const win = () => {
    setPhaseBoth('won');
    setCleared(true);
    // The unlock: the previously-unused persistence hook fires, the rat clocks it,
    // and the sealed demo plays (exploration's reward is sound).
    useProgressStore.getState().clearGame('practice');
    useProgressStore.getState().findSecret('practice');
    void audio.playJukeboxTrack(jukeboxTrackUrl(SEALED_SLUG));
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
    if (typeof window !== 'undefined' && /[?&](world|debug)(=|&|$)/.test(window.location.search)) {
      (window as Window & { __sdpPractice?: unknown }).__sdpPractice = {
        phase,
        round,
        cleared,
        expected: seq.current.slice(),
        start,
        press,
      };
    }
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

export function PracticeRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;

  const wallMat = useMemo(() => flatMat('#3a2a1c', THREE.DoubleSide), []); // warm wood-panel
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
    </group>
  );
}
