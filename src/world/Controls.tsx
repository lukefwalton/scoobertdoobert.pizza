import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roomById } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';

// True when a modal overlay (pause / hotspot dialog) or a room transition should
// freeze input — you don't walk during the door fade.
function inputFrozen(): boolean {
  const st = useSceneStore.getState();
  return st.paused || st.openHotspot !== null || st.pendingRoom !== null;
}

// First-person look + move, now room-aware. Drag to look (no pointer-lock, so it
// never traps the cursor and works for screenshots + menus), WASD / arrows to
// walk, clamped to the CURRENT room's interior. Re-spawns the camera whenever the
// room (or arrival spawn) changes — i.e. after stepping through a door.
export function Controls() {
  const { camera, gl } = useThree();
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const currentSpawn = useSceneStore((s) => s.currentSpawn);

  const yaw = useRef(Math.PI);
  const pitch = useRef(-0.04);
  const keys = useRef<Record<string, boolean>>({});
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  // Current room half-extents, read each frame for the clamp.
  const dims = useRef(roomById(currentRoom).dims);

  // Re-spawn on room / spawn change (initial mount included). This is what makes
  // a door feel like a door: you arrive at the target's spawn, facing its way.
  useEffect(() => {
    const room = roomById(currentRoom);
    dims.current = room.dims;
    const spawn = room.spawns[currentSpawn] ?? room.spawns.default;
    camera.position.set(spawn.position[0], spawn.position[1], spawn.position[2]);
    yaw.current = spawn.yaw;
    pitch.current = -0.04;
  }, [currentRoom, currentSpawn, camera]);

  useEffect(() => {
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      if (inputFrozen()) return;
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      dragging.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current || inputFrozen()) return;
      yaw.current -= (e.clientX - last.current.x) * 0.005;
      pitch.current = Math.max(-0.9, Math.min(0.9, pitch.current - (e.clientY - last.current.y) * 0.005));
      last.current = { x: e.clientX, y: e.clientY };
    };
    const kd = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = true;
    };
    const ku = (e: KeyboardEvent) => {
      keys.current[e.key.toLowerCase()] = false;
    };
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointermove', move);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    return () => {
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('keydown', kd);
      window.removeEventListener('keyup', ku);
    };
  }, [gl]);

  useFrame((_, delta) => {
    // Expose camera position for automated "pause freezes input" checks.
    (window as Window & { __sdpCam?: { x: number; z: number } }).__sdpCam = {
      x: camera.position.x,
      z: camera.position.z,
    };
    if (inputFrozen()) return;
    const speed = 6 * Math.min(delta, 0.05);
    const k = keys.current;
    const fwd = (k['w'] || k['arrowup'] ? 1 : 0) - (k['s'] || k['arrowdown'] ? 1 : 0);
    const strafe = (k['d'] || k['arrowright'] ? 1 : 0) - (k['a'] || k['arrowleft'] ? 1 : 0);

    const fx = Math.sin(yaw.current);
    const fz = Math.cos(yaw.current);
    const rx = Math.cos(yaw.current);
    const rz = -Math.sin(yaw.current);
    camera.position.x += (fx * fwd + rx * strafe) * speed;
    camera.position.z += (fz * fwd + rz * strafe) * speed;

    const d = dims.current;
    camera.position.x = Math.max(-d.halfW + 0.6, Math.min(d.halfW - 0.6, camera.position.x));
    camera.position.z = Math.max(-d.halfD + 0.6, Math.min(d.halfD - 0.6, camera.position.z));
    camera.position.y = d.eye;

    const dir = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current) * Math.cos(pitch.current),
    );
    camera.lookAt(camera.position.x + dir.x, camera.position.y + dir.y, camera.position.z + dir.z);
  });

  return null;
}
