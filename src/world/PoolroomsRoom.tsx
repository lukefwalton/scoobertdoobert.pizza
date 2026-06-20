import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { applyVertexSnap, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { useDreadStore } from '../state/dreadStore';
import type { Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// PoolroomsRoom — Phase 6, the first level "below the shop". An ORIGINAL,
// procedurally-built liminal poolrooms (we don't ship the unprovenanced
// third-party GLBs): white-tiled everywhere, too-evenly over-lit, empty, a beat
// wrong. Same PS1 toolkit as every other room (vertex snap, affine floor swim,
// ≤128px NearestFilter tile, fog).
//
// THE FALSE POOL (Luke): the pool is NOT a recess you go into — it's a flat sheet
// of "water" set FLUSH with the deck that you simply WALK ACROSS. It only LOOKS
// like water (scrolling caustics + a gentle surface wave); your feet stay on the
// floor. Dead center, standing ON the water, is the door down to the liminal
// level — the only way deeper. Walking out across an impossible still pool to a
// freestanding door is the whole liminal beat. The dread layer speeds/curdles the
// ripple as unease rises. Doors are rendered by Doors.tsx; this is the shell +
// the false pool.
// ───────────────────────────────────────────────────────────────────────────

function flatMat(color: string, map?: THREE.Texture): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, map, flatShading: true, side: THREE.DoubleSide });
  applyVertexSnap(m, 64);
  return m;
}

// Half-extent of the (flat, walk-on) water sheet, centred. Big enough that you
// genuinely cross water to reach the centre door, with a tiled deck border.
const POOL = 5;
const WATER_Y = 0.05; // a hair above the deck so it reads as a surface, not a hole

// A low-res caustic-ish ripple texture (PS1: tiny + NearestFilter). Interfering
// sine bands read as light dancing on water once it's scrolled.
function makeRippleTexture(): THREE.Texture {
  const S = 64;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d')!;
  const img = ctx.createImageData(S, S);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const v =
        Math.sin((x / S) * Math.PI * 4) * Math.cos((y / S) * Math.PI * 4) +
        Math.sin(((x + y) / S) * Math.PI * 6);
      const t = (v + 2) / 4; // 0..1
      const i = (y * S + x) * 4;
      img.data[i] = 90 + t * 120; // R
      img.data[i + 1] = 190 + t * 60; // G
      img.data[i + 2] = 205 + t * 50; // B
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.repeat.set(2, 2);
  return tex;
}

export function PoolroomsRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const fog = { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };

  // Pale wall/deck tile, nearest-filtered.
  const wallTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#e7f1f4', '#d2e3ea'); // bright white-aqua tile
    t.repeat.set(Math.round(W / 1.5), 2);
    return t;
  }, [W]);
  const deckTex = useMemo(() => makeCheckerTexture(8, '#e9f2f5', '#cfe1e8'), []);

  const deckMat = useMemo(
    () => makeAffineTexturedMaterial(deckTex, 1, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [deckTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#ffffff', wallTex), [wallTex]);
  const ceilMat = useMemo(() => flatMat('#eef5f7'), []);
  const lightMat = useMemo(() => flatMat('#ffffff'), []); // flat fluorescent quads
  const pillarMat = useMemo(() => flatMat('#e3eef1'), []);

  // The false water: scrolling caustic map + a gentle vertex wave. Walk-on, so
  // the wave is tiny (cosmetic) — your feet never leave the flat floor.
  const rippleTex = useMemo(() => makeRippleTexture(), []);
  const waterMat = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({
      color: '#37b9cf',
      map: rippleTex,
      transparent: true,
      opacity: 0.9,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    applyVertexSnap(m, 64);
    return m;
  }, [rippleTex]);
  const waterRef = useRef<THREE.Mesh>(null);
  const baseZ = useRef<Float32Array | null>(null);

  useFrame((state, delta) => {
    // Unease drives the ripple from a calm shimmer toward a faster, wrong churn.
    const unease = useDreadStore.getState().unease;
    const speed = 0.04 + unease * 0.12;
    rippleTex.offset.x += delta * speed;
    rippleTex.offset.y += delta * speed * 0.6;

    const mesh = waterRef.current;
    if (!mesh) return;
    const geo = mesh.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    if (!baseZ.current) {
      baseZ.current = Float32Array.from({ length: pos.count }, (_, i) => pos.getZ(i));
    }
    const t = state.clock.elapsedTime;
    const amp = 0.04 + unease * 0.06; // tiny — apparent motion, never a hazard
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, baseZ.current[i] + Math.sin(x * 1.3 + t * 1.6) * Math.cos(y * 1.1 + t * 1.2) * amp);
    }
    pos.needsUpdate = true;
  });

  return (
    <group>
      {/* over-lit + too even — the liminal tell (bright, not dark) */}
      <ambientLight intensity={0.95} color="#eaf6f9" />
      <pointLight position={[0, H - 0.3, 0]} intensity={0.5} distance={26} color="#ffffff" />
      <pointLight position={[-W + 2, H - 0.3, D - 3]} intensity={0.3} distance={16} color="#dff2f7" />

      {/* full tiled deck floor — you walk on this everywhere, water included */}
      <mesh material={deckMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>

      {/* the FALSE pool — a flat sheet of "water" flush with the deck you walk
          across; only the scrolling caustics + faint wave say it's water */}
      <mesh ref={waterRef} material={waterMat} rotation-x={-Math.PI / 2} position={[0, WATER_Y, 0]}>
        <planeGeometry args={[POOL * 2, POOL * 2, 12, 12]} />
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
