import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import {
  flatMat,
  makeAffineTexturedMaterial,
  makeCheckerTexture,
  makeTextTexture,
  nearestify,
} from './ps1';
import { fogFor, type Room } from '../data/rooms';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { useProgressStore } from '../state/progressStore';
import { useSceneStore } from '../state/sceneStore';
import { announce } from '../state/toastStore';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';
import { useDispose } from '../lib/useDispose';
import { rollD20, luckTag } from '../lib/luck';
import { fortuneForRoll, type Fortune } from '../data/omikuji';

// Furin tuning — a bright, glassy high pentatonic from the site's D6/9 world, so
// the wind-chimes always agree with the music. (Reuses the chimes note math.)
const FURIN_FREQS = [
  noteToFreq('A', 5),
  noteToFreq('B', 5),
  noteToFreq('D', 6),
  noteToFreq('E', 6),
  noteToFreq('F#', 6),
];

// ───────────────────────────────────────────────────────────────────────────
// ShrineRoom, the Japan level (scaffold). The one OUTDOOR, *sweet* deep room:
// a rural golden-hour dusk with a torii path, a little wayside shrine, a country
// railway crossing, distant vaporwave mountains, and fireflies. A breather among
// the bitter depths (taste guardrail, the contrast is the point).
//
// Built procedurally from primitives in the PS1 register (flat-shaded, vertex-
// snapped, fogged), torii are two posts + two beams, the shrine is a platform +
// a gabled roof, the tracks are rails + sleepers. Original parody only (no real
// marks). The tracks run off into the fog toward a future metro-tunnel GLB
// hookup ("connect to the tunnel cuz of trains"). All easy to swap for sourced
// GLBs later; this gets the place STANDING.
// ───────────────────────────────────────────────────────────────────────────

// A torii gate: two pillars, the lower tie-beam (nuki), the top lintel (kasagi +
// shimaki), and the little centre strut. Vermilion. Spans the path at `z`.
function Torii({
  z,
  span = 2.6,
  height = 3.6,
  mat,
}: {
  z: number;
  span?: number;
  height?: number;
  mat: THREE.Material;
}) {
  const px = span / 2;
  return (
    <group position={[0, 0, z]}>
      {/* pillars */}
      <mesh material={mat} position={[-px, height / 2, 0]}>
        <boxGeometry args={[0.22, height, 0.22]} />
      </mesh>
      <mesh material={mat} position={[px, height / 2, 0]}>
        <boxGeometry args={[0.22, height, 0.22]} />
      </mesh>
      {/* nuki, lower tie beam */}
      <mesh material={mat} position={[0, height * 0.72, 0]}>
        <boxGeometry args={[span + 0.5, 0.18, 0.26]} />
      </mesh>
      {/* shimaki, beam under the lintel */}
      <mesh material={mat} position={[0, height - 0.16, 0]}>
        <boxGeometry args={[span + 1.0, 0.16, 0.28]} />
      </mesh>
      {/* kasagi, the top lintel */}
      <mesh material={mat} position={[0, height + 0.04, 0]}>
        <boxGeometry args={[span + 1.4, 0.24, 0.34]} />
      </mesh>
      {/* gakuzuka, centre strut */}
      <mesh material={mat} position={[0, height * 0.86, 0]}>
        <boxGeometry args={[0.16, height * 0.28, 0.2]} />
      </mesh>
    </group>
  );
}

// A stone lantern (tōrō): stacked blocks with a softly lit firebox.
function Lantern({
  x,
  z,
  stone,
  glow,
}: {
  x: number;
  z: number;
  stone: THREE.Material;
  glow: THREE.Material;
}) {
  return (
    <group position={[x, 0, z]}>
      <mesh material={stone} position={[0, 0.18, 0]}>
        <boxGeometry args={[0.5, 0.36, 0.5]} />
      </mesh>
      <mesh material={stone} position={[0, 0.62, 0]}>
        <boxGeometry args={[0.18, 0.5, 0.18]} />
      </mesh>
      {/* firebox, the lit chamber */}
      <mesh material={glow} position={[0, 1.0, 0]}>
        <boxGeometry args={[0.4, 0.36, 0.4]} />
      </mesh>
      {/* cap */}
      <mesh material={stone} position={[0, 1.3, 0]}>
        <coneGeometry args={[0.42, 0.3, 4]} />
      </mesh>
      <pointLight position={[0, 1.0, 0]} intensity={0.35} distance={4} color="#ffcf7a" />
    </group>
  );
}

