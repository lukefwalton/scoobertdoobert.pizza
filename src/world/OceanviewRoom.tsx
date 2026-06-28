import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { Water } from './Water';
import { useDispose } from '../lib/useDispose';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// OceanviewRoom — down the boardwalk steps onto a moonlit beach. The nocturnal
// contrast to the golden pier: a still, sweet sit-and-watch breather (taste
// guardrail — a calm surface beat). Dark sand, the moonlit tide out the -Z edge,
// a low moon with a shimmer of reflection, and a scatter of chunky pixel stars.
// Outdoor + open (no RoomBox). Its song ("ocean-view") plays while you're here.
// ───────────────────────────────────────────────────────────────────────────

// A field of chunky pixel stars low over the sea — THREE.Points so they read as
// blocky points under the low-res render. Static (a calm room); they don't bob.
function Stars({ count = 70 }: { count?: number }) {
  const sprite = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 8;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(2, 2, 4, 4);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.generateMipmaps = false;
    return t;
  }, []);
  const geom = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 70; // x across the horizon
      pos[i * 3 + 1] = 5 + Math.random() * 14; // y up the sky
      pos[i * 3 + 2] = -22 - Math.random() * 8; // z out past the water
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [count]);
  const mat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#dbe6ff',
        map: sprite,
        size: 0.5,
        sizeAttenuation: true,
        transparent: true,
        depthWrite: false,
        fog: true,
      }),
    [sprite],
  );
  useDispose(geom, mat, sprite);
  return <points geometry={geom} material={mat} />;
}

export function OceanviewRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // Cool, dim night sand.
  const sandTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#1c2c3d', '#243648'); // two dark blue sands
    t.repeat.set(8, 8);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(sandTex, 10, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sandTex, fog.color, fog.near, fog.far],
  );
  const moonMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#eaf1ff' }), []);
  // a soft column of moonlight on the water, gently shimmering
  const glimmerMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#9fb6d8', transparent: true, opacity: 0.5 }),
    [],
  );
  const glimmer = useRef<THREE.Mesh>(null);

  useDispose(sandTex);

  useFrame((state) => {
    if (glimmer.current) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 1.3) * 0.08;
      glimmer.current.scale.x = s;
    }
  });

  return (
    <group>
      {/* cool moonlit night: a dim blue hemisphere + a soft moon key light */}
      <hemisphereLight args={['#9fb6d8', '#0d1a2a', 0.55]} />
      <ambientLight intensity={0.3} color="#7f97bf" />
      <directionalLight position={[-3, 6, -10]} intensity={0.45} color="#cdd9f5" />

      {/* the dark beach */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 2]}>
        <planeGeometry args={[room.dims.halfW * 2 + 40, room.dims.halfD * 2 + 30]} />
      </mesh>

      {/* the moonlit tide — the shop's crunchy water, tinted deep + cool */}
      <Water
        base="#16405f"
        crest="#a9c4e6"
        fog={room.palette.fog}
        fogNear={room.palette.fogNear}
        fogFar={room.palette.fogFar}
        y={-0.9}
        z={-22}
      />

      {/* the moonlight shimmer column on the water, between you and the moon */}
      <mesh
        ref={glimmer}
        material={glimmerMat}
        rotation-x={-Math.PI / 2}
        position={[-3, -0.85, -14]}
      >
        <planeGeometry args={[2.4, 20]} />
      </mesh>

      {/* the low moon on the horizon */}
      <mesh material={moonMat} position={[-3, 6.5, -25]}>
        <circleGeometry args={[1.9, 22]} />
      </mesh>

      <Stars />
    </group>
  );
}
