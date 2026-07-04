import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  flatMat,
  makeSpeckTexture,
  makeAffineTexturedMaterial,
  makeTextTexture,
  seededRandom,
} from './ps1';
import { useDispose } from '../lib/useDispose';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { announce } from '../state/toastStore';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { DrumKit } from './DrumKit';
import { SkillOrb } from './SkillOrb';
import { isDebugEntrance, exposeTestGlobal } from '../lib/testHooks';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// TurtleRoom — THE JUMPING TURTLE, the defunct all-ages pub / music venue off
// North Park (San Marcos; Luke played here a lot in high school — the reference
// is real urbex footage of the real dead room). Abandoned-venue register, done
// WARM: the lights are cut and the fog sits close, but everything you find is a
// memory, not a menace —
//
//  · the little STAGE at the -X end under the leaping-turtle sign, the venue's
//    name still legible; the drum kit is still up there and STILL PLAYS (the
//    shipped DrumKit, reused — the music ladder reaching back to the first rooms
//    he ever played);
//  · the MIC STAND out front where the stage crowd stood: step up to it and the
//    room remembers — a soft ghost-cheer, and (first time, durably) +2 LUCK
//    ("play the Turtle one more time", the pause-menu objective);
//  · a BROKEN CRT on a desk — click it: it buzzes, flickers a dead gray flash
//    that never becomes a picture, and gives up. The one TV in the world that
//    doesn't play (every other CRT is a music-video jukebox; this one is over);
//  · flyer-crusted doors, dead amp stacks, a dusty bar, the loft, the debris.
//
// A musicRoom: the carried song steps out and the GHOST SOUNDCHECK owns the
// space — a mains hum, a far-off thump like someone checking a kick drum two
// decades away, a rare feedback sigh. All quiet, mute-aware, limited.
// ───────────────────────────────────────────────────────────────────────────

/** A little leaping low-poly turtle, mounted mid-jump over the stage sign. */
function LeapingTurtle({ position }: { position: [number, number, number] }) {
  const shellMat = useMemo(() => flatMat('#3f6b46'), []);
  const shellRimMat = useMemo(() => flatMat('#2f5236'), []);
  const skinMat = useMemo(() => flatMat('#7ba05f'), []);
  useDispose(shellMat, shellRimMat, skinMat);
  return (
    <group position={position} rotation={[0, 0.3, 0.5]}>
      {/* shell + rim */}
      <mesh material={shellMat} scale={[1, 0.55, 1.15]}>
        <sphereGeometry args={[0.55, 8, 6]} />
      </mesh>
      <mesh material={shellRimMat} position={[0, -0.12, 0]} scale={[1.08, 0.28, 1.22]}>
        <sphereGeometry args={[0.55, 8, 6]} />
      </mesh>
      {/* head, out and UP (he's jumping) */}
      <mesh material={skinMat} position={[0, 0.22, 0.62]}>
        <sphereGeometry args={[0.22, 7, 6]} />
      </mesh>
      {/* flippers flung wide */}
      {(
        [
          [-0.55, 0.05, 0.35, 0.7],
          [0.55, 0.05, 0.35, -0.7],
          [-0.5, -0.05, -0.45, 2.4],
          [0.5, -0.05, -0.45, -2.4],
        ] as const
      ).map(([x, y, z, r], i) => (
        <mesh key={i} material={skinMat} position={[x, y, z]} rotation={[0, r, 0]}>
          <boxGeometry args={[0.42, 0.1, 0.2]} />
        </mesh>
      ))}
    </group>
  );
}

/** A dead amp stack — head + cab with a darker grille face. */
function AmpStack({
  position,
  rotationY = 0,
  boxMat,
  grilleMat,
}: {
  position: [number, number, number];
  rotationY?: number;
  boxMat: THREE.Material;
  grilleMat: THREE.Material;
}) {
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh material={boxMat} position={[0, 0.55, 0]}>
        <boxGeometry args={[1.1, 1.1, 0.7]} />
      </mesh>
      <mesh material={grilleMat} position={[0, 0.5, 0.36]}>
        <planeGeometry args={[0.9, 0.85]} />
      </mesh>
      <mesh material={boxMat} position={[0, 1.35, 0]}>
        <boxGeometry args={[1.0, 0.5, 0.6]} />
      </mesh>
    </group>
  );
}

