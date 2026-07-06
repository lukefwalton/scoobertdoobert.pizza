import { useMemo } from 'react';
import * as THREE from 'three';
import { flatMat, makeTextTexture } from './ps1';
import { useDispose } from '../lib/useDispose';
import { useProgressStore, selectLuck } from '../state/progressStore';
import { CASSETTE_IDS } from '../data/items';

// ───────────────────────────────────────────────────────────────────────────
// ShopFittings — the "Trophy Pizzeria" dressing on the beach shop (ROOMS[0], the
// first room + top of the music ladder). A real service COUNTER under the (once
// floating) bell + cassette, and a back-bar HALL OF FAME that GROWS with what
// you've done — the 3D echo of the storefront's "the site remembers you":
//   · the 100% finale AWARD (a little gold record) takes pride of place once the
//     durable 'finale' secret banks;
//   · collected cassettes line up on the shelf (itemsHeld ∩ CASSETTE_IDS);
//   · a lucky clover once your luck is up (≥3);
//   · a goblin trophy once you've seen off the grass goblin ('grass-cleared').
// Each gated on its durable progress signal (the same reactive pattern as the 2D
// storefront's PlainFloor), so returning deeper/luckier visibly changes the lobby.
// Sweet, PS1, original-parody — the surface zone stays goofy (taste guardrail).
// Placed on the -X side (clear of the kitchen door at z=3, the sea window at -Z,
// and the spawn's establishing shot).
// ───────────────────────────────────────────────────────────────────────────

// A single molded cassette (a dark box with a lighter label face) on the shelf.
function Cassette({
  position,
  body,
  label,
}: {
  position: [number, number, number];
  body: THREE.Material;
  label: THREE.Material;
}) {
  return (
    <group position={position} rotation-y={Math.PI / 2}>
      <mesh material={body}>
        <boxGeometry args={[0.3, 0.18, 0.06]} />
      </mesh>
      <mesh material={label} position={[0, 0.01, 0.032]}>
        <planeGeometry args={[0.24, 0.1]} />
      </mesh>
    </group>
  );
}

