import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import {
  flatMat,
  makeAffineTexturedMaterial,
  makeBilingualSign,
  makeSpeckTexture,
  makeTextTexture,
  nearestify,
  seededRandom,
} from './ps1';
import { useDispose } from '../lib/useDispose';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// WaitingRoomRoom — "The Waiting Room" (待合室). A liminal municipal lobby found
// through a door in the drained deep end: an over-lit, pale-institutional box of
// bolted-down chairs facing a shuttered reception window, a dead CRT hissing dim
// static in the corner, a NOW SERVING sign stuck on 404 (your number never comes),
// all under a flickering drop-ceiling. Funny-UNCANNY, never a scare (the dread is
// the endless wait; the taste line holds) — an atmospheric dead-end you FIND off
// the descent, its only warm light the red EXIT sign that marks the way back.
//
// Original-parody PS1 geometry (procedural boxes + baked NearestFilter signs); the
// affine-swim vinyl floor and the global low-res/dither give the crunch. The one
// flicker is a slow, bounded fluorescent stutter — never a strobe (WCAG 2.3.1),
// and held steady for a reduced-motion viewer.
// ───────────────────────────────────────────────────────────────────────────

// A connected row of molded-plastic seats (seat slab + back + a frame with dividers
// so it reads as N bolted-together chairs). The waiting-room staple.
function Bench({
  position,
  rotationY = 0,
  seats = 5,
  width = 7,
  plastic,
  frame,
}: {
  position: [number, number, number];
  rotationY?: number;
  seats?: number;
  width?: number;
  plastic: THREE.Material;
  frame: THREE.Material;
}) {
  const seatY = 0.46;
  const seatD = 0.52;
  const backH = 0.55;
  const dividers = Array.from({ length: seats + 1 }, (_, i) => -width / 2 + (i * width) / seats);
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh material={plastic} position={[0, seatY, 0]}>
        <boxGeometry args={[width, 0.09, seatD]} />
      </mesh>
      <mesh material={plastic} position={[0, seatY + backH / 2 + 0.05, -seatD / 2 + 0.03]}>
        <boxGeometry args={[width, backH, 0.08]} />
      </mesh>
      <mesh material={frame} position={[0, 0.2, seatD / 2 - 0.05]}>
        <boxGeometry args={[width, 0.06, 0.06]} />
      </mesh>
      {[-width / 2 + 0.2, width / 2 - 0.2].map((x, i) => (
        <mesh key={i} material={frame} position={[x, 0.2, 0]}>
          <boxGeometry args={[0.08, 0.4, seatD]} />
        </mesh>
      ))}
      {dividers.map((x, i) => (
        <mesh key={`d${i}`} material={frame} position={[x, seatY + 0.02, 0]}>
          <boxGeometry args={[0.04, 0.12, seatD]} />
        </mesh>
      ))}
    </group>
  );
}

// Pale two-tone lobby wall: institutional cream up top, a wainscot band below a
// chair rail, a dark baseboard, and a couple of faint scuffs. Bands only (no
// horizontal detail), so it maps once per wall regardless of width — no seams.
function makeLobbyWallTexture(): THREE.Texture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#c9cbb6'; // upper wall
    ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = '#8b8d74'; // wainscot
    ctx.fillRect(0, 82, s, s - 82);
    ctx.fillStyle = '#6f7159'; // chair rail
    ctx.fillRect(0, 78, s, 4);
    ctx.fillStyle = '#4c4e3d'; // baseboard
    ctx.fillRect(0, s - 6, s, 6);
    ctx.fillStyle = 'rgba(70,72,58,0.25)'; // faint scuffs
    ctx.fillRect(34, 92, 2, 22);
    ctx.fillRect(96, 100, 2, 16);
  }
  return nearestify(new THREE.CanvasTexture(c));
}

// Dim grayscale static for the dead CRT — seeded (stable screenshots), kept dark
// so the set never actually "turns on" (a dead TV, not a working one).
function makeStaticTexture(): THREE.Texture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (ctx) {
    const rnd = seededRandom(0x51a71c);
    const img = ctx.createImageData(s, s);
    for (let i = 0; i < s * s; i++) {
      const v = 26 + Math.floor(rnd() * 60); // dim: dead-TV snow, never bright
      img.data[i * 4] = v;
      img.data[i * 4 + 1] = v;
      img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  }
  return nearestify(new THREE.CanvasTexture(c));
}

