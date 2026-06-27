import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { roomById } from '../data/rooms';
import { useSceneStore } from '../state/sceneStore';
import { useProgressStore } from '../state/progressStore';
import { useScoreStore } from '../state/scoreStore';
import { itemById } from '../data/items';
import { lootById, lootDropsForRoom } from '../data/loot';
import { collectInventoryItem } from '../lib/pickups';
import { collectLootById } from '../lib/loot';
import { inputFrozen } from './inputFrozen';
import { exposeTestGlobal, isDebugEntrance } from '../lib/testHooks';

// Proximity pickups — the game-feel upgrade over click-only, for BOTH inventory
// items (items.ts: keys / cassettes / scrolls) and LOOT (loot.ts: the pizza-points
// collectathon). ONE controller (like Doors) scans the current room each frame and:
//   • publishes the nearest in PROMPT_RADIUS to sceneStore.nearPickup → the
//     "Press P to grab …" prompt (P is handled in WorldHud, the keyboard owner);
//   • AUTO-GRABS the nearest once you walk within AUTO_RADIUS — "just walk over it."
// Clicking the mesh still works (ItemPickup / LootPickup). All paths funnel through
// the same idempotent collectors, so they can't double-collect.
const PROMPT_RADIUS = 2.7; // show the grab prompt within this (you can press P)
const AUTO_RADIUS = 1.25; // walk this close and it's pocketed automatically
// Auto-grab ARMS only after you've walked this far from where you spawned, so you
// never vacuum a drop the instant you arrive on/near it (and a teleport-then-assert
// smoke keeps its window — it never moves, so auto-grab never arms).
const ARM_DIST = 1.6;

type Nearest = {
  id: string;
  kind: 'item' | 'loot';
  label: string;
  glyph: string;
  autoGrab: boolean;
};

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

    const room = roomById(st.currentRoom);
    const held = useProgressStore.getState().itemsHeld;
    const taken = useScoreStore.getState().taken;

    // Arm auto-grab once you've actually walked away from the spawn point.
    if (!armed.current && spawnPos.current) {
      const mdx = camera.position.x - spawnPos.current.x;
      const mdz = camera.position.z - spawnPos.current.z;
      if (Math.hypot(mdx, mdz) > ARM_DIST) armed.current = true;
    }

    // Nearest not-yet-collected thing — items AND loot (horizontal distance; both
    // bob at floor level so the vertical gap shouldn't count). Assigned inline (not
    // via a closure) so TS tracks the narrowing.
    const cx = camera.position.x;
    const cz = camera.position.z;
    let nearest: Nearest | null = null;
    let nd = Infinity;
    for (const p of room.pickups ?? []) {
      if (held.includes(p.itemId)) continue;
      const dist = Math.hypot(cx - p.position[0], cz - p.position[2]);
      if (dist < nd) {
        const it = itemById(p.itemId);
        nd = dist;
        nearest = {
          id: p.itemId,
          kind: 'item',
          label: it?.label ?? 'item',
          glyph: it?.glyph ?? '🎒',
          // KEYS are intentional/puzzle items — never auto-grabbed (you walk to a
          // locked door to learn you need one). Cassettes/scrolls auto-grab.
          autoGrab: it?.kind !== 'key',
        };
      }
    }
    for (const d of lootDropsForRoom(room)) {
      if (taken.includes(d.id)) continue;
      const dist = Math.hypot(cx - d.position[0], cz - d.position[2]);
      if (dist < nd) {
        const lt = lootById(d.type);
        nd = dist;
        nearest = {
          id: d.id,
          kind: 'loot',
          label: lt?.label ?? 'loot',
          glyph: lt?.glyph ?? '🍕',
          autoGrab: true,
        };
      }
    }

    // Walk-over auto-grab (armed only). It'll unmount next frame; clear + recompute.
    if (nearest && armed.current && nd < AUTO_RADIUS && nearest.autoGrab) {
      if (nearest.kind === 'loot') collectLootById(nearest.id);
      else collectInventoryItem(nearest.id);
      clearPrompt();
      return;
    }

    const inPrompt = nearest && nd < PROMPT_RADIUS ? nearest.id : null;
    if (inPrompt !== lastNear.current) {
      lastNear.current = inPrompt;
      st.setNearPickup(
        nearest && inPrompt
          ? { id: nearest.id, label: nearest.label, glyph: nearest.glyph, kind: nearest.kind }
          : null,
      );
    }
  });

  // Test hooks. Reads (?world / ?debug): the nearest pickup, the run score, and the
  // current room's remaining loot ids. The grab is an ACTION, so it's ?debug-only.
  useEffect(() => {
    exposeTestGlobal('__sdpNearPickup', () => useSceneStore.getState().nearPickup);
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
      exposeTestGlobal('__sdpNearPickup', undefined);
      exposeTestGlobal('__sdpScore', undefined);
      exposeTestGlobal('__sdpLootIds', undefined);
      exposeTestGlobal('__sdpGrabLoot', undefined);
    };
  }, []);

  return null;
}
