import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { roomById, type RoomDoor } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { applyVertexSnap } from './ps1';

// The 3D doors — the room exits. Same metaphor as the flat era-floor doors:
// doors all the way down. Each is a real object you walk up to; proximity
// publishes a prompt (WorldHud), and E / click steps you through with a fade
// (goToRoom → pendingRoom). Hidden doors (the rat's secret) don't render or
// prompt until revealed.

function flatMat(color: string, side: THREE.Side = THREE.FrontSide): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ color, flatShading: true, side });
  applyVertexSnap(m, 64);
  return m;
}

function DoorMesh({ door }: { door: RoomDoor }) {
  const frameMat = useMemo(() => flatMat('#3a2a22'), []);
  // The dark beyond — DoubleSide so the doorway reads as dark from inside the
  // room (the side you approach from) AND is the click target from that side.
  const voidMat = useMemo(() => flatMat('#0b0608', THREE.DoubleSide), []);
  const signMat = useMemo(() => flatMat('#d8c47a'), []); // a faint lit sign bar

  const w = 2.2; // opening width
  const h = 3.1; // opening height
  const t = 0.22; // frame thickness

  const activate = () => {
    // Click requires proximity too, same as E: you walk up to a door, then go
    // through it. (goToRoom still guards paused / dialog-open / mid-transition.)
    const st = useSceneStore.getState();
    if (st.nearDoor?.id !== door.id) return;
    audio.unlock();
    st.goToRoom(door.to, door.toSpawn ?? 'default');
  };

  // Reset the body cursor if this door unmounts (room swap) while hovered, so a
  // pointer cursor can't get stranded after the door it belonged to is gone.
  useEffect(() => () => {
    document.body.style.cursor = '';
  }, []);

  return (
    <group
      position={door.position}
      rotation-y={door.rotationY}
      onClick={(e) => {
        e.stopPropagation();
        activate();
      }}
      onPointerOver={() => {
        // Only advertise clickability when you're actually close enough to
        // activate (same proximity rule as the click), so a distant door doesn't
        // look actionable when it would no-op.
        if (useSceneStore.getState().nearDoor?.id === door.id) {
          document.body.style.cursor = "url('/cursor.cur'), pointer";
        }
      }}
      onPointerOut={() => {
        document.body.style.cursor = '';
      }}
    >
      {/* dark recess (the room beyond, before you step through) */}
      <mesh material={voidMat} position={[0, h / 2, -0.12]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* jambs */}
      <mesh material={frameMat} position={[-(w / 2 + t / 2), h / 2, 0]}>
        <boxGeometry args={[t, h + t, 0.4]} />
      </mesh>
      <mesh material={frameMat} position={[w / 2 + t / 2, h / 2, 0]}>
        <boxGeometry args={[t, h + t, 0.4]} />
      </mesh>
      {/* lintel */}
      <mesh material={frameMat} position={[0, h + t / 2, 0]}>
        <boxGeometry args={[w + t * 2, t, 0.4]} />
      </mesh>
      {/* sign bar above the lintel */}
      <mesh material={signMat} position={[0, h + t + 0.28, 0.05]}>
        <boxGeometry args={[w * 0.8, 0.34, 0.1]} />
      </mesh>
    </group>
  );
}

export function Doors() {
  const { camera } = useThree();
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const secretRevealed = useSceneStore((s) => s.secretRevealed);
  const doors = useMemo(() => roomById(currentRoom).doors, [currentRoom]);
  const lastNear = useRef<string | null>(null);

  useFrame(() => {
    const st = useSceneStore.getState();
    // Freeze door prompts under a dialog/pause or for the whole room wipe.
    if (st.paused || st.openHotspot || st.transitioning) return;
    let nearest: RoomDoor | null = null;
    let nd = Infinity;
    for (const d of doors) {
      // Hidden doors (the rat's secret panel) don't exist until revealed.
      if (d.hidden && !st.secretRevealed) continue;
      // Horizontal distance only — the door's base is at y=0, the camera at eye
      // height, so the vertical gap shouldn't count against "am I standing here".
      const dx = camera.position.x - d.position[0];
      const dz = camera.position.z - d.position[2];
      const dist = Math.hypot(dx, dz);
      if (dist < (d.radius ?? 3.2) && dist < nd) {
        nearest = d;
        nd = dist;
      }
    }
    const nextId = nearest?.id ?? null;
    if (nextId !== lastNear.current) {
      lastNear.current = nextId;
      st.setNearDoor(
        nearest
          ? {
              id: nearest.id,
              label: nearest.label,
              to: nearest.to,
              spawn: nearest.toSpawn ?? 'default',
            }
          : null,
      );
    }
  });

  return (
    <>
      {doors
        .filter((d) => !d.hidden || secretRevealed)
        .map((d) => (
          <DoorMesh key={d.id} door={d} />
        ))}
    </>
  );
}
