import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PIZZA_PARAMS, makeBoids, stepBoids, type Bounds } from './sim';
import { applyVertexSnap } from './ps1';
import { SEA } from './constants';

// The establishing shot out the window: a slow school of low-poly pizza slices,
// driven by the ported steering. To reskin the school, swap this geometry — the
// simulation doesn't care what the agent looks like.
const BOUNDS: Bounds = { x: 20, y: 7, z: 16 };
const dummy = new THREE.Object3D();

function pizzaSliceGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(1.7, 1.0);
  shape.lineTo(1.7, -1.0);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.3, bevelEnabled: false });
  geo.center();
  geo.rotateY(Math.PI / 2); // tip points along +Z so lookAt orients travel
  geo.computeVertexNormals();
  return geo;
}

export function Boids() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const boids = useMemo(() => makeBoids(PIZZA_PARAMS, BOUNDS), []);
  const geometry = useMemo(pizzaSliceGeometry, []);
  const material = useMemo(() => {
    const m = new THREE.MeshLambertMaterial({ color: '#e6a93c', flatShading: true });
    applyVertexSnap(m, 64);
    return m;
  }, []);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    stepBoids(boids, PIZZA_PARAMS, BOUNDS, Math.min(delta * 60, 2));
    for (let i = 0; i < boids.length; i++) {
      const b = boids[i];
      dummy.position.set(b.x, b.y, b.z);
      dummy.lookAt(b.x + b.vx, b.y + b.vy, b.z + b.vz);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <group position={[0, 0.5, SEA.z + 2]}>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, PIZZA_PARAMS.count]}
        frustumCulled={false}
      />
    </group>
  );
}
