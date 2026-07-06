import { useMemo } from 'react';
import * as THREE from 'three';
import { RoomBox } from './RoomBox';
import {
  flatMat,
  makeAffineTexturedMaterial,
  makeTextTexture,
  nearestify,
  seededRandom,
} from './ps1';
import { useDispose } from '../lib/useDispose';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// BarRoom — "Doobert's" (a warm PS1 dive bar). The last lit place at the dark far
// end of the empty Main Street: a long bar under a bottle-wall backbar and a dead
// MIRROR that reflects nothing (PS1 has no reflections — the whole gag), buzzing
// pink DOOBERT'S neon, red-vinyl stools, a string of warm bulbs, a dartboard, and
// a hardcover of RAY TRACING propped among the liquor (deadpan: aspirational, in a
// room that categorically cannot ray-trace). A cozy-WARM relief beat off the eerie
// street — never a scare (the taste line holds). Original-parody PS1 geometry:
// procedural boxes + baked NearestFilter signs + an affine-swim plank floor.
// ───────────────────────────────────────────────────────────────────────────

// A bar stool: a red-vinyl seat on a chrome post + a foot ring.
function Stool({
  position,
  seat,
  metal,
}: {
  position: [number, number, number];
  seat: THREE.Material;
  metal: THREE.Material;
}) {
  return (
    <group position={position}>
      <mesh material={seat} position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 12]} />
      </mesh>
      <mesh material={metal} position={[0, 0.55, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.9, 8]} />
      </mesh>
      <mesh material={metal} position={[0, 0.4, 0]}>
        <torusGeometry args={[0.22, 0.03, 6, 14]} />
      </mesh>
      <mesh material={metal} position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.05, 12]} />
      </mesh>
    </group>
  );
}

// Dark wood planks for the floor — horizontal boards + a little grain, tiled.
function makeBarFloorTexture(): THREE.Texture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#2e1c10';
    ctx.fillRect(0, 0, s, s);
    const shades = ['#33200f', '#2a1a0e', '#382412', '#281808', '#301e10'];
    const ph = s / shades.length;
    shades.forEach((col, i) => {
      ctx.fillStyle = col;
      ctx.fillRect(0, i * ph, s, ph - 2);
    });
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let i = 0; i < 44; i++) ctx.fillRect((i * 53) % s, (i * 37) % s, 6, 1);
  }
  return nearestify(new THREE.CanvasTexture(c), { repeat: true });
}

