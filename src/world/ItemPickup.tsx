import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useProgressStore } from '../state/progressStore';
import { useMusicStore } from '../state/musicStore';
import { announce } from '../state/toastStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';
import { flatMat } from './ps1';
import { itemById, type ItemKind } from '../data/items';
import { spellById } from '../data/spells';
import { jukeboxTrackUrl, loopIndexForUrl } from '../data/music';

// Per-KIND art so a key, a cassette, and a scroll never read as the same gold box
// (they used to). Cheap PS1 primitives + flat materials; each gets a faint emissive
// glint so it pops "pick me up" in a dim room. Built once per pickup, disposed on
// unmount. The parent group does the bob + spin, so each shape can pose freely.
function useItemArt(kind: ItemKind | undefined) {
  return useMemo(() => {
    const mats: THREE.Material[] = [];
    const mk = (color: string, emissive: string) => {
      const m = flatMat(color);
      m.emissive.set(emissive);
      mats.push(m);
      return m;
    };
    const build = () => {
      if (kind === 'trinket') {
        // a cassette tape — a WIDE, FLAT dark shell with a cream label (nothing
        // like the tall gold key).
        const shell = mk('#2b2733', '#15131c');
        const label = mk('#d8d2c0', '#3a382f');
        return (
          <group>
            <mesh material={shell}>
              <boxGeometry args={[0.4, 0.26, 0.07]} />
            </mesh>
            <mesh material={label} position={[0, 0.02, 0.037]}>
              <boxGeometry args={[0.3, 0.12, 0.012]} />
            </mesh>
          </group>
        );
      }
      if (kind === 'tome') {
        // a rolled scroll — a parchment cylinder on its side, darker end caps.
        const paper = mk('#d8c89a', '#4a4024');
        const cap = mk('#9a7b46', '#332813');
        return (
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh material={paper}>
              <cylinderGeometry args={[0.08, 0.08, 0.4, 12]} />
            </mesh>
            <mesh material={cap} position={[0, 0.205, 0]}>
              <cylinderGeometry args={[0.086, 0.086, 0.03, 12]} />
            </mesh>
            <mesh material={cap} position={[0, -0.205, 0]}>
              <cylinderGeometry args={[0.086, 0.086, 0.03, 12]} />
            </mesh>
          </group>
        );
      }
      // a key (default) — a tall gold shaft with a ring bow on top.
      const gold = mk('#e8c66a', '#5a4410');
      return (
        <group>
          <mesh material={gold} position={[0, -0.05, 0]}>
            <boxGeometry args={[0.13, 0.34, 0.13]} />
          </mesh>
          <mesh material={gold} position={[0, 0.21, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.1, 0.035, 8, 16]} />
          </mesh>
        </group>
      );
    };
    return { node: build(), mats };
  }, [kind]);
}

// A collectible lying in a room (Room.pickups). Click it to pocket it: a bright
// coin chime, a toast, and it goes into the durable inventory (progressStore).
// Modeled on ShrineRoom's OfferingBox — a clickable PS1 mesh with the pizza
// cursor on hover and a test hook so a smoke can collect deterministically.
// Renders NOTHING once held, so it's gone for good the moment you take it.
export function ItemPickup({
  itemId,
  position,
}: {
  itemId: string;
  position: [number, number, number];
}) {
  const { gl } = useThree();
  const held = useProgressStore((s) => s.itemsHeld.includes(itemId));
  const group = useRef<THREE.Group>(null);
  const item = itemById(itemId);

  const art = useItemArt(item?.kind);
  useEffect(() => () => art.mats.forEach((m) => m.dispose()), [art]);

  // Idle bob + slow spin — the universal "this is an item" language.
  useFrame((state) => {
    if (!group.current) return;
    const t = state.clock.elapsedTime;
    group.current.position.y = position[1] + Math.sin(t * 2) * 0.12;
    group.current.rotation.y = t * 1.1;
  });

  useEffect(
    () => () => {
      gl.domElement.style.cursor = 'grab';
    },
    [gl],
  );

  const doPickup = () => {
    const prog = useProgressStore.getState();
    if (prog.itemsHeld.includes(itemId)) return;
    audio.unlock();
    audio.playChime(noteToFreq('E', 6), 0, 0.14, 0.6); // a bright little pickup ring
    prog.collectItem(itemId);
    // Trinkets (the cassettes) tip a little luck; keys' reward is the door.
    if (item?.kind === 'trinket') prog.gainLuck(1);
    // A TOME (spell scroll): learn its spell — the reward IS the magic. A short
    // arcane flourish over the pickup ring, then point them at the cast key.
    if (item?.teachesSpell) {
      prog.learnSpell(item.teachesSpell);
      const spell = spellById(item.teachesSpell);
      audio.playChime(noteToFreq('C', 6), 0, 0.12, 0.7);
      audio.playChime(noteToFreq('G', 6), 0, 0.12, 0.9);
      // Drive the cast-key hint off the spell's own metadata so a new spell can't
      // desync the onboarding copy (Fireball = F, Light = L).
      const key = spell?.key.toUpperCase() ?? '?';
      announce(
        `${spell?.glyph ?? '✨'} You learned ${spell?.name ?? 'a spell'}! Press ${key} to cast.`,
        'crit-good',
      );
    } else if (item?.track) {
      const url = jukeboxTrackUrl(item.track);
      void audio.playJukeboxTrack(url);
      useMusicStore.getState().setPreferred(loopIndexForUrl(url));
      prog.unlockRadio();
      announce(`${item.glyph} ${item.label} — give it a spin · +1 luck`, 'luck');
    } else {
      announce(`${item?.glyph ?? '🎒'} You pocket the ${item?.label ?? 'item'}`, 'luck');
    }
    gl.domElement.style.cursor = 'grab';
  };

  // Test hook (?world / ?debug): collecting a bobbing 3D target through Playwright
  // is fragile, so expose a deterministic grab keyed by item id.
  useEffect(() => {
    exposeTestGlobal(`__sdpPickup:${itemId}`, doPickup);
    return () => exposeTestGlobal(`__sdpPickup:${itemId}`, undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  if (held) return null;

  return (
    <group
      ref={group}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        doPickup();
      }}
      onPointerOver={() => {
        gl.domElement.style.cursor = "url('/cursor.cur'), pointer";
      }}
      onPointerOut={() => {
        gl.domElement.style.cursor = 'grab';
      }}
    >
      {/* a generous INVISIBLE hit target so the thinner silhouettes (the key, the
          scroll) stay as easy to click as the old box — the visible art sits on top.
          A real (visible-to-the-raycaster) mesh at opacity 0, so it catches the
          click/hover but draws nothing and never occludes. */}
      <mesh>
        <boxGeometry args={[0.46, 0.52, 0.46]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      {art.node}
    </group>
  );
}
