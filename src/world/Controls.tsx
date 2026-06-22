import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roomById } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useLevelStore } from '../state/levelStore';
import { isTestEntrance } from '../lib/testHooks';

// Gate the per-frame __sdpCam test global once at module load (it's read by the
// world smokes under ?world / ?debug) — never re-detected in the hot useFrame.
const EXPOSE_CAM = isTestEntrance();

// True when a modal overlay (pause / hotspot dialog), a room transition, or a
// GLB level loader should freeze input. `transitioning` covers the WHOLE door
// wipe (fade-out + commit + fade-in). For a GLB room we freeze until the level is
// `ready` (GlbRoom has mounted + is rendering) — which is exactly when the loading
// panel clears and the level auto-enters — so WASD/look can't drift the camera
// behind the loader. Gating on `ready` (owned race-free by GlbRoom's mount/unmount)
// rather than a separate `entered` flag avoids a GLB→GLB reset race that could
// strand input frozen forever. A failed load keeps `ready` false, so a broken room
// stays frozen under its TURN BACK overlay.
function inputFrozen(): boolean {
  const st = useSceneStore.getState();
  if (st.paused || st.openHotspot !== null || st.transitioning || st.tvVideo !== null) return true;
  const room = roomById(st.currentRoom);
  if (room.glb && !useLevelStore.getState().ready) return true;
  return false;
}

// First-person look + move, now room-aware. Drag to look (no pointer-lock, so it
// never traps the cursor and works for screenshots + menus), WASD / arrows to
// walk, clamped to the CURRENT room's interior. Re-spawns the camera whenever the
// room (or arrival spawn) changes — i.e. after stepping through a door.
export function Controls() {
  const { camera, gl } = useThree();
  const currentRoom = useSceneStore((s) => s.currentRoom);
  const currentSpawn = useSceneStore((s) => s.currentSpawn);
  // Re-spawn fires on every door commit, even when the room+spawn are unchanged
  // (the Möbius loop re-enters the same node) — see sceneStore.roomNonce.
  const roomNonce = useSceneStore((s) => s.roomNonce);

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
    // Apply the heading NOW, not just in useFrame() — useFrame returns early
    // while `transitioning`, so without this the camera would keep its old
    // facing through the whole fade-in and snap to the spawn heading only when
    // the freeze lifts (visible on doors where arrival ≠ approach heading).
    const dir = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current) * Math.cos(pitch.current),
    );
    camera.lookAt(camera.position.x + dir.x, camera.position.y + dir.y, camera.position.z + dir.z);
  }, [currentRoom, currentSpawn, roomNonce, camera]);

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
      pitch.current = Math.max(
        -0.9,
        Math.min(0.9, pitch.current - (e.clientY - last.current.y) * 0.005),
      );
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
    // Expose camera position + heading for automated checks (pause-freeze, turn).
    // Gate computed once (EXPOSE_CAM) so the test entrance isn't re-detected every
    // frame, and the global stays off the normal runtime surface.
    if (EXPOSE_CAM) {
      (window as Window & { __sdpCam?: { x: number; z: number; yaw: number } }).__sdpCam = {
        x: camera.position.x,
        z: camera.position.z,
        yaw: yaw.current,
      };
    }
    if (inputFrozen()) return;
    const dt = Math.min(delta, 0.05);
    const speed = 6 * dt;
    const k = keys.current;
    // W/S or Up/Down = forward/back. A/D = strafe. LEFT/RIGHT arrows = TURN
    // (so you can spin around from the keyboard, not just by dragging).
    const fwd = (k['w'] || k['arrowup'] ? 1 : 0) - (k['s'] || k['arrowdown'] ? 1 : 0);
    const strafe = (k['d'] ? 1 : 0) - (k['a'] ? 1 : 0);
    const turn = (k['arrowleft'] ? 1 : 0) - (k['arrowright'] ? 1 : 0);
    yaw.current += turn * 2.0 * dt; // left arrow turns left, right turns right

    const fx = Math.sin(yaw.current);
    const fz = Math.cos(yaw.current);
    // Player's right vector (perpendicular to forward). Previously this was
    // negated, which made A/D strafe the wrong way (left/right inverted).
    const rx = -Math.cos(yaw.current);
    const rz = Math.sin(yaw.current);
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