export function TurtleRoom({ room }: { room: Room }) {
  const { camera } = useThree();
  const fog = fogFor(room);
  const W = room.dims.halfW;
  const D = room.dims.halfD;

  // Worn floorboards (affine, so the old floor swims underfoot).
  const floorTex = useMemo(() => {
    const t = makeSpeckTexture('#4a3a2c', '#3a2d22');
    t.repeat.set(8, 8);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 9, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  // Unlit walls (like the Grassrooms' bones): single planes seen from inside,
  // so DoubleSide basic — the old green paint holding its color in the dark.
  const wallMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#26372b', side: THREE.DoubleSide }),
    [],
  );
  const wallDarkMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#1b2a20', side: THREE.DoubleSide }),
    [],
  );
  const woodMat = useMemo(() => flatMat('#6b4a2f'), []); // bar + stage lumber
  const woodDarkMat = useMemo(() => flatMat('#503623'), []);
  const boxMat = useMemo(() => flatMat('#171d18'), []); // amps / PA
  const grilleMat = useMemo(() => flatMat('#0d110e'), []);
  const metalMat = useMemo(() => flatMat('#8d938c'), []); // mic stand / rails
  const paperMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#cfc8b4' }), []);
  const signTex = useMemo(
    () =>
      makeTextTexture('THE JUMPING TURTLE', {
        fg: '#cfe6a8',
        bg: '#15251a',
        w: 512,
        h: 96,
      }),
    [],
  );
  const signMat = useMemo(() => new THREE.MeshBasicMaterial({ map: signTex }), [signTex]);
  const crackTex = useMemo(() => {
    // the broken CRT's face: dead gray glass with a spidered crack
    const s = 64;
    const c = document.createElement('canvas');
    c.width = c.height = s;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#5a615e';
      ctx.fillRect(0, 0, s, s);
      ctx.strokeStyle = '#202623';
      ctx.lineWidth = 1.6;
      const cx = s * 0.42;
      const cy = s * 0.4;
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(
          cx + Math.cos(a) * (14 + (i % 3) * 9),
          cy + Math.sin(a) * (14 + ((i + 1) % 3) * 9),
        );
        ctx.stroke();
      }
      ctx.fillStyle = '#202623';
      ctx.beginPath();
      ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    return t;
  }, []);
  const crackMat = useMemo(() => new THREE.MeshBasicMaterial({ map: crackTex }), [crackTex]);
  useDispose(floorTex, wallMat, wallDarkMat, woodMat, woodDarkMat, boxMat, grilleMat);
  useDispose(metalMat, paperMat, signTex, signMat, crackTex, crackMat);

  // Flyers crusting the +X entry wall + debris papers on the floor (seeded).
  const flyers = useMemo(() => {
    const rnd = seededRandom(5079);
    return Array.from({ length: 26 }, () => ({
      y: 1.1 + rnd() * 2.6,
      z: -3.4 + rnd() * 6.8,
      w: 0.35 + rnd() * 0.3,
      h: 0.45 + rnd() * 0.35,
      r: (rnd() - 0.5) * 0.35,
      tone: rnd(),
    }));
  }, []);
  const debris = useMemo(() => {
    const rnd = seededRandom(5075);
    return Array.from({ length: 22 }, () => ({
      x: (rnd() - 0.5) * (W - 1.5) * 2,
      z: (rnd() - 0.5) * (D - 1.5) * 2,
      s: 0.25 + rnd() * 0.3,
      r: rnd() * Math.PI,
    }));
  }, [W, D]);
  const flyerMats = useMemo(
    () => [
      new THREE.MeshBasicMaterial({ color: '#d8d2bf' }),
      new THREE.MeshBasicMaterial({ color: '#c9bfa5' }),
      new THREE.MeshBasicMaterial({ color: '#c4a9a2' }),
    ],
    [],
  );
  useDispose(...flyerMats);

  // The DOUBLE-JUMP upgrade is EARNED here, not granted on entry: a skill orb up
  // on the stage (see the render below) that you climb up to and grab — the
  // Jumping Turtle teaching you to jump *again*, in mid-air. "Ooo, a skill."

  // ── the mic-stand memory beat: step up to it → the room remembers you.
  // Once per visit; the FIRST time ever banks the durable objective + luck.
  const MIC: [number, number] = [-4.6, 0];
  const cheered = useRef(false);
  const ghostCheer = () => {
    if (cheered.current) return;
    cheered.current = true;
    audio.unlock();
    // a soft swell out of the dark: a low room bloom, then a raked chord — the
    // ghost of an all-ages Friday, gone in three seconds (never a spike).
    audio.playColony(noteToFreq('A', 2), 0, 0.06);
    ['C', 'E', 'G', 'C'].forEach((n, i) =>
      window.setTimeout(
        () => audio.playChime(noteToFreq(n, i === 3 ? 5 : 4), (i - 1.5) * 0.4, 0.09, 1.8),
        260 + i * 140,
      ),
    );
    const prog = useProgressStore.getState();
    if (!prog.secretsFound.includes('turtle-stage')) {
      prog.findSecret('turtle-stage');
      prog.gainLuck(2);
      announce('the room remembers — +2 LUCK', 'luck');
    } else {
      announce('the room remembers', 'info');
    }
    exposeTestGlobal('__sdpTurtle', { cheered: true });
  };

  // ── the broken CRT: click → buzz + a gray flicker that never becomes a
  // picture. flicker state drives a brief emissive pulse (WCAG-tame: one soft
  // sub-flash well under the 3/sec line, low contrast).
  const [flicker, setFlicker] = useState(0);
  const pokeCrt = () => {
    audio.unlock();
    // a dead mains buzz, pitch sagging — the set trying and failing
    audio.playChime(noteToFreq('A', 1), -0.2, 0.12, 0.35);
    window.setTimeout(() => audio.playChime(noteToFreq('G', 1), -0.2, 0.08, 0.5), 140);
    setFlicker((f) => f + 1);
    exposeTestGlobal('__sdpCrtPokes', pokes.current + 1);
    pokes.current += 1;
  };
  const pokes = useRef(0);
  const glassRef = useRef<THREE.MeshBasicMaterial>(null);
  const flickerT = useRef(1);
  useEffect(() => {
    if (flicker > 0) flickerT.current = 0;
  }, [flicker]);

  useEffect(() => {
    if (isDebugEntrance()) {
      exposeTestGlobal('__sdpPokeCrt', pokeCrt);
      exposeTestGlobal('__sdpGhostCheer', ghostCheer);
    }
    return () => {
      exposeTestGlobal('__sdpPokeCrt', undefined);
      exposeTestGlobal('__sdpGhostCheer', undefined);
      exposeTestGlobal('__sdpTurtle', undefined);
      exposeTestGlobal('__sdpCrtPokes', undefined);
    };
  }, []);

  // ── the ghost soundcheck + the proximity checks ──────────────────────────
  const hum = useRef(1.2);
  const thump = useRef(6.0);
  const sigh = useRef(14.0);
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    // the CRT's one soft gray pulse (fades over ~0.5s; no strobe)
    if (flickerT.current < 1 && glassRef.current) {
      flickerT.current = Math.min(1, flickerT.current + dt * 2);
      const a = Math.sin(Math.min(1, flickerT.current) * Math.PI);
      glassRef.current.color.setScalar(0.35 + a * 0.25);
    }
    const sc = useSceneStore.getState();
    if (sc.paused || sc.transitioning) return;
    // the mic: within arm's reach → the room remembers (once a visit)
    if (!cheered.current) {
      const dx = camera.position.x - MIC[0];
      const dz = camera.position.z - MIC[1];
      if (dx * dx + dz * dz < 1.8 * 1.8) ghostCheer();
    }
    hum.current -= dt;
    if (hum.current <= 0) {
      audio.playColony(noteToFreq('A', 1), -0.1, 0.045); // the mains hum
      hum.current = 6 + Math.random() * 3;
    }
    thump.current -= dt;
    if (thump.current <= 0) {
      // someone checking a kick drum, twenty years away
      audio.playChime(noteToFreq('C', 2), (Math.random() - 0.5) * 0.8, 0.08, 0.22);
      window.setTimeout(() => audio.playChime(noteToFreq('C', 2), 0, 0.05, 0.22), 190);
      thump.current = 9 + Math.random() * 7;
    }
    sigh.current -= dt;
    if (sigh.current <= 0) {
      audio.playColony(noteToFreq('E', 5), 0.5, 0.02); // a feedback sigh, far right
      sigh.current = 18 + Math.random() * 12;
    }
  });

  return (
    <group>
      {/* lights long cut: a cold dim wash + one warm dying glow over the bar +
          a pale shaft where the roof's given way over the stage */}
      <ambientLight intensity={0.3} color="#41504a" />
      <directionalLight position={[-4, 8, 2]} intensity={0.35} color="#9fb4be" />
      <pointLight position={[2, 3.2, 7]} intensity={0.5} distance={9} color="#e8b46a" />
      <pointLight position={[-6.5, 5, 0]} intensity={0.6} distance={12} color="#aebfc6" />

      {/* floor + walls + ceiling */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2}>
        <planeGeometry args={[W * 2 + 8, D * 2 + 8]} />
      </mesh>
      {(
        [
          [0, -D, W * 2, 0],
          [0, D, W * 2, 0],
          [-W, 0, D * 2, Math.PI / 2],
          [W, 0, D * 2, Math.PI / 2],
        ] as const
      ).map(([x, z, len, r], i) => (
        <mesh
          key={i}
          material={i % 2 ? wallMat : wallDarkMat}
          position={[x, 3.5, z]}
          rotation={[0, r, 0]}
        >
          <planeGeometry args={[len, 7]} />
        </mesh>
      ))}
      <mesh material={wallDarkMat} position={[0, 7, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[W * 2 + 2, D * 2 + 2]} />
      </mesh>

      {/* ── the stage end (-X): riser, PA stacks, the sign, the turtle ────── */}
      <group position={[-W + 1.6, 0, 0]}>
        {/* the riser */}
        <mesh material={woodDarkMat} position={[0, 0.25, 0]}>
          <boxGeometry args={[3.2, 0.5, 7.5]} />
        </mesh>
        {/* the kit is still up there — and it still plays (shipped DrumKit) */}
        <DrumKit position={[0.2, 0.5, -1.6]} rotationY={Math.PI / 2 - 0.2} />
        {/* PA stacks flanking the stage */}
        <AmpStack
          position={[0.2, 0.5, 3.2]}
          rotationY={Math.PI / 2 + 0.15}
          boxMat={boxMat}
          grilleMat={grilleMat}
        />
        <AmpStack
          position={[0.2, 0.5, -3.3]}
          rotationY={Math.PI / 2 - 0.15}
          boxMat={boxMat}
          grilleMat={grilleMat}
        />
        {/* the name over the stage, and the turtle mid-leap above it */}
        <mesh material={signMat} position={[-1.35, 4.4, 0]} rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[6.4, 1.2]} />
        </mesh>
        <LeapingTurtle position={[-1.1, 5.6, 0]} />
      </group>

      {/* the DOUBLE-JUMP upgrade, floating over the stage lip: walk up onto the
          riser past the mic and grab it — the Jumping Turtle's whole reason for
          being, earned, not handed to you at the door */}
      <SkillOrb ability="doublejump" position={[-6.0, 1.7, 0]} />

      {/* the mic stand out front, where you step up (the memory trigger) */}
      <group position={[MIC[0], 0, MIC[1]]}>
        <mesh material={metalMat} position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.3, 0.36, 0.06, 8]} />
        </mesh>
        <mesh material={metalMat} position={[0, 0.8, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 1.6, 5]} />
        </mesh>
        <mesh material={metalMat} position={[0.12, 1.66, 0]} rotation={[0, 0, -0.5]}>
          <cylinderGeometry args={[0.025, 0.025, 0.5, 5]} />
        </mesh>
        <mesh material={boxMat} position={[0.24, 1.78, 0]}>
          <sphereGeometry args={[0.07, 6, 5]} />
        </mesh>
      </group>

      {/* a spare amp + a monitor wedge left mid-load-out ("random concert gear") */}
      <AmpStack position={[-1.5, 0, -6.8]} rotationY={0.4} boxMat={boxMat} grilleMat={grilleMat} />
      <mesh material={boxMat} position={[-3.2, 0.28, 4.6]} rotation={[0.5, 0.7, 0]}>
        <boxGeometry args={[1.0, 0.55, 0.7]} />
      </mesh>

      {/* ── the bar along +Z, bottles going dusty ─────────────────────────── */}
      <group position={[2.5, 0, D - 1.6]}>
        <mesh material={woodMat} position={[0, 0.6, 0]}>
          <boxGeometry args={[7.5, 1.2, 1.1]} />
        </mesh>
        <mesh material={woodDarkMat} position={[0, 1.24, 0]}>
          <boxGeometry args={[7.9, 0.08, 1.3]} />
        </mesh>
        {[-2.8, -1.3, 0.4, 1.9, 3.1].map((x, i) => (
          <mesh key={i} material={i % 2 ? wallMat : boxMat} position={[x, 1.48, 0.1]}>
            <cylinderGeometry args={[0.07, 0.09, 0.4, 6]} />
          </mesh>
        ))}
      </group>

      {/* ── the broken CRT on its desk (the one set that never turns on) ──── */}
      <group position={[1.8, 0, -D + 1.5]} rotation-y={-0.35}>
        <mesh material={woodMat} position={[0, 0.55, 0]}>
          <boxGeometry args={[1.5, 1.1, 0.9]} />
        </mesh>
        <mesh material={paperMat} position={[0, 1.45, 0]}>
          <boxGeometry args={[1.1, 0.85, 0.8]} />
        </mesh>
        <mesh material={crackMat} position={[0, 1.45, 0.41]}>
          <planeGeometry args={[0.85, 0.62]} />
        </mesh>
        {/* the flicker pane — a faint gray sheet that pulses ONCE per poke */}
        <mesh position={[0, 1.45, 0.42]}>
          <planeGeometry args={[0.85, 0.62]} />
          <meshBasicMaterial ref={glassRef} transparent opacity={0.35} color="#595f5c" />
        </mesh>
        {/* generous click target */}
        <mesh
          position={[0, 1.4, 0.1]}
          visible={false}
          onClick={(e) => {
            e.stopPropagation();
            pokeCrt();
          }}
        >
          <boxGeometry args={[1.6, 1.6, 1.4]} />
        </mesh>
      </group>

      {/* ── the loft over the entry (+X), junk still up there ─────────────── */}
      <group position={[W - 1.8, 0, -5]}>
        <mesh material={woodDarkMat} position={[0, 3.4, 0]}>
          <boxGeometry args={[3.4, 0.18, 6.5]} />
        </mesh>
        <mesh material={metalMat} position={[-1.7, 4.0, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.06, 1.0, 6.5]} />
        </mesh>
        {[
          [-0.4, 3.9, -1.2],
          [0.6, 3.8, 0.8],
          [-0.2, 3.8, 2.2],
        ].map(([x, y, z], i) => (
          <mesh
            key={i}
            material={i % 2 ? boxMat : woodMat}
            position={[x, y, z]}
            rotation={[0, i, 0]}
          >
            <boxGeometry args={[0.8, 0.7, 0.8]} />
          </mesh>
        ))}
      </group>

      {/* flyers crusting the wall around the way out (+X) */}
      {flyers.map((f, i) => (
        <mesh
          key={i}
          material={flyerMats[Math.floor(f.tone * flyerMats.length)]}
          position={[W - 0.05, f.y, f.z]}
          rotation={[0, -Math.PI / 2, f.r]}
        >
          <planeGeometry args={[f.w, f.h]} />
        </mesh>
      ))}
      {/* debris drifting the floorboards */}
      {debris.map((d, i) => (
        <mesh
          key={i}
          material={paperMat}
          position={[d.x, 0.02, d.z]}
          rotation={[-Math.PI / 2, 0, d.r]}
        >
          <planeGeometry args={[d.s, d.s * 1.4]} />
        </mesh>
      ))}
    </group>
  );
}
