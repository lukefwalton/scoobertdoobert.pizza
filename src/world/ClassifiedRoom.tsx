import { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { applyVertexSnap, makeAffineTexturedMaterial, makeCheckerTexture, makeTextTexture } from './ps1';
import type { Room } from '../data/rooms';

// The "suspect board": the masked-Scoobert photos (Luke's own, degraded to tiny
// PS1 textures by scripts/make-classified-photos.mjs) pinned askew on the +X wall
// with red string — the X-Files surveillance corkboard. Loaded behind its own
// Suspense so the tiny textures never gate the rest of the room.
const PHOTO_URLS = Array.from({ length: 8 }, (_, i) => `/textures/classified/photo-${i + 1}.jpg`);

function SuspectBoard({ W }: { W: number }) {
  const maps = useTexture(PHOTO_URLS) as THREE.Texture[];
  useMemo(() => {
    for (const t of maps) {
      t.magFilter = THREE.NearestFilter;
      t.minFilter = THREE.NearestFilter;
      t.generateMipmaps = false;
      t.needsUpdate = true;
    }
  }, [maps]);

  const cols = [-1.35, -0.45, 0.45, 1.35];
  const rows = [2.15, 1.35];
  const frameMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#d9d2c4' }), []); // polaroid
  const corkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2c2114' }), []);
  const stringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#8a1f17' }), []); // red yarn
  const pinMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#c9302c' }), []);

  // The group sits on the +X wall and faces -X into the room; children lay out in
  // local X (→ along the wall) and Y (up).
  return (
    <group position={[W - 0.07, 0, 0]} rotation-y={-Math.PI / 2}>
      <mesh material={corkMat} position={[0, 1.72, 0]}>
        <planeGeometry args={[3.3, 1.7]} />
      </mesh>
      {/* a couple of red "string" runs across the suspects */}
      <mesh material={stringMat} position={[-0.45, 1.75, 0.02]} rotation-z={0.5}>
        <planeGeometry args={[1.9, 0.025]} />
      </mesh>
      <mesh material={stringMat} position={[0.55, 1.7, 0.02]} rotation-z={-0.7}>
        <planeGeometry args={[1.7, 0.025]} />
      </mesh>
      {maps.map((map, i) => {
        const lx = cols[i % 4];
        const ly = rows[i < 4 ? 0 : 1];
        const tilt = (((i * 37) % 7) - 3) * 0.045; // deterministic askew
        return (
          <group key={i} position={[lx, ly, 0.03]} rotation-z={tilt}>
            <mesh material={frameMat}>
              <planeGeometry args={[0.62, 0.62]} />
            </mesh>
            <mesh position={[0, -0.03, 0.005]}>
              <planeGeometry args={[0.52, 0.52]} />
              <meshBasicMaterial map={map} />
            </mesh>
            <mesh material={pinMat} position={[0, 0.27, 0.01]}>
              <circleGeometry args={[0.03, 8]} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

// The classified room — the one secret, behind the panel the rat knocked open.
// A tiny, cold, X-Files file room: filing cabinets, a desk buried in manila
// folders stamped REJECTED / DO NOT RELEASE — the demos that never got out.
// One buzzing fluorescent that can't quite hold steady.
function flatMat(color: string, map?: THREE.Texture, side: THREE.Side = THREE.FrontSide): THREE.Material {
  const m = new THREE.MeshLambertMaterial({ color, map, flatShading: true, side });
  applyVertexSnap(m, 64);
  return m;
}

function Cabinet({ x, z, ry }: { x: number; z: number; ry: number }) {
  const bodyMat = useMemo(() => flatMat('#6a6f6c'), []);
  const drawerMat = useMemo(() => flatMat('#565b58'), []);
  return (
    <group position={[x, 0, z]} rotation-y={ry}>
      <mesh material={bodyMat} position={[0, 1.05, 0]}>
        <boxGeometry args={[0.9, 2.1, 0.7]} />
      </mesh>
      {/* drawer faces */}
      {[0.45, 1.05, 1.65].map((y) => (
        <mesh key={y} material={drawerMat} position={[0, y, 0.36]}>
          <boxGeometry args={[0.78, 0.5, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

function Desk() {
  const woodMat = useMemo(() => flatMat('#4a3a2a'), []);
  const folderTex = useMemo(
    () => makeTextTexture('REJECTED', { fg: '#7a1a13', bg: '#d8c89a', w: 256, h: 128 }),
    [],
  );
  const folder2Tex = useMemo(
    () => makeTextTexture('DO NOT\nRELEASE', { fg: '#222', bg: '#cdb98a', w: 256, h: 128 }),
    [],
  );
  const folderMat = useMemo(() => new THREE.MeshBasicMaterial({ map: folderTex }), [folderTex]);
  const folder2Mat = useMemo(() => new THREE.MeshBasicMaterial({ map: folder2Tex }), [folder2Tex]);
  const manila = useMemo(() => flatMat('#cdb98a'), []);
  return (
    <group position={[0, 0, -2.7]}>
      {/* desk */}
      <mesh material={woodMat} position={[0, 0.74, 0]}>
        <boxGeometry args={[2.4, 0.12, 1.1]} />
      </mesh>
      <mesh material={woodMat} position={[-1.05, 0.37, 0]}>
        <boxGeometry args={[0.12, 0.74, 1.0]} />
      </mesh>
      <mesh material={woodMat} position={[1.05, 0.37, 0]}>
        <boxGeometry args={[0.12, 0.74, 1.0]} />
      </mesh>
      {/* a couple of folders, lying flat, labels up */}
      <mesh material={manila} position={[-0.5, 0.82, 0.1]} rotation-x={-Math.PI / 2} rotation-z={0.15}>
        <planeGeometry args={[0.9, 0.62]} />
      </mesh>
      <mesh material={folderMat} position={[-0.5, 0.83, 0.1]} rotation-x={-Math.PI / 2} rotation-z={0.15}>
        <planeGeometry args={[0.86, 0.42]} />
      </mesh>
      <mesh material={folder2Mat} position={[0.6, 0.83, -0.05]} rotation-x={-Math.PI / 2} rotation-z={-0.2}>
        <planeGeometry args={[0.86, 0.46]} />
      </mesh>
    </group>
  );
}

export function ClassifiedRoom({ room }: { room: Room }) {
  const W = room.dims.halfW;
  const D = room.dims.halfD;
  const H = room.dims.height;
  const fog = { color: room.palette.fog, near: room.palette.fogNear, far: room.palette.fogFar };

  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#1a201c', '#222a25');
    t.repeat.set(2, 2);
    return t;
  }, []);
  const floorMat = useMemo(
    () => makeAffineTexturedMaterial(floorTex, 2, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [floorTex, fog.color, fog.near, fog.far],
  );
  const wallMat = useMemo(() => flatMat('#16201b', undefined, THREE.DoubleSide), []);
  const ceilMat = useMemo(() => flatMat('#0c130f'), []);
  const fixtureMat = useMemo(() => flatMat('#e7f2ec'), []);

  // The fluorescent that can't hold steady — flickers on a noisy schedule.
  const light = useRef<THREE.PointLight>(null);
  useFrame((state) => {
    if (!light.current) return;
    const t = state.clock.elapsedTime;
    const flick = Math.sin(t * 37) * Math.sin(t * 13.3) > 0.78 ? 0.32 : 1;
    light.current.intensity = 0.62 * flick;
  });

  return (
    <group>
      <ambientLight intensity={0.18} color="#9fb7ad" />
      <pointLight ref={light} position={[0, H - 0.3, 0.4]} intensity={0.62} distance={11} color="#cfe6dc" />

      {/* floor / ceiling */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      <mesh material={ceilMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* walls */}
      <mesh material={wallMat} position={[0, H / 2, -D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} position={[0, H / 2, D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={Math.PI / 2} position={[-W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={-Math.PI / 2} position={[W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>

      {/* the fluorescent fixture */}
      <mesh material={fixtureMat} rotation-x={Math.PI / 2} position={[0, H - 0.02, 0.4]}>
        <planeGeometry args={[1.6, 0.5]} />
      </mesh>

      {/* cabinets along the back + a side wall */}
      <Cabinet x={-W + 0.6} z={-D + 1.2} ry={Math.PI / 2} />
      <Cabinet x={-W + 0.6} z={-D + 2.4} ry={Math.PI / 2} />
      <Cabinet x={W - 0.6} z={-D + 1.6} ry={-Math.PI / 2} />
      <Desk />

      {/* the masked-Scoobert suspect board on the +X wall */}
      <Suspense fallback={null}>
        <SuspectBoard W={W} />
      </Suspense>
    </group>
  );
}
