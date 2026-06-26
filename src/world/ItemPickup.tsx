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
import { itemById } from '../data/items';
import { spellById } from '../data/spells';
import { jukeboxTrackUrl, loopIndexForUrl } from '../data/music';

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
  const mesh = useRef<THREE.Mesh>(null);
  const item = itemById(itemId);

  // A small warm glint so a key reads as "pick me up" against a flat room.
  const mat = useMemo(() => {
    const m = flatMat('#e8c66a');
    m.emissive.set('#5a4410'); // self-lit a touch so it pops in a dim room
    return m;
  }, []);
  useEffect(() => () => mat.dispose(), [mat]);

  // Idle bob + slow spin — the universal "this is an item" language.
  useFrame((state) => {
    if (!mesh.current) return;
    const t = state.clock.elapsedTime;
    mesh.current.position.y = position[1] + Math.sin(t * 2) * 0.12;
    mesh.current.rotation.y = t * 1.1;
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
    <mesh
      ref={mesh}
      material={mat}
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
      {/* a stubby key-ish prism — small, readable, cheap */}
      <boxGeometry args={[0.18, 0.42, 0.18]} />
    </mesh>
  );
}
