import { useMemo } from 'react';
import * as THREE from 'three';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture, makeSpeckTexture } from './ps1';
import { ROOM } from './constants';

// The low-poly beach pizza shop interior: a small box you stand inside, with a
// window cut into the front wall that looks out to the sea. Flat-shaded,
// nearest-filtered, vertex-snapped. The checkerboard floor is where the affine
// texture wobble reads most clearly.

export function Room() {
  const floorTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#c7402f', '#efe6d2');
    t.repeat.set(6, 6);
    return t;
  }, []);
  const wallTex = useMemo(() => {
    const t = makeSpeckTexture('#e7cf9f', '#cbab78');
    t.repeat.set(4, 2);
    return t;
  }, []);

  // Affine-mapped so the checkerboard visibly swims underfoot (the PS1 tell).
  const floorMat = useMemo(() => makeAffineTexturedMaterial(floorTex, 6), [floorTex]);
  const wallMat = useMemo(
    () => flatMat('#ffffff', { map: wallTex, side: THREE.DoubleSide }),
    [wallTex],
  );
  const ceilMat = useMemo(() => flatMat('#3a2f2a', { side: THREE.DoubleSide }), []);
  const trimMat = useMemo(() => flatMat('#7a2f25', { side: THREE.DoubleSide }), []);
  const jukeMat = useMemo(() => flatMat('#b8324a', { side: THREE.DoubleSide }), []);

  const W = ROOM.halfW;
  const D = ROOM.halfD;
  const H = ROOM.height;
  const FZ = ROOM.frontZ;

  // window opening on the front wall
  const winW = 9;
  const winH = 3;
  const sill = 1.4;
  const jambW = (W * 2 - winW) / 2;
  const aboveH = H - (sill + winH);

  return (
    <group>
      {/* floor */}
      <mesh material={floorMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* ceiling */}
      <mesh material={ceilMat} rotation-x={Math.PI / 2} position={[0, H, 0]}>
        <planeGeometry args={[W * 2, D * 2]} />
      </mesh>
      {/* back wall */}
      <mesh material={wallMat} position={[0, H / 2, D]}>
        <planeGeometry args={[W * 2, H]} />
      </mesh>
      {/* side walls */}
      <mesh material={wallMat} rotation-y={Math.PI / 2} position={[-W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>
      <mesh material={wallMat} rotation-y={-Math.PI / 2} position={[W, H / 2, 0]}>
        <planeGeometry args={[D * 2, H]} />
      </mesh>

      {/* front wall, built around the window hole */}
      <mesh material={wallMat} position={[0, sill / 2, FZ]}>
        <planeGeometry args={[W * 2, sill]} />
      </mesh>
      <mesh material={wallMat} position={[0, sill + winH + aboveH / 2, FZ]}>
        <planeGeometry args={[W * 2, aboveH]} />
      </mesh>
      <mesh material={wallMat} position={[-(winW / 2 + jambW / 2), sill + winH / 2, FZ]}>
        <planeGeometry args={[jambW, winH]} />
      </mesh>
      <mesh material={wallMat} position={[winW / 2 + jambW / 2, sill + winH / 2, FZ]}>
        <planeGeometry args={[jambW, winH]} />
      </mesh>
      {/* window frame — thin bars around the opening, NOT a solid pane, so the
          sea shows through */}
      <mesh material={trimMat} position={[0, sill, FZ + 0.07]}>
        <boxGeometry args={[winW + 0.5, 0.3, 0.3]} />
      </mesh>
      <mesh material={trimMat} position={[0, sill + winH, FZ + 0.07]}>
        <boxGeometry args={[winW + 0.5, 0.3, 0.3]} />
      </mesh>
      <mesh material={trimMat} position={[-winW / 2, sill + winH / 2, FZ + 0.07]}>
        <boxGeometry args={[0.3, winH + 0.3, 0.3]} />
      </mesh>
      <mesh material={trimMat} position={[winW / 2, sill + winH / 2, FZ + 0.07]}>
        <boxGeometry args={[0.3, winH + 0.3, 0.3]} />
      </mesh>

      {/* set dressing — hotspots get wired to these in step 5 */}
      {/* counter (About / the pizza box) */}
      <mesh material={trimMat} position={[W - 2.4, 1, -2]}>
        <boxGeometry args={[3, 2, 4.5]} />
      </mesh>
      {/* jukebox (Listen) */}
      <mesh material={jukeMat} position={[-W + 1.2, 1.1, 3]}>
        <boxGeometry args={[1.6, 2.2, 1.2]} />
      </mesh>
    </group>
  );
}