// Fireflies, drifting glowing points in the dusk. THREE.Points so they read as
// chunky glowing pixels under the low-res render; each bobs on its own phase.
function Fireflies({ count = 44 }: { count?: number }) {
  const ref = useRef<THREE.Points>(null);
  const sprite = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    g.addColorStop(0, 'rgba(255,255,210,1)');
    g.addColorStop(1, 'rgba(255,255,210,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 16);
    return nearestify(new THREE.CanvasTexture(c));
  }, []);

  // Seed base positions + per-point bob phase/speed.
  const seed = useMemo(() => {
    const base = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      base[i * 3] = (Math.random() - 0.5) * 16; // x
      base[i * 3 + 1] = 0.5 + Math.random() * 3.2; // y
      base[i * 3 + 2] = -12 + Math.random() * 22; // z (down the path)
      phase[i] = Math.random() * Math.PI * 2;
      speed[i] = 0.4 + Math.random() * 0.8;
    }
    return { base, phase, speed };
  }, [count]);

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(seed.base.slice(), 3));
    return g;
  }, [seed]);

  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#eaff8c',
        map: sprite,
        size: 0.22,
        sizeAttenuation: true,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: true,
      }),
    [sprite],
  );

  useFrame((state) => {
    const pts = ref.current;
    if (!pts) return;
    const t = state.clock.elapsedTime;
    const attr = pts.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    for (let i = 0; i < count; i++) {
      const ph = seed.phase[i];
      const sp = seed.speed[i];
      arr[i * 3] = seed.base[i * 3] + Math.sin(t * sp * 0.6 + ph) * 0.8;
      arr[i * 3 + 1] = seed.base[i * 3 + 1] + Math.sin(t * sp + ph) * 0.35;
      arr[i * 3 + 2] = seed.base[i * 3 + 2] + Math.cos(t * sp * 0.5 + ph) * 0.8;
    }
    attr.needsUpdate = true;
    // gentle collective twinkle
    mat.opacity = 0.7 + Math.sin(t * 2.3) * 0.2;
  });

  useDispose(geom, mat, sprite);

  return <points ref={ref} geometry={geom} material={mat} />;
}

// Furin (風鈴), a glass wind-chime hung under the shrine eave. The bell DOME is a
// little truncated cone; a paper strip (tanzaku) sways below in the "wind." It
// rings itself at gentle random intervals by driving `audio.playChime`, the SAME
// synthesis engine as the /chimes cabinet (src/lib/chimes.strikeBell), reused to
// power an in-room effect. Mute-aware + ambient-quiet by construction (the engine
// no-ops when muted / pre-gesture), and it's a SWEET room, so this stays a relief
// beat — never dread. The strip sway is the only motion; no flashing.
function Furin({ x, y, z, pan }: { x: number; y: number; z: number; pan: number }) {
  const strip = useRef<THREE.Group>(null);
  const timer = useRef(1.5 + Math.random() * 3.5); // delay before the first ring
  const kick = useRef(0); // a little extra sway right after it rings

  const bellMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe39a' }), []);
  const lineMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c8a35c' }), []);
  const stripMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#eae3d2', side: THREE.DoubleSide }),
    [],
  );
  useDispose(bellMat, lineMat, stripMat);

  useFrame((state, dt) => {
    timer.current -= dt;
    if (timer.current <= 0) {
      audio.playChime(FURIN_FREQS[Math.floor(Math.random() * FURIN_FREQS.length)], pan, 0.12);
      kick.current = 1;
      timer.current = 2.4 + Math.random() * 4.5; // sparse + unhurried
    }
    kick.current *= Math.pow(0.15, dt); // decay the post-ring flutter
    const t = state.clock.elapsedTime;
    if (strip.current) {
      strip.current.rotation.z =
        Math.sin(t * 1.5 + x) * 0.12 + Math.sin(t * 4.2 + x) * 0.06 * kick.current;
    }
  });

  return (
    <group position={[x, y, z]}>
      {/* cord up to the eave */}
      <mesh material={lineMat} position={[0, 0.2, 0]}>
        <boxGeometry args={[0.02, 0.4, 0.02]} />
      </mesh>
      {/* the little glass bell (a truncated-cone dome) */}
      <mesh material={bellMat} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 0.12, 0.13, 8]} />
      </mesh>
      {/* clapper + the tanzaku paper strip, swaying in the wind */}
      <group ref={strip} position={[0, -0.08, 0]}>
        <mesh material={lineMat} position={[0, -0.13, 0]}>
          <boxGeometry args={[0.015, 0.26, 0.015]} />
        </mesh>
        <mesh material={stripMat} position={[0, -0.34, 0]}>
          <planeGeometry args={[0.1, 0.28]} />
        </mesh>
      </group>
    </group>
  );
}