// A concentric dartboard for the wall.
function makeDartboardTexture(): THREE.Texture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0d0d0d';
    ctx.fillRect(0, 0, s, s);
    const rings: [number, string][] = [
      [30, '#e8e0c8'],
      [24, '#2a2a2a'],
      [18, '#c03028'],
      [12, '#2a2a2a'],
      [7, '#3f8f4a'],
      [3, '#c03028'],
    ];
    for (const [r, col] of rings) {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(s / 2, s / 2, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return nearestify(new THREE.CanvasTexture(c));
}

export function BarRoom({ room }: { room: Room }) {
  // ── textures ──────────────────────────────────────────────────────────────
  const floorTex = useMemo(() => makeBarFloorTexture(), []);
  const dartTex = useMemo(() => makeDartboardTexture(), []);
  // Sign atlases stay within the PS1 hard cap (≤128px, NearestFilter) — the mesh
  // planes carry the on-screen size, so the neon just reads blockier (more PS1).
  const neonTex = useMemo(
    () => makeTextTexture("DOOBERT'S", { fg: '#ff56a8', bg: 'transparent', w: 128, h: 64 }),
    [],
  );
  const beerNeonTex = useMemo(
    () => makeTextTexture('AFFINE\nALE', { fg: '#5fe6ff', bg: 'transparent', w: 128, h: 128 }),
    [],
  );
  const bookTex = useMemo(
    () => makeTextTexture('RAY\nTRACING', { fg: '#f0d27a', bg: '#4a1712', w: 96, h: 128 }),
    [],
  );

  // ── materials ─────────────────────────────────────────────────────────────
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 7, fogFor(room)),
    [floorTex, room],
  );
  const wallMat = useMemo(() => flatMat('#2a1810', { side: THREE.DoubleSide }), []);
  const ceilMat = useMemo(() => flatMat('#180f0a', { side: THREE.DoubleSide }), []);
  const barTopMat = useMemo(() => flatMat('#5a3820'), []);
  const barFrontMat = useMemo(() => flatMat('#38220f'), []);
  const shelfMat = useMemo(() => flatMat('#2e1c10'), []);
  const seatMat = useMemo(() => flatMat('#7a2420'), []);
  const metalMat = useMemo(() => flatMat('#6a6e72'), []);
  const bookMat = useMemo(() => flatMat('#4a1712'), []);

  // A few bottle glazes, chosen deterministically per slot (stable screenshots).
  const bottleMats = useMemo(
    () => [
      flatMat('#c88a2a'), // amber
      flatMat('#3f6a3a'), // green
      flatMat('#c9cdc0'), // clear
      flatMat('#9a2a2a'), // red
      flatMat('#3a5a8a'), // blue
    ],
    [],
  );

  // Self-lit (unlit) — the dead mirror, the neon, the book spine, the warm bulbs.
  const mirrorMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#232a2e' }), []);
  const neonMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: neonTex, transparent: true }),
    [neonTex],
  );
  const beerNeonMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: beerNeonTex, transparent: true }),
    [beerNeonTex],
  );
  const dartMat = useMemo(() => new THREE.MeshBasicMaterial({ map: dartTex }), [dartTex]);
  const bookSpineMat = useMemo(() => new THREE.MeshBasicMaterial({ map: bookTex }), [bookTex]);
  const bulbMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffcf7a' }), []);
  const backlightMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#3a2412', transparent: true, opacity: 0.7 }),
    [],
  );

  useDispose(
    floorTex,
    dartTex,
    neonTex,
    beerNeonTex,
    bookTex,
    floorMat,
    wallMat,
    ceilMat,
    barTopMat,
    barFrontMat,
    shelfMat,
    seatMat,
    metalMat,
    bookMat,
    ...bottleMats,
    mirrorMat,
    neonMat,
    beerNeonMat,
    dartMat,
    bookSpineMat,
    bulbMat,
    backlightMat,
  );

  // The bottle wall — two shelves of varied bottles, seeded so shots are stable.
  const rnd = useMemo(() => seededRandom(0x0b17ee), []);
  const bottles = useMemo(() => {
    const out: { pos: [number, number, number]; h: number; r: number; mat: number }[] = [];
    for (const shelfY of [1.28, 1.94]) {
      for (let i = 0; i < 11; i++) {
        const x = -3 + i * 0.6;
        const h = 0.34 + rnd() * 0.28;
        out.push({
          pos: [x, shelfY + h / 2, -5.05],
          h,
          r: 0.07 + rnd() * 0.03,
          mat: Math.floor(rnd() * 5),
        });
      }
    }
    return out;
  }, [rnd]);

  // A string of warm bulbs swagged across the front of the room.
  const bulbs = Array.from({ length: 11 }, (_, i) => {
    const x = -5 + i;
    const sag = Math.sin((i / 10) * Math.PI) * 0.28; // gentle catenary
    return [x, 3.25 - sag, -1] as [number, number, number];
  });

  return (
    <group>
      {/* dim, warm dive light — pools of amber, most of the room in shadow. The
          neon + bottles + bulbs (self-lit) carry the glow. */}
      <ambientLight intensity={0.32} color="#4a3018" />
      <hemisphereLight args={['#5a3a20', '#140c06', 0.3]} />
      {/* one warm key over the bar so the bottle wall reads out of the dark */}
      <pointLight position={[0, 2.5, -3.4]} intensity={0.7} distance={13} color="#ffb060" />

      <RoomBox dims={room.dims} floor={floorMat} ceiling={ceilMat} sides={wallMat} />

      {/* ── the backbar on the -Z wall ── */}
      {/* the dead mirror (reflects nothing — the PS1/ray-tracing gag) */}
      <mesh material={mirrorMat} position={[0, 1.95, -5.42]}>
        <planeGeometry args={[6.4, 2.4]} />
      </mesh>
      {/* a warm backlight wash behind the bottles */}
      <mesh material={backlightMat} position={[0, 1.6, -5.35]}>
        <planeGeometry args={[6.2, 1.5]} />
      </mesh>
      {/* two shelves */}
      {[1.2, 1.86].map((y, i) => (
        <mesh key={i} material={shelfMat} position={[0, y, -5.02]}>
          <boxGeometry args={[6.4, 0.08, 0.42]} />
        </mesh>
      ))}
      {/* the bottles */}
      {bottles.map((b, i) => (
        <mesh key={i} material={bottleMats[b.mat]} position={b.pos}>
          <cylinderGeometry args={[b.r, b.r, b.h, 7]} />
        </mesh>
      ))}
      {/* the RAY TRACING hardcover, propped among the top-shelf liquor */}
      <group position={[2.3, 2.05, -4.95]} rotation-y={-0.3} rotation-z={0.12}>
        <mesh material={bookMat}>
          <boxGeometry args={[0.5, 0.66, 0.14]} />
        </mesh>
        <mesh material={bookSpineMat} position={[0, 0, 0.071]}>
          <planeGeometry args={[0.46, 0.62]} />
        </mesh>
      </group>
      {/* the pink DOOBERT'S neon over the backbar */}
      <mesh material={neonMat} position={[0, 2.85, -5.34]}>
        <planeGeometry args={[3.6, 1.0]} />
      </mesh>

      {/* ── the bar itself ── */}
      {/* front + top of the counter */}
      <mesh material={barFrontMat} position={[0, 0.52, -3.5]}>
        <boxGeometry args={[8.2, 1.04, 0.7]} />
      </mesh>
      <mesh material={barTopMat} position={[0, 1.07, -3.45]}>
        <boxGeometry args={[8.4, 0.1, 0.9]} />
      </mesh>
      {/* brass foot rail */}
      <mesh material={metalMat} position={[0, 0.16, -2.95]}>
        <boxGeometry args={[8.2, 0.05, 0.05]} />
      </mesh>
      {/* stools */}
      {[-3, -1, 1, 3].map((x, i) => (
        <Stool key={i} position={[x, 0, -2.6]} seat={seatMat} metal={metalMat} />
      ))}

      {/* a string of warm bulbs swagged across the front */}
      {bulbs.map((p, i) => (
        <mesh key={i} material={bulbMat} position={p}>
          <sphereGeometry args={[0.07, 6, 6]} />
        </mesh>
      ))}

      {/* a dartboard + a parody beer neon on the +X wall */}
      <mesh material={dartMat} position={[6.92, 1.8, 1.5]} rotation-y={-Math.PI / 2}>
        <circleGeometry args={[0.55, 20]} />
      </mesh>
      <mesh material={beerNeonMat} position={[6.9, 2.0, -1.6]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[1.1, 1.1]} />
      </mesh>
    </group>
  );
}
