import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { roomById, MOBIUS_BREAK, type RoomDoor } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { exposeTestGlobal } from '../lib/testHooks';
import { flatMat } from './ps1';

// The 3D doors — the room exits. Same metaphor as the flat era-floor doors:
// doors all the way down. Each is a real object you walk up to; proximity
// publishes a prompt (WorldHud), and E / click steps you through with a fade
// (goToRoom → pendingRoom). Hidden doors (the rat's secret) don't render or
// prompt until revealed.

// A hidden door is real only once its reveal condition is met: 'mobius' doors
// appear after the loop breaks (mobiusLoops ≥ MOBIUS_BREAK); everything else is
// the rat's secret panel (secretRevealed). Visible doors are always real.
function doorRevealed(door: RoomDoor, secretRevealed: boolean, mobiusLoops: number): boolean {
  if (!door.hidden) return true;
  return door.revealOn === 'mobius' ? mobiusLoops >= MOBIUS_BREAK : secretRevealed;
}

function DoorMesh({ door }: { door: RoomDoor }) {
  const { gl } = useThree();
  const frameMat = useMemo(() => flatMat('#3a2a22'), []);
  // The dark beyond — DoubleSide so the doorway reads as dark from inside the
  // room (the side you approach from) AND is the click target from that side.
  const voidMat = useMemo(() => flatMat('#0b0608', { side: THREE.DoubleSide }), []);
  const signMat = useMemo(() => flatMat('#d8c47a'), []); // a faint lit sign bar

  const w = 2.2; // opening width
  const h = 3.1; // opening height
  const t = 0.22; // frame thickness

  const activate = () => {
    // Click goes through whatever door you clicked — if you can see it you can
    // travel to it (Myst-style line of sight), no walking up required. (E still
    // wants proximity.) goToRoom guards paused / dialog-open / mid-transition.
    audio.unlock();
    useSceneStore.getState().goToRoom(door.to, door.toSpawn ?? 'default');
  };

  // The cursor must go on the CANVAS element, not document.body — the Canvas
  // sets its own inline `cursor: grab`, so a body cursor under it never wins.
  // 'grab' is the world's resting cursor; restore it on out / unmount.
  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  return (
    <group
      position={door.position}
      rotation-y={door.rotationY}
      onClick={(e) => {
        e.stopPropagation();
        activate();
      }}
      onPointerOver={() => {
        // Any door you can hover is clickable (line-of-sight travel), so always
        // show the pointer so it reads as actionable from across the room.
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
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
  const mobiusLoops = useSceneStore((s) => s.mobiusLoops);
  const doors = useMemo(() => roomById(currentRoom).doors, [currentRoom]);
  const lastNear = useRef<string | null>(null);

  // Test hook (gated to ?world / ?debug): drive a real room transition the same
  // way a door does (pendingRoom → wipe → waterfall/loader). Lets the loader +
  // waterfall smokes (shoot-levels/deeppool) descend deterministically without
  // routing through the deep navigation graph — that's shoot-rooms/shoot-mobius'
  // job. NOT a player affordance: ?world/?debug only.
  useEffect(() => {
    exposeTestGlobal('__sdpGoToRoom', (to: string, spawn?: string) =>
      useSceneStore.getState().goToRoom(to, spawn ?? 'default'),
    );
    return () => exposeTestGlobal('__sdpGoToRoom', undefined);
  }, []);

  useFrame(() => {
    const st = useSceneStore.getState();
    // Freeze door prompts under a dialog/pause or for the whole room wipe.
    if (st.paused || st.openHotspot || st.transitioning) return;
    let nearest: RoomDoor | null = null;
    let nd = Infinity;
    for (const d of doors) {
      // Hidden doors (the rat's secret, the Möbius onward) don't exist yet.
      if (!doorRevealed(d, st.secretRevealed, st.mobiusLoops)) continue;
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
        .filter((d) => doorRevealed(d, secretRevealed, mobiusLoops))
        .map((d) => (
          <DoorMesh key={d.id} door={d} />
        ))}
    </>
  );
}