export function WaitingRoomRoom({ room }: { room: Room }) {
  const H = room.dims.height;

  // Reduced-motion viewers (who opted into the world) get a STEADY light — the
  // flicker is the one moving thing here, so hold it still for them (WCAG-safe).
  const reduceMotion = useMemo(
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches,
    [],
  );

  // ── textures ──────────────────────────────────────────────────────────────
  const vinylTex = useMemo(() => makeSpeckTexture('#9a9c86', '#83856f'), []);
  const wallTex = useMemo(() => makeLobbyWallTexture(), []);
  const staticTex = useMemo(() => makeStaticTexture(), []);
  const bilingualTex = useMemo(
    () =>
      makeBilingualSign('待合室', 'THE WAITING ROOM', {
        bg: '#d7d8c6',
        accent: '#9a9c80',
        jpColor: '#3a3c2c',
        enColor: '#5a5c46',
      }),
    [],
  );
  // Sign atlases stay within the PS1 hard cap (≤128px, NearestFilter): the mesh
  // planes carry the on-screen size, so the text just reads blockier (more PS1).
  const exitTex = useMemo(
    () => makeTextTexture('EXIT', { fg: '#f6f7ef', bg: '#b81f16', w: 128, h: 64 }),
    [],
  );
  const nowServingTex = useMemo(
    () => makeTextTexture('NOW SERVING\n404', { fg: '#ff5a3c', bg: '#141410', w: 128, h: 128 }),
    [],
  );
  const ticketTex = useMemo(
    () => makeTextTexture('A-899', { fg: '#2b2c24', bg: '#eceadd', w: 128, h: 96 }),
    [],
  );

  // ── materials ─────────────────────────────────────────────────────────────
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(vinylTex, 9, fogFor(room)),
    [vinylTex, room],
  );
  const ceilMat = useMemo(() => flatMat('#c4c6b4', { side: THREE.DoubleSide }), []);
  const wallMat = useMemo(
    () => flatMat('#ffffff', { map: wallTex, side: THREE.DoubleSide }),
    [wallTex],
  );
  const plasticMat = useMemo(() => flatMat('#3f6f78'), []);
  const frameMat = useMemo(() => flatMat('#6b7075'), []);
  const counterMat = useMemo(() => flatMat('#a39d88'), []);
  const counterFrontMat = useMemo(() => flatMat('#7c7768'), []);
  const darkMat = useMemo(() => flatMat('#26271f'), []);
  const potMat = useMemo(() => flatMat('#8a5a3c'), []);
  const leafMat = useMemo(() => flatMat('#4a6f3a', { side: THREE.DoubleSide }), []);
  const clockFaceMat = useMemo(() => flatMat('#e8e9de'), []);
  const clockHandMat = useMemo(() => flatMat('#2b2c24'), []);
  const redPostMat = useMemo(() => flatMat('#a83226'), []);

  // Self-lit (unlit) materials — signs + the fluorescent panels read as glowing
  // against the flat-lit room, no PBR.
  const panelMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f2f4e6' }), []);
  const panelFlickerMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#f2f4e6' }), []);
  const staticMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: staticTex, toneMapped: false }),
    [staticTex],
  );
  const bilingualMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: bilingualTex }),
    [bilingualTex],
  );
  const exitMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: exitTex, transparent: true }),
    [exitTex],
  );
  const nowServingMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: nowServingTex }),
    [nowServingTex],
  );
  const ticketMat = useMemo(() => new THREE.MeshBasicMaterial({ map: ticketTex }), [ticketTex]);

  useDispose(
    vinylTex,
    wallTex,
    staticTex,
    bilingualTex,
    exitTex,
    nowServingTex,
    ticketTex,
    floorMat,
    ceilMat,
    wallMat,
    plasticMat,
    frameMat,
    counterMat,
    counterFrontMat,
    darkMat,
    potMat,
    leafMat,
    clockFaceMat,
    clockHandMat,
    redPostMat,
    panelMat,
    panelFlickerMat,
    staticMat,
    bilingualMat,
    exitMat,
    nowServingMat,
    ticketMat,
  );

  // The one flickering panel — a slow, bounded fluorescent stutter. Frequencies are
  // well under 3 Hz and it never reaches black or full-bright, so it reads as a
  // failing tube, not a strobe (WCAG 2.3.1). Held perfectly steady under reduced
  // motion (the only moving element in the room).
  useFrame((state) => {
    if (reduceMotion) return;
    const t = state.clock.elapsedTime;
    const k = 0.8 + 0.12 * Math.sin(t * 1.7) - 0.14 * Math.pow(Math.max(0, Math.sin(t * 0.9)), 12);
    panelFlickerMat.color.setScalar(k);
  });

  // Ceiling fluorescent panels (one of them the flickering tube).
  const panels: { pos: [number, number, number]; flicker?: boolean }[] = [
    { pos: [-3.6, H - 0.02, -2] },
    { pos: [3.6, H - 0.02, -2], flicker: true },
    { pos: [-3.6, H - 0.02, 2.4] },
    { pos: [3.6, H - 0.02, 2.4] },
  ];

  return (
    <group>
      {/* Over-lit, flat, faintly green fluorescent wash — liminal is BRIGHT + empty,
          not dark (the poolrooms grammar). */}
      <ambientLight intensity={0.82} color="#eef0e2" />
      <hemisphereLight args={['#f2f4e8', '#9a9c86', 0.5]} />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* the drop-ceiling fluorescent panels */}
      {panels.map((p, i) => (
        <mesh
          key={i}
          material={p.flicker ? panelFlickerMat : panelMat}
          rotation-x={Math.PI / 2}
          position={p.pos}
        >
          <planeGeometry args={[2.6, 1.4]} />
        </mesh>
      ))}

      {/* rows of bolted seats, facing the reception window (empty chair-backs
          receding is the whole liminal picture) */}
      <Bench position={[0, 0, 0.4]} seats={5} width={7.4} plastic={plasticMat} frame={frameMat} />
      <Bench position={[0, 0, -2]} seats={5} width={7.4} plastic={plasticMat} frame={frameMat} />
      {/* a short side bench against the -X wall, in profile */}
      <Bench
        position={[-7.2, 0, 2]}
        rotationY={Math.PI / 2}
        seats={3}
        width={4}
        plastic={plasticMat}
        frame={frameMat}
      />

      {/* ── the reception window (shuttered) on the far -Z wall ── */}
      {/* counter */}
      <mesh material={counterMat} position={[0, 0.56, -5.85]}>
        <boxGeometry args={[5, 1.12, 0.7]} />
      </mesh>
      <mesh material={counterFrontMat} position={[0, 0.5, -5.5]}>
        <boxGeometry args={[5.02, 1, 0.04]} />
      </mesh>
      {/* the dark recessed window opening above it */}
      <mesh material={darkMat} position={[0, 1.9, -6.42]}>
        <planeGeometry args={[3.8, 1.15]} />
      </mesh>
      {/* the bilingual plaque high over the reception, facing +Z into the room */}
      <mesh material={bilingualMat} position={[0, 2.92, -6.42]}>
        <planeGeometry args={[3.4, 1.02]} />
      </mesh>

      {/* the hanging NOW SERVING 404 sign near the queue (self-lit, angled in) */}
      <mesh material={nowServingMat} position={[3.5, 2.7, -5.2]} rotation-y={0.5}>
        <planeGeometry args={[1.7, 0.85]} />
      </mesh>

      {/* the dead CRT bracketed high in the +X far corner, angled down */}
      <group position={[6.7, 2.6, -5]} rotation-y={0.55}>
        <mesh material={darkMat}>
          <boxGeometry args={[1.5, 1.15, 1.1]} />
        </mesh>
        <mesh material={staticMat} position={[0, 0.02, 0.56]}>
          <planeGeometry args={[1.18, 0.86]} />
        </mesh>
      </group>

      {/* a plastic corner plant (pot + a few crossed fronds) in the -X far corner */}
      <group position={[-6.9, 0, -5.4]}>
        <mesh material={potMat} position={[0, 0.3, 0]}>
          <cylinderGeometry args={[0.34, 0.28, 0.6, 8]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh material={leafMat} key={i} position={[0, 1.1, 0]} rotation-y={(i * Math.PI) / 4}>
            <planeGeometry args={[0.3, 1.4]} />
          </mesh>
        ))}
      </group>

      {/* a plain STOPPED wall clock on the -X wall (the un-zazzy one) */}
      <group position={[-7.86, 2.35, -1]} rotation-y={Math.PI / 2}>
        <mesh material={clockFaceMat}>
          <circleGeometry args={[0.42, 20]} />
        </mesh>
        {/* hands frozen at 4:37 — no useFrame, so it never moves */}
        <mesh material={clockHandMat} position={[0, 0.08, 0.02]}>
          <boxGeometry args={[0.05, 0.26, 0.02]} />
        </mesh>
        <mesh material={clockHandMat} position={[0.12, -0.02, 0.02]} rotation-z={-1.1}>
          <boxGeometry args={[0.34, 0.045, 0.02]} />
        </mesh>
      </group>

      {/* a take-a-number dispenser by the entrance — pull A-899, now serving 404 */}
      <group position={[5, 0, 3.4]}>
        <mesh material={redPostMat} position={[0, 0.62, 0]}>
          <boxGeometry args={[0.34, 1.24, 0.22]} />
        </mesh>
        <mesh material={ticketMat} position={[0, 0.98, 0.13]}>
          <planeGeometry args={[0.26, 0.2]} />
        </mesh>
      </group>

      {/* the red EXIT sign over the return door (+Z wall) — the one warm light,
          and the way back. Faces -Z into the room. */}
      <mesh material={exitMat} position={[0, 3.02, 6.28]} rotation-y={Math.PI}>
        <planeGeometry args={[1.5, 0.62]} />
      </mesh>
    </group>
  );
}
