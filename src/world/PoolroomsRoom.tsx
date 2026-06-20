import { useMemo } from 'react';
import * as THREE from 'three';
import { applyVertexSnap, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import type { Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// PoolroomsRoom — Phase 6, the first level "below the shop". An ORIGINAL,
// procedurally-built liminal poolrooms (we don't ship the unprovenanced
// third-party GLBs): white-tiled everywhere, a still recessed pool, too-evenly
// over-lit, empty, and a beat wrong. Same PS1 toolkit as every other room
// (vertex snap, affine floor swim, ≤128px NearestFilter tile, fog). The Phase 5
// dread layer (fog close-in + sub-bass + vignette) modulates it for free as you
// linger. Doors are rendered by Doors.tsx; this is the shell + the pool.
// ───────────────────────────────────────────────────────────────────────────

function flatMat(color: string, map?: THREE.Texture): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, map, flatShading: true, side: THREE.DoubleSide });
  applyVertexSnap(m, 64);
  return m;
}

// Half-extent of the recessed pool opening (centred) and how deep the basin goes.
const POOL = 4.5;
const BASIN_Y = -1.6;
const WATER_Y = -0.35;

export function PoolroomsRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const fog = { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };

  // Pale wall/deck tile + a smaller-grid basin tile, both nearest-filtered.
  const wallTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#e7f1f4', '#d2e3ea'); // bright white-aqua tile
    t.repeat.set(Math.round(W / 1.5), 2);
    return t;
  }, [W]);
  const deckTex = useMemo(() => makeCheckerTexture(8, '#e9f2f5', '#cfe1e8'), []);
  const basinTex = useMemo(() => makeCheckerTexture(6, '#bfe0ea', '#a9d2df'), []); // cooler, wet

  // Affine deck + basin floors (the PS1 swim), carrying the room's pale fog.
  const deckMat = useMemo(
    () => makeAffineTexturedMaterial(deckTex, 1, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckTex, fog.color, fog.near, fog.far],
  );
  const basinFloorMat = useMemo(
    () => makeAffineTexturedMaterial(basinTex, 1, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [basinTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#ffffff', wallTex), [wallTex]);
  const ceilMat = useMemo(() => flatMat('#eef5f7'), []);
  const lightMat = useMemo(() => flatMat('#ffffff'), []); // flat fluorescent quads
  const basinWallMat = useMemo(() => flatMat('#cfe6ee'), []);
  const pillarMat = useMemo(() => flatMat('#e3eef1'), []);
  const waterMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      color: '#37b9cf',
      transparent: true,
      opacity: 0.62,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    applyVertexSnap(m, 64);
    return m;
  }, []);

  // The deck is four strips around the pool opening (a hole in the middle so the
  // recessed basin + water read as below the floor).
  const decks: Array<[number, number, number, number]> = [
    // [centerX, centerZ, sizeX, sizeZ]
    [0, (POOL + D) / 2, W * 2, D - POOL], // far (+Z)
    [0, -(POOL + D) / 2, W * 2, D - POOL], // near (-Z)
    [-(POOL + W) / 2, 0, W - POOL, POOL * 2], // left (-X)
    [(POOL + W) / 2, 0, W - POOL, POOL * 2], // right (+X)
  ];

  return (
    <group>
      {/* over-lit + too even — the liminal tell (bright, not dark) */}
      <ambientLight intensity={0.95} color="#eaf6f9" />
      <pointLight position={[0, H - 0.3, 0]} intensity={0.5} distance={26} color="#ffffff" />
      <pointLight position={[-W + 2, H - 0.3, D - 3]} intensity={0.3} distance={16} color="#dff2f7" />

      {/* deck (four strips around the pool) */}
      {decks.map(([cx, cz, sx, sz], i) => (
        <mesh key={i} material={deckMat} rotation-x={-Math.PI / 2} position={[cx, 0, cz]}>
          <planeGeometry args={[sx, sz]} />
        </mesh>
      ))}

      {/* the pool — recessed basin floor + four basin walls + a still water plane */}
      <mesh material={basinFloorMat} rotation-x={-Math.PI / 2} position={[0, BASIN_Y, 0]}>
        <planeGeometry args={[POOL * 2, POOL * 2]} />
      </mesh>
      <mesh material={basinWallMat} position={[0, BASIN_Y / 2, POOL]}>
        <planeGeometry args={[POOL * 2, -BASIN_Y]} />
      </mesh>
      <mesh material={basinWallMat} rotation-y={Math.PI} position={[0, BASIN_Y / 2, -POOL]}>
        <planeGeometry args={[POOL * 2, -BASIN_Y]} />
      </mesh>
      <mesh material={basinWallMat} rotation-y={-Math.PI / 2} position={[POOL, BASIN_Y / 2, 0]}>
        <planeGeometry args={[POOL * 2, -BASIN_Y]} />
      </mesh>
      <mesh material={basinWallMat} rotation-y={Math.PI / 2} position={[-POOL, BASIN_Y / 2, 0]}>
        <planeGeometry args={[POOL * 2, -BASIN_Y]} />
      </mesh>
      <mesh material={waterMat} rotation-x={-Math.PI / 2} position={[0, WATER_Y, 0]}>
        <planeGeometry args={[POOL * 2 - 0.1, POOL * 2 - 0.1]} />
      </mesh>

      {/* ceiling */}
      <mesh material={ceilMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>

      {/* four tiled walls */}
      <mesh material={wallMat} rotation-y={Math.PI / 2} position={[-W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={-Math.PI / 2} position={[W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} position={[0, H / 2, D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={Math.PI} position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>

      {/* bright flat fluorescent panels — the over-even light */}
      {[-W + 3, 0, W - 3].map((x) =>
        [-D + 3, D - 3].map((z) => (
          <mesh key={`${x},${z}`} material={lightMat} rotation-x={Math.PI / 2} position={[x, H - 0.02, z]}>
            <planeGeometry args={[1.6, 1.6]} />
          </mesh>
        )),
      )}

      {/* four corner pillars — poolrooms always have the pillars */}
      {[
        [-W + 1.4, D - 1.4],
        [W - 1.4, D - 1.4],
        [-W + 1.4, -D + 1.4],
        [W - 1.4, -D + 1.4],
      ].map(([x, z], i) => (
        <mesh key={i} material={pillarMat} position={[x, H / 2, z]}>
          <boxGeometry args={[0.7, H, 0.7]} />
        </mesh>
      ))}
    </group>
  );
}
