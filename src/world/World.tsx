import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import * as THREE from 'three';
import { OCEAN, FOG_NEAR, FOG_FAR, ROOM, PS1 } from './constants';
import { Room } from './Room';
import { Water } from './Water';
import { Boids } from './Boids';
import { Controls } from './Controls';

// Live fog tuning for the leva panel (the spec wants jitter/affine/fog tunable;
// water exposes amp/freq/snap, this exposes the fog distances).
function SceneTuning() {
  const { scene } = useThree();
  const { fogNear, fogFar } = useControls('scene', {
    fogNear: { value: FOG_NEAR, min: 0, max: 40, step: 1 },
    fogFar: { value: FOG_FAR, min: 12, max: 120, step: 1 },
  });
  useFrame(() => {
    const fog = scene.fog as THREE.Fog | null;
    if (fog) {
      fog.near = fogNear;
      fog.far = fogFar;
    }
  });
  return null;
}

// Floor one. Default export so it can be code-split behind a dynamic import —
// three.js never enters the initial bundle. Low dpr + pixelated CSS gives the
// low-res render crunch; `flat` disables tone mapping for flat PS1 color.
export default function World() {
  return (
    <Canvas
      dpr={PS1.dpr}
      flat
      gl={{ antialias: false, powerPreference: 'low-power' }}
      camera={{ fov: 72, near: 0.1, far: 220, position: [0, ROOM.eye, ROOM.halfD - 1.5] }}
      onCreated={({ scene, gl }) => {
        scene.background = OCEAN;
        scene.fog = new THREE.Fog(OCEAN, FOG_NEAR, FOG_FAR);
        gl.setClearColor(OCEAN);
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        imageRendering: 'pixelated',
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      <ambientLight intensity={0.8} color="#bfe6f5" />
      <directionalLight position={[6, 12, 4]} intensity={0.9} color="#fff4e0" />
      <Room />
      <Water />
      <Boids />
      <Controls />
      <SceneTuning />
    </Canvas>
  );
}
