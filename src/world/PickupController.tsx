import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { roomById } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { itemById } from '../data/items';
import { collectInventoryItem } from '../lib/pickups';
import { inputFrozen } from './inputFrozen';
import { exposeTestGlobal } from '../lib/testHooks';

// Proximity pickups — the game-feel upgrade over click-only. ONE controller (like
// Doors) scans the current room's collectibles each frame against the camera and:
//   • publishes the nearest in PROMPT_RADIUS to sceneStore.nearPickup → the
//     "Press P to grab …" prompt (P is handled in WorldHud, the keyboard owner);
//   • AUTO-GRABS the nearest once you walk within AUTO_RADIUS — "just walk over it."
// Clicking the mesh still works (ItemPickup) — all paths funnel through the same
// idempotent collectInventoryItem, so they can't double-collect.
const PROMPT_RADIUS = 2.7; // show the grab prompt within this (you can press P)
const AUTO_RADIUS = 1.25; // walk this close and it's pocketed automatically
// Auto-grab ARMS only after you've walked this far from where you spawned, so you
// never vacuum an item the instant you arrive on/near it (and a teleport-then-
// assert smoke keeps its window — it never moves, so auto-grab never arms).
const ARM_DIST = 1.6;

export function PickupController() {
  const { camera } = useThree();
  const currentRoom = useSceneStore((s) => s.currentRoom);
  // Re-arm on every (re)spawn — same nonce Controls uses to reposition the camera.
  const roomNonce = useSceneStore((s) => s.roomNonce);
  const lastNear = useRef<string | null>(null);
  const spawnPos = useRef<{ x: number; z: number } | null>(null);
  const armed = useRef(false);

  // On (re)spawn: remember where you arrived, disarm auto-grab, clear the prompt.
  useEffect(() => {
    spawnPos.current = { x: camera.position.x, z: camera.position.z };
    armed.current = false;
    lastNear.current = null;
    useSceneStore.getState().setNearPickup(null);
  }, [currentRoom, roomNonce, camera]);

  useFrame(() => {
    const st = useSceneStore.getState();
    const clearPrompt = () => {
      if (lastNear.current !== null) {
        lastNear.current = null;
        st.setNearPickup(null);
      }
    };
    if (inputFrozen()) return clearPrompt();

    const pickups = roomById(st.currentRoom).pickups;
    if (!pickups?.length) return clearPrompt();
    const held = useProgressStore.getState().itemsHeld;

    // Arm auto-grab once you've actually walked away from the spawn point.
    if (!armed.current && spawnPos.current) {
      const mdx = camera.position.x - spawnPos.current.x;
      const mdz = camera.position.z - spawnPos.current.z;
      if (Math.hypot(mdx, mdz) > ARM_DIST) armed.current = true;
    }

    // Nearest not-yet-held pickup (horizontal distance — items bob at floor level).
    let nearestId: string | null = null;
    let nd = Infinity;
    for (const p of pickups) {
      if (held.includes(p.itemId)) continue;
      const dx = camera.position.x - p.position[0];
      const dz = camera.position.z - p.position[2];
      const dist = Math.hypot(dx, dz);
      if (dist < nd) {
        nd = dist;
        nearestId = p.itemId;
      }
    }

    // Walk-over auto-grab (armed only). KEYS are excluded — they're intentional /
    // puzzle items (you walk up to a locked door to learn you need one), so you
    // grab them on purpose with P or a click, never by brushing past. Cassettes,
    // scrolls, and loot are gifts you always want, so those DO auto-grab. It'll
    // unmount next frame; clear + recompute.
    if (nearestId && armed.current && nd < AUTO_RADIUS && itemById(nearestId)?.kind !== 'key') {
      collectInventoryItem(nearestId);
      clearPrompt();
      return;
    }

    const inPrompt = nearestId && nd < PROMPT_RADIUS ? nearestId : null;
    if (inPrompt !== lastNear.current) {
      lastNear.current = inPrompt;
      if (inPrompt) {
        const it = itemById(inPrompt);
        st.setNearPickup({ id: inPrompt, label: it?.label ?? 'item', glyph: it?.glyph ?? '🎒' });
      } else {
        st.setNearPickup(null);
      }
    }
  });

  // Read-only test hook: the nearest pickup descriptor (or null) for the smokes.
  useEffect(() => {
    exposeTestGlobal('__sdpNearPickup', () => useSceneStore.getState().nearPickup);
    return () => exposeTestGlobal('__sdpNearPickup', undefined);
  }, []);

  return null;
}