// The offering box (賽銭箱) — the shrine ritual + the game layer's luck faucet.
// Click it to pay respects the proper way: 二拍手, two claps, and a coin tinkle.
// The FIRST clap per visit grants luck (announced), small, easy, repeatable by
// coming back. A SWEET interaction (no dread): the box gives a little bow-pulse.
function OfferingBox({ mat }: { mat: THREE.Material }) {
  const { gl } = useThree();
  const box = useRef<THREE.Mesh>(null);
  const claimed = useRef(false); // one luck grant per visit (resets on re-entry)
  const cooldown = useRef(0);
  const pulse = useRef(0);
  const timers = useRef<number[]>([]); // pending clap/coin timeouts, cleared on unmount

  useFrame((_, dt) => {
    if (cooldown.current > 0) cooldown.current -= dt;
    pulse.current *= Math.pow(0.015, dt); // decay the bow-pulse
    if (box.current) box.current.scale.setScalar(1 + pulse.current * 0.05);
  });

  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  const doClap = () => {
    if (cooldown.current > 0) return;
    cooldown.current = 1.2;
    pulse.current = 1;
    audio.unlock(); // the click is the gesture
    audio.playClap();
    // Track the delayed clap + coin tinkle so leaving the shrine mid-ritual can
    // cancel them, otherwise they'd fire into the next room's audio (shared engine).
    timers.current.push(
      window.setTimeout(() => audio.playClap(), 190), // …clap clap (二拍手)
      window.setTimeout(() => audio.playChime(noteToFreq('B', 5), 0, 0.1), 360), // a coin tinkle
    );
    if (!claimed.current) {
      claimed.current = true;
      const prog = useProgressStore.getState();
      prog.gainLuck(1);
      // Bank the ritual itself (durable) so the "Pay your respects" objective
      // completes on the CLAP specifically, not on any luck earned elsewhere.
      prog.findSecret('shrine-clap');
      // The ritual doubles as your REST (the D&D long rest): paying respects
      // refills your spell slots. Only mentioned once you actually have magic.
      if (prog.knownSpells.length > 0) {
        prog.restSpellSlots();
        announce('🍀 You clap twice. Fortune smiles · +1 luck · 🔥 slots restored', 'luck');
      } else {
        announce('🍀 You clap twice. Fortune smiles · +1 luck', 'luck');
      }
    } else {
      announce('🙏 The kami have already heard you this visit.', 'info');
    }
  };
  const clap = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    doClap();
  };

  // Test hook (?world / ?debug): let shoot:luck perform the ritual deterministically
  // (clicking a swinging 3D target through Playwright is fragile). Also cancel any
  // pending clap/coin timeouts on unmount so they can't leak into the next room.
  useEffect(() => {
    exposeTestGlobal('__sdpShrineClap', doClap);
    const pending = timers.current;
    return () => {
      exposeTestGlobal('__sdpShrineClap', undefined);
      pending.forEach((id) => clearTimeout(id));
      pending.length = 0;
    };
  }, []);

  return (
    <mesh
      ref={box}
      material={mat}
      position={[0, 0.85, 1.7]}
      onClick={clap}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      <boxGeometry args={[1.0, 0.6, 0.5]} />
    </mesh>
  );
}

