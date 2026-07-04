import { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { roomById } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useHeadingStore } from '../state/headingStore';
import { useScoreStore } from '../state/scoreStore';
import { useProgressStore } from '../state/progressStore';
import { JUMP_SECRET, DOUBLEJUMP_SECRET } from '../data/abilities';
import { isTestEntrance, exposeTestGlobal } from '../lib/testHooks';
import { inputFrozen } from './inputFrozen';
import { takeHeading } from './cameraRig';

// Gate the per-frame __sdpCam test global once at module load (it's read by the
// world smokes under ?world / ?debug) — never re-detected in the hot useFrame.
const EXPOSE_CAM = isTestEntrance();

// The Canvas camera's resting fov (World.tsx); sprint kicks it a touch wider.
const BASE_FOV = 72;
const REDUCED =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

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
  // Jump: bonus height above the eye line + its vertical velocity. Grounded when
  // hop === 0 and vy === 0; holding Space bunny-hops (deliberate — it feels good).
  const hop = useRef(0);
  const hopVy = useRef(0);
  // How many hops used since last touching the ground (for the double-jump
  // upgrade), plus a Space rising-edge latch so the mid-air second jump needs a
  // FRESH press (holding Space bunny-hops off the ground but never auto-doubles).
  const airJumps = useRef(0);
  const spaceWasDown = useRef(false);
  // Throttle accumulator for publishing the camera pose to the heading store.
  const headAccum = useRef(0);
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
    hop.current = 0;
    hopVy.current = 0;
    airJumps.current = 0;
    spaceWasDown.current = false;
    takeHeading(); // drain any pending scripted heading so it can't leak across a room change
    // Expose the current room id for smokes that need to tell same-titled rooms
    // apart (e.g. the night vs day Main Street, both titled "Main Street").
    exposeTestGlobal('__sdpRoom', currentRoom);
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
      // Space is the jump key. When it's aimed at a focused form control / button /
      // link, it BELONGS to that control (activate the button, type a space in the
      // terminal) — so bail entirely: don't preventDefault AND don't record it into
      // `keys`, or a UI Space would silently arm a world hop on the next frame
      // (the "never steals Space from inputs/buttons" promise). Otherwise it's a
      // world Space: stop it scrolling the page behind the canvas, and record it.
      if (e.key === ' ') {
        const t = e.target as HTMLElement | null;
        const interactive =
          t &&
          (t.tagName === 'INPUT' ||
            t.tagName === 'TEXTAREA' ||
            t.tagName === 'BUTTON' ||
            t.tagName === 'A' ||
            t.isContentEditable);
        if (interactive) return;
        e.preventDefault();
      }
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
      (
        window as Window & { __sdpCam?: { x: number; y: number; z: number; yaw: number } }
      ).__sdpCam = {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        yaw: yaw.current,
      };
    }
    if (inputFrozen()) return;
    // A scripted camera move (the tube-slide ride) just ended: adopt the heading
    // it left the camera at, so the view doesn't snap back to the pre-ride yaw.
    const handoff = takeHeading();
    if (handoff) {
      yaw.current = handoff.yaw;
      pitch.current = handoff.pitch ?? -0.04;
      // If you jumped INTO the slide, the hop arc froze mid-flight while the ride
      // drove the camera; clear it so this first live frame can't resume that
      // stale arc and fight the ride's scripted exit height.
      hop.current = 0;
      hopVy.current = 0;
      airJumps.current = 0;
      spaceWasDown.current = false;
    }
    const dt = Math.min(delta, 0.05);
    const k = keys.current;
    // SPRINT: hold Shift to move faster, with a little FOV kick for speed-feel
    // (the kick is dropped under reduced motion). Pure feel — the world clamps
    // still hold. W/S or Up/Down = forward/back. A/D = strafe. LEFT/RIGHT = TURN.
    const fwd = (k['w'] || k['arrowup'] ? 1 : 0) - (k['s'] || k['arrowdown'] ? 1 : 0);
    const strafe = (k['d'] ? 1 : 0) - (k['a'] ? 1 : 0);
    const moving = fwd !== 0 || strafe !== 0;
    const sprinting = !!k['shift'] && moving;
    const speed = 6 * (sprinting ? 1.7 : 1) * dt;
    const pcam = camera as THREE.PerspectiveCamera;
    const targetFov = BASE_FOV + (REDUCED ? 0 : sprinting ? 7 : 0);
    if (Math.abs(pcam.fov - targetFov) > 0.05) {
      pcam.fov += (targetFov - pcam.fov) * Math.min(1, dt * 8);
      pcam.updateProjectionMatrix();
    }
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
    // JUMP: Space hops (a little videogame joy). Simple ballistic arc on top of
    // the eye line; grounded = arc finished. Both verbs are LEARNED, not given:
    // JUMP in the first room (the shop orb), DOUBLE JUMP out at the Jumping Turtle
    // (its stage orb). Before you've learned jump, Space does nothing.
    const grounded = hop.current === 0 && hopVy.current === 0;
    const spaceDown = !!k[' '];
    const spaceEdge = spaceDown && !spaceWasDown.current; // a fresh press this frame
    if (grounded) airJumps.current = 0;
    if (spaceDown || !grounded) {
      // Read the learned verbs once per relevant frame (cheap; only when airborne
      // or Space is down), never every idle frame.
      const secrets = useProgressStore.getState().secretsFound;
      if (grounded && spaceDown && secrets.includes(JUMP_SECRET)) {
        hopVy.current = 4.6; // ground jump (holding Space re-hops → bunny hop)
        airJumps.current = 1;
      } else if (
        !grounded &&
        spaceEdge && // a SECOND, deliberate press mid-air
        airJumps.current < 2 &&
        secrets.includes(DOUBLEJUMP_SECRET)
      ) {
        hopVy.current = 3.9; // the mid-air second hop (a touch softer)
        airJumps.current = 2;
      }
    }
    spaceWasDown.current = spaceDown;
    if (hop.current > 0 || hopVy.current !== 0) {
      hopVy.current -= 13.5 * dt; // floaty-fun gravity, not simulation
      hop.current += hopVy.current * dt;
      if (hop.current <= 0) {
        hop.current = 0;
        hopVy.current = 0; // landed
      }
    }
    // "Lol, taller": collecting loot grows your eye height (scoreStore.tallness),
    // clamped under THIS room's ceiling so you never poke through the roof —
    // the jump arc is clamped under the same ceiling.
    const grow = Math.min(useScoreStore.getState().tallness, Math.max(0, d.height - d.eye - 0.4));
    camera.position.y = Math.min(d.height - 0.4, d.eye + grow + hop.current);

    const dir = new THREE.Vector3(
      Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      Math.cos(yaw.current) * Math.cos(pitch.current),
    );
    camera.lookAt(camera.position.x + dir.x, camera.position.y + dir.y, camera.position.z + dir.z);

    // Publish the camera pose (room-local x/z + yaw) for the DOM objective compass,
    // throttled to ~15 Hz so a per-frame store write doesn't churn React. Only here
    // (past the inputFrozen guard), so it's never written during pause/transition.
    headAccum.current += dt;
    if (headAccum.current >= 0.066) {
      headAccum.current = 0;
      useHeadingStore.getState().set(camera.position.x, camera.position.z, yaw.current);
    }
  });

  return null;
}
