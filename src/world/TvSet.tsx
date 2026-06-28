import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../state/sceneStore';
import { tvVideoFor, songAlbumSlug } from '../data/videos';
import { albumBySlug } from '../data/albums';
import { useDispose } from '../lib/useDispose';

// ───────────────────────────────────────────────────────────────────────────
// TvSet — a 3D CRT television in a room. Its screen shows a record sleeve; switch
// it on (click / E) and the modal player (YoutubeFacade) plays that room's clip —
// resolved by videos.tvVideoFor from the set's `songSlug` (its own music video,
// the most specific) or `albumSlug` (that record's video). So a song-room gives
// you its WORLD (the room), its SOUND (the track, already playing), and now its
// VIDEO (this set, the very song). A retro CRT on a glossy beach is a fun
// anachronism, on purpose.
// ───────────────────────────────────────────────────────────────────────────

// How close the camera must be (horizontal) for the "switch on the TV" E-prompt.
const TV_PROMPT_RADIUS = 3.6;

export function TvSet({
  position,
  rotationY = 0,
  albumSlug,
  songSlug,
}: {
  position: [number, number, number];
  rotationY?: number;
  albumSlug?: string;
  songSlug?: string;
}) {
  const { gl, camera } = useThree();
  // The clip this set plays (song video wins over album video), resolved once.
  const video = useMemo(() => tvVideoFor({ songSlug, albumSlug }), [songSlug, albumSlug]);
  // Whose sleeve to show on the dark screen: the named album, else the song's own
  // record — so a song-only set still displays real cover art, not a blank tube.
  const coverSlug = albumSlug ?? (songSlug ? songAlbumSlug(songSlug) : undefined);
  const album = coverSlug ? albumBySlug(coverSlug) : undefined;

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
  // Tracks whether the camera is in the TV's E-prompt range, so we only write the
  // store on a CHANGE (enter/leave), not every frame — like the door proximity loop.
  const inRange = useRef(false);
  useDispose(bodyMat, darkMat, triMat, screenMat, screenTex);

  // a soft CRT flicker on the glow (gentle — never a flash; WCAG 2.3.1), plus the
  // E-prompt proximity (mirrors Doors): publish nearTv when the camera stands in
  // front of the set, so it's keyboard-openable, not just clickable. Horizontal
  // distance only (the cabinet's base is at y=0, the camera at eye height).
  useFrame((state) => {
    if (glow.current) {
      const t = state.clock.elapsedTime;
      glow.current.intensity = 0.42 + Math.sin(t * 9) * 0.05 + Math.sin(t * 23) * 0.03;
    }
    const st = useSceneStore.getState();
    // No prompt under a modal / mid-transition / while the TV itself is already on.
    const frozen =
      st.paused ||
      st.openHotspot !== null ||
      st.transitioning ||
      st.tvVideo !== null ||
      st.divingTo;
    const dx = camera.position.x - position[0];
    const dz = camera.position.z - position[2];
    const near = !frozen && Math.hypot(dx, dz) < TV_PROMPT_RADIUS;
    if (near !== inRange.current) {
      inRange.current = near;
      st.setNearTv(near ? video : null);
    }
  });

  // Leaving the room (TvSet unmounts) must clear any lingering prompt.
  useEffect(() => () => useSceneStore.getState().setNearTv(null), []);

  return (
    <group
      position={position}
      rotation-y={rotationY}
      onClick={(e) => {
        e.stopPropagation();
        useSceneStore.getState().openTv(video);
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