// The omikuji stand (おみくじ) — the shrine's FORTUNE draw and the game layer's most
// legible BAD↔GREAT roll (Luke: more chances for bad/great; turn luck into clear
// outcomes). Click the little mikuji box: a luck-biased universal d20 (rollD20 — a
// STAKES draw, so banked luck tips you toward a better slip) draws a fortune from 大吉
// (great blessing) down to 凶 (a curse). The paper slip unfurls with the reading, and
// the toast SHOWS luck's work (luckTag). A blessing pays out luck; a 凶 costs nothing —
// the sweet shrine's bad luck is pure theatre (taste guardrail: tie the slip to a
// branch, leave it behind). Repeatable on a short cooldown, like the clap.
function OmikujiStand({ position }: { position: [number, number, number] }) {
  const { gl } = useThree();
  const tube = useRef<THREE.Group>(null);
  const cooldown = useRef(0);
  const shake = useRef(0);
  const drawnOnce = useRef(false);
  const reduced = useRef(false);
  // The 大吉 note burst, queued as {secondsUntilPlay, freq} and fired from useFrame so
  // it rides the R3F clock (not setTimeout) — it freezes under pause/transition and
  // simply stops when the room unmounts (no cross-room audio bleed, no cleanup needed).
  const burst = useRef<{ t: number; freq: number }[]>([]);
  const [fortune, setFortune] = useState<Fortune | null>(null);

  const baseMat = useMemo(() => flatMat('#6b4a2f', { side: THREE.DoubleSide }), []);
  const boxMat = useMemo(() => flatMat('#7d5636'), []);
  const roofMat = useMemo(() => flatMat('#33414c', { side: THREE.DoubleSide }), []);
  useDispose(baseMat, boxMat, roofMat);

  // The fortune slip — regenerated per draw; the texture + its material are disposed
  // whenever the draw changes (and on unmount), so re-drawing never leaks canvases.
  const slipTex = useMemo(
    () =>
      fortune
        ? // portrait slip, both dims within the hard ≤128px PS1 texture cap
          makeTextTexture(`${fortune.jp}\n${fortune.en}`, {
            fg: '#7a1f1f',
            bg: '#f3ecda',
            w: 96,
            h: 128,
          })
        : null,
    [fortune],
  );
  const slipMat = useMemo(
    () => (slipTex ? new THREE.MeshBasicMaterial({ map: slipTex, side: THREE.DoubleSide }) : null),
    [slipTex],
  );
  useEffect(
    () => () => {
      slipTex?.dispose();
      slipMat?.dispose();
    },
    [slipTex, slipMat],
  );

  // Persistent bilingual label so you know it's a fortune box (like the site's other
  // EN/JP signage — 二拍手 / 青函トンネル elsewhere).
  const labelTex = useMemo(
    () =>
      makeTextTexture('おみくじ\nDRAW A FORTUNE', { fg: '#ffe6a0', bg: '#2a1a10', w: 128, h: 72 }),
    [],
  );
  const labelMat = useMemo(() => new THREE.MeshBasicMaterial({ map: labelTex }), [labelTex]);
  useDispose(labelTex, labelMat);

  useEffect(() => {
    reduced.current =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  }, []);

  const draw = () => {
    if (cooldown.current > 0) return;
    cooldown.current = 1.4;
    if (!reduced.current) shake.current = 1; // a little shake of the tube (no strobe)
    audio.unlock();
    audio.playChime(noteToFreq('B', 5), 0, 0.1); // a soft bell as you draw
    // A STAKES draw: luck (if any) buys advantage, tipping you toward a better slip —
    // so the luckier you are, the better your fortunes run. The roll rides along so
    // the toast can show luck's work.
    const roll = rollD20(true);
    const f = fortuneForRoll(roll.face, roll.crit);
    setFortune(f);
    const prog = useProgressStore.getState();
    if (f.luck > 0) prog.gainLuck(f.luck);
    prog.recordFortune(f.rank); // hang your best slip in the trophy case (monotonic)
    if (!drawnOnce.current) {
      drawnOnce.current = true;
      prog.findSecret('omikuji-drawn'); // completes the "Draw your fortune" objective
    }
    // sound the outcome: a bright ascending sparkle for 大吉, a low deflating womp for
    // 凶 (still sweet, the shrine stays a relief beat). The 大吉 burst is spread over
    // time, so it's QUEUED onto the frame clock (below) rather than setTimeout — so it
    // pauses with the world and stops cleanly on unmount.
    if (f.id === 'daikichi')
      burst.current.push(
        { t: 0, freq: noteToFreq('E', 6) },
        { t: 0.09, freq: noteToFreq('G', 6) },
        { t: 0.18, freq: noteToFreq('B', 6) },
      );
    else if (f.id === 'kyo') audio.playChime(noteToFreq('C', 2), -0.1, 0.22, 1.0);
    const luckNote = f.luck > 0 ? ` · +${f.luck} luck` : '';
    announce(`${f.jp} ${f.en}, ${f.line}${luckNote}${luckTag(roll)}`, f.kind);
    exposeTestGlobal('__sdpFortune', { id: f.id, face: roll.face, crit: roll.crit });
  };

  // ?debug-only ACTION hook: the smoke draws deterministically (banks luck + a durable
  // secret, so it rides the narrower gate like __sdpRibbit / the progression hooks).
  useEffect(() => {
    if (isDebugEntrance()) exposeTestGlobal('__sdpOmikuji', draw);
    return () => {
      exposeTestGlobal('__sdpOmikuji', undefined);
      exposeTestGlobal('__sdpFortune', undefined);
    };
  }, []);

  useFrame((state, dt) => {
    if (cooldown.current > 0) cooldown.current -= dt;
    shake.current *= Math.pow(0.02, dt); // decay the post-draw shake
    if (tube.current)
      tube.current.rotation.z = Math.sin(state.clock.elapsedTime * 22) * 0.28 * shake.current;
    // Drain the queued 大吉 arpeggio on the frame clock — but freeze it while the world
    // is paused / mid-transition (world audio shouldn't run under pause), so it resumes
    // exactly where it left off. Notes not yet due just wait; unmount ends the room's
    // frames, so a pending burst simply never fires into the next room.
    if (burst.current.length) {
      const st = useSceneStore.getState();
      if (!st.paused && !st.transitioning) {
        for (const note of burst.current) note.t -= dt;
        const due = burst.current.filter((n) => n.t <= 0);
        for (const n of due) audio.playChime(n.freq, 0.2, 0.1, 0.7);
        if (due.length) burst.current = burst.current.filter((n) => n.t > 0);
      }
    }
  });

  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  return (
    <group position={position}>
      {/* the little counter/stand */}
      <mesh material={baseMat} position={[0, 0.45, 0]}>
        <boxGeometry args={[0.72, 0.9, 0.5]} />
      </mesh>
      {/* a small gabled roof over it, echoing the honden */}
      <mesh material={roofMat} position={[0, 1.62, -0.18]} rotation-x={-0.6}>
        <planeGeometry args={[0.95, 0.6]} />
      </mesh>
      <mesh material={roofMat} position={[0, 1.62, 0.18]} rotation-x={Math.PI + 0.6}>
        <planeGeometry args={[0.95, 0.6]} />
      </mesh>
      {/* the bilingual label on the front of the stand */}
      <mesh material={labelMat} position={[0, 0.62, 0.26]}>
        <planeGeometry args={[0.62, 0.32]} />
      </mesh>
      {/* the mikuji box, the thing you shake; the whole tube is the control */}
      <group
        ref={tube}
        position={[0, 1.2, 0.02]}
        onClick={(e) => {
          e.stopPropagation();
          draw();
        }}
        onPointerOver={() => {
          gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
        }}
        onPointerOut={() => {
          gl.domElement.style.cursor = 'grab';
        }}
      >
        <mesh material={boxMat}>
          <cylinderGeometry args={[0.13, 0.14, 0.5, 6]} />
        </mesh>
        {/* the capped top, with the little hole the stick shakes out of */}
        <mesh material={baseMat} position={[0, 0.27, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.05, 6]} />
        </mesh>
      </group>
      {/* faint warm glow so the stand catches the eye at dusk */}
      <pointLight position={[0, 1.3, 0.5]} intensity={0.35} distance={4} color="#ffe6a8" />
      {/* the drawn fortune slip, unfurled above the box (only after a draw) */}
      {slipMat && (
        <mesh material={slipMat} position={[0, 1.95, 0.12]}>
          <planeGeometry args={[0.42, 0.56]} />
        </mesh>
      )}
    </group>
  );
}

