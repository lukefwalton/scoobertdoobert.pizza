import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OCEAN, FOG_NEAR, FOG_FAR, ROOM } from './constants';
import { Room } from './Room';
import { Water } from './Water';
import { Boids } from './Boids';

// A tiny fixed-camera render of the world for the machine-room CRT — the
// workstation literally "rendering the dream". Reuses the world's room + water +
// boids at the same PS1 fidelity (no controls, a gentle camera breath). Default
// export + lazy-loaded by the machine room so three.js stays out of the initial
// bundle — it only arrives once you're this deep in the descent.

function MiniCam() {
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // slow lateral/vertical breath; orientation stays facing the window
    state.camera.position.x = Math.sin(t * 0.22) * 0.6;
    state.camera.position.y = ROOM.eye + Math.sin(t * 0.35) * 0.12;
  });
  return null;
}

export default function MiniWorldPreview() {
  return (
    <Canvas
      dpr={1}
      flat
      gl={{ antialias: false, powerPreference: 'low-power' }}
      camera={{ fov: 70, near: 0.1, far: 220, position: [0, ROOM.eye, ROOM.halfD - 1.5] }}
      onCreated={({ scene, gl }) => {
        scene.background = OCEAN;
        scene.fog = new THREE.Fog(OCEAN, FOG_NEAR, FOG_FAR);
        gl.setClearColor(OCEAN);
      }}
      style={{ position: 'absolute', inset: 0, imageRendering: 'pixelated' }}
    >
      <ambientLight intensity={0.8} color="#bfe6f5" />
      <directionalLight position={[6, 12, 4]} intensity={0.9} color="#fff4e0" />
      <Room />
      <Water />
      <Boids />
      <MiniCam />
    </Canvas>
  );
}
