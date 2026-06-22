import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { roomById, MOBIUS_BREAK, type RoomDoor } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { audio } from '../audio/engine';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';
import { flatMat } from './ps1';
import { FramedCover } from './CoverArt';
import { albumBySlug } from '../data/albums';

// The 3D doors — the room exits. Same metaphor as the flat era-floor doors:
// doors all the way down. Each is a real object you walk up to; proximity
// publishes a prompt (WorldHud), and E / click steps you through with a fade
// (goToRoom → pendingRoom). Hidden doors (the rat's secret) don't render or
// prompt until revealed.

// A hidden door is real only once its reveal condition is met: 'mobius' doors
// appear after the loop breaks (mobiusLoops ≥ MOBIUS_BREAK); everything else is
// the rat's secret panel (secretRevealed). Visible doors are always real.
function doorRevealed(
  door: RoomDoor,
  secretRevealed: boolean,
  mobiusLoops: number,
  secretsFound: string[],
): boolean {
  if (!door.hidden) return true;
  // A durable progress unlock (e.g. the grove path after the grass goblin) takes
  // precedence; otherwise the scene-flag reveals (the rat's secret / the loop).
  if (door.revealSecret) return secretsFound.includes(door.revealSecret);
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

  // A door with an album slug renders as a painting portal instead of a doorway.
  const album = door.albumSlug ? albumBySlug(door.albumSlug) : undefined;

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
      {album ? (
        // A PAINTING PORTAL — a big framed cover hung in the doorway that lunges at
        // you as you dive through. Raised to gallery height; turned a half-turn so the
        // cover FACE meets the room (doors put the room on the frame's -Z side).
        <group position={[0, 1.7, 0]} rotation-y={Math.PI}>
          <FramedCover art={album.art} album={album.title} size={2.6} diveTo={door.to} />
        </group>
      ) : (
        <>
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
        </>
      )}
    </group>
  );
}

export function Doors() {
  const { camera } = useThree();
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const secretRevealed = useSceneStore((s) => s.secretRevealed);
  const mobiusLoops = useSceneStore((s) => s.mobiusLoops);
  const secretsFound = useProgressStore((s) => s.secretsFound);
  const doors = useMemo(() => roomById(currentRoom).doors, [currentRoom]);
  const lastNear = useRef<string | null>(null);

  // Test hook (gated to ?debug ONLY — the narrow gate): drive a real room
  // transition the same way a door does (pendingRoom → wipe → waterfall/loader).
  // Lets the loader + waterfall smokes (shoot-levels/deeppool) descend
  // deterministically without routing through the deep navigation graph — that's
  // shoot-rooms/shoot-mobius' job. It's an ACTION hook (teleport), so it's NOT
  // exposed on the guessable ?world=1; smokes pass &debug=1 to opt in.
  useEffect(() => {
    if (!isDebugEntrance()) return;
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
      if (
        !doorRevealed(
          d,
          st.secretRevealed,
          st.mobiusLoops,
          useProgressStore.getState().secretsFound,
        )
      )
        continue;
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
        .filter((d) => doorRevealed(d, secretRevealed, mobiusLoops, secretsFound))
        .map((d) => (
          <DoorMesh key={d.id} door={d} />
        ))}
    </>
  );
}
