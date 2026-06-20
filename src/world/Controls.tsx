import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { ROOM } from './constants';

// First-person look + move. Drag to look (no pointer-lock, so it never traps the
// cursor and works fine for screenshots + the pause menu), WASD / arrows to walk,
// clamped to the room interior so you can't pass through the window wall.
export function Controls() {
  const { camera, gl } = useThree();
  const yaw = useRef(Math.PI); // face -Z (the window) on spawn
  const pitch = useRef(-0.04);
  const keys = useRef<Record<string, boolean>>({});
  const dragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  useEffect(() => {
    camera.position.set(0, ROOM.eye, ROOM.halfD - 1.5);
    const el = gl.domElement;
    const down = (e: PointerEvent) => {
      dragging.current = true;
      last.current = { x: e.clientX, y: e.clientY };
    };
    const up = () => {
      dragging.current = false;
    };
    const move = (e: PointerEvent) => {
      if (!dragging.current) return;
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
  }, [camera, gl]);

  useFrame((_, delta) => {
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

    camera.position.x = Math.max(-ROOM.halfW + 0.6, Math.min(ROOM.halfW - 0.6, camera.position.x));
    camera.position.z = Math.max(ROOM.frontZ + 0.9, Math.min(ROOM.halfD - 0.6, camera.position.z));
    camera.position.y = ROOM.eye;

    const dir = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current) * Math.cos(pitch.current),
    );
    camera.lookAt(camera.position.x + dir.x, camera.position.y + dir.y, camera.position.z + dir.z);
  });

  return null;
}