export function ShopFittings() {
  // Reactive hall-of-fame signals — mirror PlainFloor's storefront twin.
  const finale = useProgressStore((s) => s.secretsFound.includes('finale'));
  const grassCleared = useProgressStore((s) => s.secretsFound.includes('grass-cleared'));
  const luck = useProgressStore(selectLuck);
  const tapes = useProgressStore(
    (s) => s.itemsHeld.filter((id) => CASSETTE_IDS.includes(id)).length,
  );

  // ── textures ──────────────────────────────────────────────────────────────
  const menuTex = useMemo(
    () =>
      makeTextTexture('TODAY\nSLICE $3 · PIE $18\nUNRELEASED DEMO — free', {
        fg: '#3a2410',
        bg: '#e9dcc0',
        w: 128,
        h: 128,
      }),
    [],
  );
  const neonTex = useMemo(
    () => makeTextTexture('OPEN', { fg: '#ff5a72', bg: 'transparent', w: 128, h: 64 }),
    [],
  );
  const plaqueTex = useMemo(
    () => makeTextTexture('SEEN\nIT ALL', { fg: '#2a1e06', bg: '#f0d27a', w: 96, h: 96 }),
    [],
  );
  const labelTex = useMemo(
    () => makeTextTexture('◼◼', { fg: '#c8b088', bg: '#1a1a20', w: 64, h: 32 }),
    [],
  );

  // ── materials ─────────────────────────────────────────────────────────────
  const woodMat = useMemo(() => flatMat('#8a5a34'), []);
  const woodDarkMat = useMemo(() => flatMat('#5e3c22'), []);
  const topMat = useMemo(() => flatMat('#a06e40'), []);
  const shelfMat = useMemo(() => flatMat('#6e4626'), []);
  const registerMat = useMemo(() => flatMat('#2b2b30'), []);
  const goldMat = useMemo(() => flatMat('#e8c24a'), []);
  const goldDarkMat = useMemo(() => flatMat('#8a6a1a'), []);
  const cassetteMat = useMemo(() => flatMat('#2a2a30'), []);
  const cloverMat = useMemo(() => flatMat('#3f9a3a', { side: THREE.DoubleSide }), []);
  const goblinMat = useMemo(() => flatMat('#5a8a3a'), []);
  const goblinEyeMat = useMemo(() => flatMat('#d84a3a'), []);
  const menuMat = useMemo(() => new THREE.MeshBasicMaterial({ map: menuTex }), [menuTex]);
  const neonMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: neonTex, transparent: true }),
    [neonTex],
  );
  const plaqueMat = useMemo(() => new THREE.MeshBasicMaterial({ map: plaqueTex }), [plaqueTex]);
  const labelMat = useMemo(() => new THREE.MeshBasicMaterial({ map: labelTex }), [labelTex]);

  useDispose(
    menuTex,
    neonTex,
    plaqueTex,
    labelTex,
    woodMat,
    woodDarkMat,
    topMat,
    shelfMat,
    registerMat,
    goldMat,
    goldDarkMat,
    cassetteMat,
    cloverMat,
    goblinMat,
    goblinEyeMat,
    menuMat,
    neonMat,
    plaqueMat,
    labelMat,
  );

  // Cassettes fanned along the lower shelf (one per collected tape, capped so a
  // full run still fits the shelf).
  const cassettePos: [number, number, number][] = Array.from(
    { length: Math.min(tapes, CASSETTE_IDS.length) },
    (_, i) => [-7.28, 1.46, -2.5 + i * 0.34],
  );

  return (
    <group>
      {/* ── the service counter (under the bell + cassette) ── */}
      <mesh material={woodDarkMat} position={[-2.9, 0.5, -0.4]}>
        <boxGeometry args={[4.2, 1.0, 1.3]} />
      </mesh>
      <mesh material={topMat} position={[-2.9, 1.02, -0.35]}>
        <boxGeometry args={[4.5, 0.09, 1.6]} />
      </mesh>
      {/* a register on the counter */}
      <mesh material={registerMat} position={[-1.4, 1.2, -0.5]}>
        <boxGeometry args={[0.5, 0.32, 0.4]} />
      </mesh>
      <mesh material={registerMat} position={[-1.4, 1.42, -0.62]} rotation-x={-0.5}>
        <boxGeometry args={[0.44, 0.28, 0.04]} />
      </mesh>

      {/* ── the back-bar hall-of-fame against the -X wall ── */}
      <mesh material={woodMat} position={[-7.65, 1.7, -1.1]}>
        <boxGeometry args={[0.15, 2.4, 4.2]} />
      </mesh>
      {[1.35, 1.95].map((y, i) => (
        <mesh key={i} material={shelfMat} position={[-7.3, y, -1.1]}>
          <boxGeometry args={[0.55, 0.08, 4.0]} />
        </mesh>
      ))}
      {/* the hand-painted menu board, high on the wall over the bar */}
      <mesh material={menuMat} position={[-7.86, 3.3, -1.1]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[2.6, 1.5]} />
      </mesh>
      {/* the OPEN neon over the counter (self-lit) */}
      <mesh material={neonMat} position={[-2.9, 2.6, -1.0]}>
        <planeGeometry args={[1.4, 0.7]} />
      </mesh>

      {/* ── the REACTIVE trophies — each grows in as you earn it ── */}
      {/* the 100% finale award: a little gold record on a stand, pride of place */}
      {finale && (
        <group position={[-7.25, 2.02, -1.1]}>
          <mesh material={goldDarkMat} position={[0, -0.05, 0]}>
            <boxGeometry args={[0.24, 0.08, 0.12]} />
          </mesh>
          <mesh material={goldMat} rotation-x={-0.35} position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.02, 16]} />
          </mesh>
          <mesh material={goldDarkMat} rotation-x={-0.35} position={[0, 0.16, 0.011]}>
            <cylinderGeometry args={[0.05, 0.05, 0.021, 12]} />
          </mesh>
          <mesh material={plaqueMat} position={[0, -0.02, 0.07]}>
            <planeGeometry args={[0.2, 0.12]} />
          </mesh>
        </group>
      )}
      {/* collected cassettes line up on the lower shelf */}
      {cassettePos.map((p, i) => (
        <Cassette key={i} position={p} body={cassetteMat} label={labelMat} />
      ))}
      {/* a lucky clover once your luck is up */}
      {luck >= 3 && (
        <group position={[-7.25, 2.12, -2.5]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              material={cloverMat}
              position={[Math.cos((i * Math.PI) / 2) * 0.08, 0, Math.sin((i * Math.PI) / 2) * 0.08]}
            >
              <circleGeometry args={[0.08, 8]} />
            </mesh>
          ))}
        </group>
      )}
      {/* the goblin trophy once you've seen off the grass goblin */}
      {grassCleared && (
        <group position={[-7.25, 2.02, 0.4]}>
          <mesh material={goldDarkMat} position={[0, -0.02, 0]}>
            <boxGeometry args={[0.24, 0.06, 0.14]} />
          </mesh>
          <mesh material={goblinMat} position={[0, 0.16, 0]}>
            <boxGeometry args={[0.22, 0.24, 0.18]} />
          </mesh>
          {[-0.05, 0.05].map((x, i) => (
            <mesh key={i} material={goblinEyeMat} position={[x, 0.18, 0.1]}>
              <boxGeometry args={[0.04, 0.04, 0.02]} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}