export function ShrineRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const fog = fogFor(room);

  // ── materials (shared) ──
  const grassTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#5f7a3a', '#6f8a44'); // two dusk greens
    t.repeat.set(6, 6);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(grassTex, 8, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [grassTex, fog.color, fog.near, fog.far],
  );
  const pathTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#b9a982', '#c6b78e'); // pale gravel
    t.repeat.set(1, 8);
    return t;
  }, []);
  const pathMat = useMemo(
    () => makeAffineTexturedMaterial(pathTex, 2, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pathTex, fog.color, fog.near, fog.far],
  );
  const toriiMat = useMemo(() => flatMat('#c4352a'), []); // vermilion
  const woodMat = useMemo(() => flatMat('#6b4a2f', { side: THREE.DoubleSide }), []);
  const roofMat = useMemo(() => flatMat('#33414c', { side: THREE.DoubleSide }), []); // dark slate
  const stoneMat = useMemo(() => flatMat('#9a958a'), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe6a0' }), []);
  const railMat = useMemo(() => flatMat('#aab0b6'), []);
  const sleeperMat = useMemo(() => flatMat('#3a2e22'), []);
  const ballastMat = useMemo(() => flatMat('#6f6a60'), []);
  const trainBodyMat = useMemo(() => flatMat('#c9c2a6', { side: THREE.DoubleSide }), []); // cream
  const trainStripeMat = useMemo(() => flatMat('#3f6b4a'), []); // rural green stripe
  const trainGlassMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#23303a' }), []);
  const mountainMat = useMemo(() => flatMat('#7d6f96', { side: THREE.DoubleSide }), []); // dusty vaporwave blue
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffdca0' }), []);
  const concreteMat = useMemo(() => flatMat('#6a6e72'), []); // the tunnel portal surround
  const portalDarkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#08090d' }), []); // its mouth

  // dispose the canvas textures we generated
  useDispose(grassTex, pathTex);

  // sleeper cross-ties along the crossing (placed along X)
  const sleepers = useMemo(() => {
    const xs: number[] = [];
    for (let x = -W - 4; x <= W + 4; x += 1.3) xs.push(x);
    return xs;
  }, [W]);

  const TRACK_Z = 2; // the level crossing sits between you and the shrine

  return (
    <group>
      {/* ── dusk lighting: warm sky, a low sun, soft ground bounce ── */}
      <hemisphereLight args={['#f0d6a0', '#42502c', 0.7]} />
      <ambientLight intensity={0.35} color="#ffe0bd" />
      <directionalLight position={[-7, 5, -10]} intensity={0.7} color="#ffcf95" />

      {/* ground + central path */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2 + 12, D * 2 + 12]} />
      </mesh>
      <mesh material={pathMat} rotation-x={-Math.PI / 2} position={[0, 0.02, 1]}>
        <planeGeometry args={[2.4, D * 2]} />
      </mesh>

      {/* the torii path, gates receding toward the shrine (one behind you, at
          the entrance, so you step out from under it) */}
      <Torii z={12} mat={toriiMat} />
      <Torii z={7.5} mat={toriiMat} />
      <Torii z={-1.5} span={2.8} height={3.9} mat={toriiMat} />
      <Torii z={-6.5} span={3.0} height={4.1} mat={toriiMat} />

      {/* the grass-side gateway, a vermilion torii on the open -X edge, turned a
          quarter-turn to frame a worn path off into the overgrown field. Mirrors
          the grass field's own entrance torii; the 'shrine-to-grass' door in
          rooms.ts sits right under it. */}
      <mesh material={pathMat} rotation-x={-Math.PI / 2} position={[-6, 0.02, 6]}>
        <planeGeometry args={[10, 2.2]} />
      </mesh>
      <group position={[-10.6, 0, 6]} rotation-y={Math.PI / 2}>
        <Torii z={0} mat={toriiMat} />
      </group>
      {/* warm fill on the gateway's near (shrine-facing) side, the lone directional
          light leaves it backlit and gloomy otherwise, and this is a SWEET room, so
          it should glow vermilion like the path toriis, not read as a dark slab */}
      <pointLight position={[-9.2, 2.6, 6]} intensity={0.6} distance={10} color="#ffd9a0" />
      {/* a stone lantern marking the turn-off, like the ones flanking the main path */}
      <Lantern x={-4.2} z={4.4} stone={stoneMat} glow={glowMat} />

      {/* stone lanterns flanking the path */}
      <Lantern x={-2.3} z={9} stone={stoneMat} glow={glowMat} />
      <Lantern x={2.3} z={9} stone={stoneMat} glow={glowMat} />
      <Lantern x={-2.6} z={-4.5} stone={stoneMat} glow={glowMat} />
      <Lantern x={2.6} z={-4.5} stone={stoneMat} glow={glowMat} />

      {/* ── the wayside shrine (honden) at the far end ── */}
      <group position={[0, 0, -10.5]}>
        {/* stone base */}
        <mesh material={stoneMat} position={[0, 0.2, 0]}>
          <boxGeometry args={[4.2, 0.4, 3.2]} />
        </mesh>
        {/* raised wooden floor */}
        <mesh material={woodMat} position={[0, 0.55, 0]}>
          <boxGeometry args={[3.5, 0.3, 2.7]} />
        </mesh>
        {/* corner posts */}
        {[
          [-1.5, -1.1],
          [1.5, -1.1],
          [-1.5, 1.1],
          [1.5, 1.1],
        ].map(([x, z], i) => (
          <mesh key={i} material={woodMat} position={[x, 1.5, z]}>
            <boxGeometry args={[0.18, 1.9, 0.18]} />
          </mesh>
        ))}
        {/* back + side walls (front left open to see in) */}
        <mesh material={woodMat} position={[0, 1.4, -1.25]}>
          <boxGeometry args={[3.4, 1.7, 0.12]} />
        </mesh>
        <mesh material={woodMat} position={[-1.65, 1.4, 0]}>
          <boxGeometry args={[0.12, 1.7, 2.4]} />
        </mesh>
        <mesh material={woodMat} position={[1.65, 1.4, 0]}>
          <boxGeometry args={[0.12, 1.7, 2.4]} />
        </mesh>
        {/* gabled roof, two slate planes meeting at a ridge, deep overhang */}
        <mesh material={roofMat} position={[0, 2.9, -0.95]} rotation-x={-0.62}>
          <planeGeometry args={[4.8, 2.3]} />
        </mesh>
        <mesh material={roofMat} position={[0, 2.9, 0.95]} rotation-x={Math.PI + 0.62}>
          <planeGeometry args={[4.8, 2.3]} />
        </mesh>
        {/* ridge beam */}
        <mesh material={woodMat} position={[0, 3.45, 0]}>
          <boxGeometry args={[4.9, 0.18, 0.18]} />
        </mesh>
        {/* the offering box, click to clap twice (二拍手) and earn luck */}
        <OfferingBox mat={woodMat} />
        {/* the omikuji stand beside it, draw a paper fortune (大吉…凶); luck tips the
            draw, a blessing pays luck back, a curse is sweet theatre (no penalty) */}
        <OmikujiStand position={[2.1, 0, 1.5]} />
        {/* furin under the front eaves, they ring themselves via the chimes
            engine (audio.playChime), the cabinet's synthesis reused in-world */}
        <Furin x={-1.45} y={2.5} z={1.25} pan={-0.4} />
        <Furin x={1.45} y={2.5} z={1.25} pan={0.4} />
      </group>

      {/* ── the country railway crossing (tracks run along X, off into the fog
            toward the future tunnel) ── */}
      <mesh material={ballastMat} rotation-x={-Math.PI / 2} position={[0, 0.03, TRACK_Z]}>
        <planeGeometry args={[W * 2 + 10, 2.6]} />
      </mesh>
      {sleepers.map((x, i) => (
        <mesh key={i} material={sleeperMat} position={[x, 0.09, TRACK_Z]}>
          <boxGeometry args={[0.5, 0.14, 2.2]} />
        </mesh>
      ))}
      <mesh material={railMat} position={[0, 0.18, TRACK_Z - 0.7]}>
        <boxGeometry args={[W * 2 + 10, 0.12, 0.1]} />
      </mesh>
      <mesh material={railMat} position={[0, 0.18, TRACK_Z + 0.7]}>
        <boxGeometry args={[W * 2 + 10, 0.12, 0.1]} />
      </mesh>

      {/* a single rail car parked on the crossing, pulled clear to the -X side
          (just left the tunnel), trailing off into the fog */}
      <group position={[-9, 0, TRACK_Z]}>
        <mesh material={trainBodyMat} position={[0, 1.4, 0]}>
          <boxGeometry args={[6.5, 2.0, 1.7]} />
        </mesh>
        <mesh material={roofMat} position={[0, 2.5, 0]}>
          <boxGeometry args={[6.5, 0.3, 1.8]} />
        </mesh>
        {/* window strip + green livery stripe */}
        <mesh material={trainGlassMat} position={[0, 1.7, 0.86]}>
          <boxGeometry args={[5.6, 0.7, 0.05]} />
        </mesh>
        <mesh material={trainStripeMat} position={[0, 1.0, 0.86]}>
          <boxGeometry args={[6.5, 0.3, 0.06]} />
        </mesh>
      </group>

      {/* the tunnel portal at the +X end, where the rails run underground. The
          way DEEPER (the metro-tunnel GLB level) is on the other side; the
          'shrine-to-tunnel' door in rooms.ts sits just in front of this mouth. */}
      <group position={[11.5, 0, TRACK_Z]}>
        {/* concrete surround flanking the track gauge, + a lintel over the top */}
        <mesh material={concreteMat} position={[0, 2, -1.7]}>
          <boxGeometry args={[1.4, 4, 0.7]} />
        </mesh>
        <mesh material={concreteMat} position={[0, 2, 1.7]}>
          <boxGeometry args={[1.4, 4, 0.7]} />
        </mesh>
        <mesh material={concreteMat} position={[0, 3.7, 0]}>
          <boxGeometry args={[1.4, 0.7, 4.1]} />
        </mesh>
        {/* the dark mouth the rails disappear into */}
        <mesh material={portalDarkMat} position={[0.4, 1.7, 0]}>
          <boxGeometry args={[0.3, 3.4, 2.8]} />
        </mesh>
      </group>

      {/* crossbuck crossing sign by the path */}
      <group position={[1.8, 0, TRACK_Z + 1.4]}>
        <mesh material={stoneMat} position={[0, 1.2, 0]}>
          <boxGeometry args={[0.12, 2.4, 0.12]} />
        </mesh>
        <mesh material={glowMat} position={[0, 2.3, 0.08]} rotation-z={Math.PI / 4}>
          <boxGeometry args={[1.0, 0.16, 0.05]} />
        </mesh>
        <mesh material={glowMat} position={[0, 2.3, 0.08]} rotation-z={-Math.PI / 4}>
          <boxGeometry args={[1.0, 0.16, 0.05]} />
        </mesh>
      </group>

      {/* ── distant vaporwave mountains + a low dusk sun, near the fog line ── */}
      {[-8, -2, 4, 9].map((x, i) => (
        <mesh key={i} material={mountainMat} position={[x, 0, -14.5]}>
          <coneGeometry args={[5 + (i % 2) * 2, 6 + (i % 3), 4]} />
        </mesh>
      ))}
      <mesh material={sunMat} position={[-3, 5.5, -14.4]}>
        <circleGeometry args={[2.2, 20]} />
      </mesh>

      {/* fireflies in the dusk */}
      <Fireflies />
    </group>
  );
}
