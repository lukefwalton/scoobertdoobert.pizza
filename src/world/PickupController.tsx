import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { roomById } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { useScoreStore } from '../state/scoreStore';
import { lootDropsForRoom } from '../data/loot';
import { collectInventoryItem } from '../lib/pickups';
import { collectLootById } from '../lib/loot';
import { inputFrozen } from './inputFrozen';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';

// Walk-over pickups — the game-feel upgrade over click-only, for BOTH inventory
// items (items.ts: cassettes / scrolls) and LOOT (loot.ts: the pizza-points
// collectathon). ONE controller (like Doors) scans the current room each frame and
// AUTO-GRABS the nearest not-yet-collected thing once you walk within AUTO_RADIUS —
// "just walk over it". Clicking the mesh still works for anything (ItemPickup /
// LootPickup). All paths funnel through the same idempotent collectors, so they
// can't double-collect. (There is no grab VERB: the P key + its "Press P" prompt
// existed only for the key items, cut in 2026-10 with the locked doors.)
const AUTO_RADIUS = 1.25; // walk this close and it's pocketed automatically
// Auto-grab ARMS only after you've walked this far from where you spawned, so you
// never vacuum a drop the instant you arrive on/near it (and a teleport-then-assert
// smoke keeps its window — it never moves, so auto-grab never arms).
const ARM_DIST = 1.6;

type Nearest = { id: string; kind: 'item' | 'loot' };

export function PickupController() {
  const { camera } = useThree();
  const currentRoom = useSceneStore((s) => s.currentRoom);
  // Re-arm on every (re)spawn — same nonce Controls uses to reposition the camera.
  const roomNonce = useSceneStore((s) => s.roomNonce);
  const spawnPos = useRef<{ x: number; z: number } | null>(null);
  const armed = useRef(false);

  // On (re)spawn: remember where you arrived and disarm auto-grab.
  useEffect(() => {
    spawnPos.current = { x: camera.position.x, z: camera.position.z };
    armed.current = false;
  }, [currentRoom, roomNonce, camera]);

  useFrame(() => {
    if (inputFrozen()) return;
    const st = useSceneStore.getState();
    const room = roomById(st.currentRoom);
    const held = useProgressStore.getState().itemsHeld;
    const taken = useScoreStore.getState().taken;

    // Arm auto-grab once you've actually walked away from the spawn point.
    if (!armed.current && spawnPos.current) {
      const mdx = camera.position.x - spawnPos.current.x;
      const mdz = camera.position.z - spawnPos.current.z;
      if (Math.hypot(mdx, mdz) > ARM_DIST) armed.current = true;
    }
    if (!armed.current) return;

    // Nearest not-yet-collected thing — items AND loot (horizontal distance; both
    // bob at floor level so the vertical gap shouldn't count).
    const cx = camera.position.x;
    const cz = camera.position.z;
    let nearest: Nearest | null = null;
    let nd = Infinity;
    for (const p of room.pickups ?? []) {
      if (held.includes(p.itemId)) continue;
      const dist = Math.hypot(cx - p.position[0], cz - p.position[2]);
      if (dist < nd) {
        nd = dist;
        nearest = { id: p.itemId, kind: 'item' };
      }
    }
    for (const d of lootDropsForRoom(room)) {
      if (taken.includes(d.id)) continue;
      const dist = Math.hypot(cx - d.position[0], cz - d.position[2]);
      if (dist < nd) {
        nd = dist;
        nearest = { id: d.id, kind: 'loot' };
      }
    }

    // Walk-over auto-grab. The mesh unmounts next frame; the next scan recomputes.
    if (nearest && nd < AUTO_RADIUS) {
      if (nearest.kind === 'loot') collectLootById(nearest.id);
      else collectInventoryItem(nearest.id);
    }
  });

  // Test hooks. Reads (?world / ?debug): the run score and the current room's
  // remaining loot ids. The grab is an ACTION, so it's ?debug-only.
  useEffect(() => {
    exposeTestGlobal('__sdpScore', () => {
      const s = useScoreStore.getState();
      return {
        score: s.score,
        combo: s.combo,
        bestCombo: s.bestCombo,
        tallness: s.tallness,
        best: useProgressStore.getState().pizzaPointsBest,
      };
    });
    exposeTestGlobal('__sdpLootIds', () => {
      const taken = useScoreStore.getState().taken;
      return lootDropsForRoom(roomById(useSceneStore.getState().currentRoom))
        .map((d) => d.id)
        .filter((id) => !taken.includes(id));
    });
    if (isDebugEntrance()) exposeTestGlobal('__sdpGrabLoot', (id: string) => collectLootById(id));
    return () => {
      exposeTestGlobal('__sdpScore', undefined);
      exposeTestGlobal('__sdpLootIds', undefined);
      exposeTestGlobal('__sdpGrabLoot', undefined);
    };
  }, []);

  return null;
}
