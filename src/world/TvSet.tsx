import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../state/sceneStore';
import { albumVideo } from '../data/videos';
import { albumBySlug } from '../data/albums';

// ───────────────────────────────────────────────────────────────────────────
// TvSet — a 3D CRT television in an album-room: the far side of that album's
// painting. Its screen shows the cover; switch it on (click) and the modal player
// (YoutubeFacade) plays that record's music videos. So a painting gives you the
// album's WORLD (the room), its SOUND (the track, already playing), and now its
// VIDEO (this set). A retro CRT on a glossy beach is a fun anachronism, on purpose.
// ───────────────────────────────────────────────────────────────────────────
export function TvSet({
  position,
  rotationY = 0,
  albumSlug,
}: {
  position: [number, number, number];
  rotationY?: number;
  albumSlug: string;
}) {
  const { gl } = useThree();
  const album = albumBySlug(albumSlug);

  const bodyMat = useMemo(
    () => new THREE.MeshPhongMaterial({ color: '#d8cbb0', specular: '#ffffff', shininess: 24 }),
    [],
  );
  const darkMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#0a0c10' }), []);
  const triMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#eaf6ff' }), []);
  const screenTex = useMemo(() => {
    if (!album?.art) return null;
    const t = new THREE.TextureLoader().load(album.art);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, [album]);
  const screenMat = useMemo(
    () => new THREE.MeshBasicMaterial(screenTex ? { map: screenTex } : { color: '#10324a' }),
    [screenTex],
  );
  const glow = useRef<THREE.PointLight>(null);
  useEffect(
    () => () => {
      bodyMat.dispose();
      darkMat.dispose();
      triMat.dispose();
      screenMat.dispose();
      screenTex?.dispose();
    },
    [bodyMat, darkMat, triMat, screenMat, screenTex],
  );

  // a soft CRT flicker on the glow (gentle — never a flash; WCAG 2.3.1)
  useFrame((state) => {
    if (glow.current) {
      const t = state.clock.elapsedTime;
      glow.current.intensity = 0.42 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.03;
    }
  });

  return (
    <group
      position={position}
      rotation-y={rotationY}
      onClick={(e) => {
        e.stopPropagation();
        useSceneStore.getState().openTv(albumVideo(albumSlug));
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      {/* the boxy CRT cabinet */}
      <mesh material={bodyMat} position={[0, 0.95, 0]}>
        <boxGeometry args={[2, 1.7, 1.5]} />
      </mesh>
      {/* the screen — the album cover, slightly recessed dark surround */}
      <mesh material={darkMat} position={[0, 1.0, 0.74]}>
        <planeGeometry args={[1.66, 1.26]} />
      </mesh>
      <mesh material={screenMat} position={[0, 1.0, 0.76]}>
        <planeGeometry args={[1.5, 1.1]} />
      </mesh>
      {/* a play badge so it reads as "switch me on" */}
      <mesh material={darkMat} position={[0, 1.0, 0.78]}>
        <circleGeometry args={[0.26, 20]} />
      </mesh>
      <mesh material={triMat} position={[0.03, 1.0, 0.79]} rotation-z={-Math.PI / 2}>
        <circleGeometry args={[0.15, 3]} />
      </mesh>
      {/* little feet */}
      <mesh material={bodyMat} position={[-0.72, 0.07, 0.35]}>
        <boxGeometry args={[0.18, 0.16, 0.18]} />
      </mesh>
      <mesh material={bodyMat} position={[0.72, 0.07, 0.35]}>
        <boxGeometry args={[0.18, 0.16, 0.18]} />
      </mesh>
      {/* the screen's glow into the room */}
      <pointLight
        ref={glow}
        position={[0, 1.0, 1.2]}
        intensity={0.42}
        distance={5}
        color="#bfe0ff"
      />
    </group>
  );
}
