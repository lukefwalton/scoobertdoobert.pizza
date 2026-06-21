import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { HOTSPOTS } from '../data/hotspots';
import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';

// In-world interaction. Each frame, find the hotspot the camera is standing in
// range of and publish it to the store (drives the DOM proximity prompt). The
// invisible boxes are click targets; the actual "open" (E key or click) is read
// by WorldHud, which also renders the 98.css dialog with the real anchor.
const _v = new THREE.Vector3();

export function Hotspots() {
  const { camera } = useThree();
  const setNear = useSceneStore((s) => s.setNearHotspot);
  const lastNear = useRef<string | null>(null);

  useFrame(() => {
    const st = useSceneStore.getState();
    // Freeze prompts while a dialog or the pause menu is open.
    if (st.openHotspot || st.paused) return;
    let nearest: string | null = null;
    let nearestDist = Infinity;
    for (const h of HOTSPOTS) {
      _v.set(h.position[0], h.position[1], h.position[2]);
      const d = camera.position.distanceTo(_v);
      if (d < (h.radius ?? 4.5) && d < nearestDist) {
        nearest = h.id;
        nearestDist = d;
      }
    }
    if (nearest !== lastNear.current) {
      // A soft "you found something" bell on stepping into a hotspot's range —
      // the shared chimes engine sprinkled onto the world's interaction points.
      if (nearest) audio.playChime(noteToFreq('A', 5), 0, 0.07, 0.5);
      lastNear.current = nearest;
      setNear(nearest);
    }
  });

  return (
    <>
      {HOTSPOTS.map((h) => (
        <mesh
          key={h.id}
          position={h.position}
          onClick={(e) => {
            e.stopPropagation();
            useSceneStore.getState().openHotspotDialog(h.id);
          }}
          onPointerOver={() => {
            document.body.style.cursor = "url('/cursor.cur'), pointer";
          }}
          onPointerOut={() => {
            document.body.style.cursor = '';
          }}
        >
          <boxGeometry args={[2.4, 2.4, 2.4]} />
          {/* invisible but raycast-able click target */}
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </>
  );
}
