import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture, makeTextTexture } from './ps1';
import { fogFor, type Room } from '../data/rooms';
import { useTipsyStore } from '../state/tipsyStore';
import { exposeTestGlobal } from '../lib/testHooks';
import { useDispose } from '../lib/useDispose';
import { ArcadeCabinet } from './ArcadeCabinet';

// ───────────────────────────────────────────────────────────────────────────
// NorthParkRoom — a North Park (San Diego) dusk boulevard under the iconic NORTH
// PARK gateway sign (a green scalloped board on a tall tiled-base pole). Storefront
// facades line the street; little BEERS sit on the curb — walk into one to drink
// it, and after a few the screen goes goofily blurry (see tipsyStore). Pure surface
// goof (taste guardrail). Plays "velma-what-a-night".
// ───────────────────────────────────────────────────────────────────────────

// The gateway sign: a tall steel pole on a banded art-deco base, crowned by a
// wide green board reading NORTH PARK in cream.
function NorthParkSign({ position = [0, 0, 0] }: { position?: [number, number, number] }) {
  const steelMat = useMemo(() => flatMat('#9aa0a6'), []);
  const boardMat = useMemo(() => flatMat('#15564a'), []); // deep green
  const trimMat = useMemo(() => flatMat('#e7dcc2'), []); // cream border
  const tileTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#14503f', '#c79a3a'); // green + gold deco tile
    t.repeat.set(6, 2);
    return t;
  }, []);
  const tileMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tileTex, fog: true }),
    [tileTex],
  );
  const textTex = useMemo(
    () => makeTextTexture('NORTH PARK', { fg: '#f4ead2', w: 512, h: 128 }),
    [],
  );
  const textMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: textTex, transparent: true, fog: true }),
    [textTex],
  );
  useDispose(tileTex, textTex);

  return (
    <group position={position}>
      {/* the tiled deco base */}
      <mesh material={tileMat} position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.7, 0.8, 1.8, 8]} />
      </mesh>
      {/* the tall steel pole */}
      <mesh material={steelMat} position={[0, 4.2, 0]}>
        <cylinderGeometry args={[0.22, 0.26, 5, 10]} />
      </mesh>
      {/* the green sign board, spanning across the street */}
      <group position={[0, 7.4, 0]}>
        <mesh material={trimMat} position={[0, 0, -0.06]}>
          <boxGeometry args={[7.4, 1.9, 0.18]} />
        </mesh>
        <mesh material={boardMat} position={[0, 0, 0.02]}>
          <boxGeometry args={[7.0, 1.55, 0.16]} />
        </mesh>
        {/* the cream NORTH PARK lettering, on both faces */}
        <mesh material={textMat} position={[0, 0.05, 0.12]}>
          <planeGeometry args={[6.4, 1.4]} />
        </mesh>
        <mesh material={textMat} position={[0, 0.05, -0.12]} rotation-y={Math.PI}>
          <planeGeometry args={[6.4, 1.4]} />
        </mesh>
        {/* a row of scallop bumps along the bottom edge (the deco silhouette) */}
        {Array.from({ length: 9 }, (_, i) => (
          <mesh key={i} material={boardMat} position={[-3.2 + i * 0.8, -0.95, 0]} rotation-z={0}>
            <cylinderGeometry args={[0.34, 0.34, 0.16, 8, 1, false, 0, Math.PI]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// One little beer on the curb: an amber cup with a white foam head + a handle.
// Walk within reach and it's "drunk" (tipsyStore.drink) — then it vanishes.
function BeerCup({ position }: { position: [number, number, number] }) {
  const { camera } = useThree();
  const grp = useRef<THREE.Group>(null);
  const drunk = useRef(false);
  const mats = useMemo(
    () => ({
      glass: new THREE.MeshBasicMaterial({
        color: '#e8a83a',
        transparent: true,
        opacity: 0.92,
        fog: true,
      }),
      foam: flatMat('#fbf3e0'),
      rim: flatMat('#d9c9a8'),
    }),
    [],
  );
  useEffect(
    () => () => {
      mats.glass.dispose();
      mats.foam.dispose();
      mats.rim.dispose();
    },
    [mats],
  );
  useFrame(() => {
    if (drunk.current || !grp.current) return;
    const dx = camera.position.x - position[0];
    const dz = camera.position.z - position[2];
    if (Math.hypot(dx, dz) < 1.3) {
      drunk.current = true;
      grp.current.visible = false;
      useTipsyStore.getState().drink();
    }
  });
  return (
    <group ref={grp} position={position}>
      <mesh material={mats.glass} position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.13, 0.1, 0.44, 8]} />
      </mesh>
      <mesh material={mats.foam} position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.14, 0.13, 0.1, 8]} />
      </mesh>
      <mesh material={mats.rim} position={[0.16, 0.24, 0]} rotation-z={Math.PI / 2}>
        <torusGeometry args={[0.09, 0.025, 6, 10, Math.PI]} />
      </mesh>
    </group>
  );
}

// A flat storefront facade — a coloured box with a row of window panes + an awning.
function Facade({
  position,
  rotationY = 0,
  color,
  awning,
}: {
  position: [number, number, number];
  rotationY?: number;
  color: string;
  awning: string;
}) {
  const wallMat = useMemo(() => flatMat(color), [color]);
  const winMat = useMemo(() => flatMat('#2a2620'), []);
  const awnMat = useMemo(() => flatMat(awning), [awning]);
  return (
    <group position={position} rotation-y={rotationY}>
      <mesh material={wallMat} position={[0, 2.4, 0]}>
        <boxGeometry args={[8, 4.8, 0.4]} />
      </mesh>
      {/* upper windows */}
      {[-2.6, -0.9, 0.9, 2.6].map((x) => (
        <mesh key={x} material={winMat} position={[x, 3.2, 0.22]}>
          <planeGeometry args={[1.1, 1.3]} />
        </mesh>
      ))}
      {/* an awning over the storefronts */}
      <mesh material={awnMat} position={[0, 1.5, 0.6]} rotation-x={-0.5}>
        <boxGeometry args={[7.2, 0.1, 1.2]} />
      </mesh>
    </group>
  );
}

export function NorthParkRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  const sidewalkTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#9a8a6e', '#a89878');
    t.repeat.set(10, 10);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(sidewalkTex, 12, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sidewalkTex, fog.color, fog.near, fog.far],
  );
  const roadMat = useMemo(() => flatMat('#2e2a2c'), []);
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffe1ad' }), []);

  // Beers scattered along both curbs, walking distance apart.
  const beers = useMemo(
    () =>
      [
        [-2.4, 0, 2],
        [2.2, 0, 0.5],
        [-2.6, 0, -1.5],
        [2.6, 0, -3],
        [-2.2, 0, -4.5],
        [2.4, 0, -6],
      ] as [number, number, number][],
    [],
  );

  // Test hooks (debug entrance only): force a drink, read the count + blur state.
  useEffect(() => {
    exposeTestGlobal('__sdpDrinkBeer', () => useTipsyStore.getState().drink());
    const sync = (s: { beersDrunk: number; blurry: boolean }) => {
      exposeTestGlobal('__sdpBeers', s.beersDrunk);
      exposeTestGlobal('__sdpTipsy', s.blurry);
    };
    sync(useTipsyStore.getState());
    const unsub = useTipsyStore.subscribe(sync);
    return () => {
      unsub();
      exposeTestGlobal('__sdpDrinkBeer', undefined);
      exposeTestGlobal('__sdpBeers', undefined);
      exposeTestGlobal('__sdpTipsy', undefined);
      // sober up on the way out — the gag is per-visit.
      useTipsyStore.getState().reset();
    };
  }, []);

  useDispose(sidewalkTex);

  return (
    <group>
      {/* warm dusk */}
      <hemisphereLight args={['#ffd6a0', '#5a4a3a', 0.7]} />
      <ambientLight intensity={0.5} color="#ffe0b8" />
      <directionalLight position={[-2, 5, -10]} intensity={0.5} color="#ffcaa0" />

      {/* the sidewalk */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[room.dims.halfW * 2 + 40, room.dims.halfD * 2 + 30]} />
      </mesh>
      {/* the road down the middle */}
      <mesh material={roadMat} rotation-x={-Math.PI / 2} position={[0, 0.01, -6]}>
        <planeGeometry args={[5.4, 40]} />
      </mesh>

      {/* storefront facades lining the block */}
      <Facade position={[-7.5, 0, -3]} rotationY={Math.PI / 2} color="#c98a3a" awning="#7a3b2a" />
      <Facade position={[7.5, 0, -3]} rotationY={-Math.PI / 2} color="#4aa6a0" awning="#2b6f6a" />

      {/* the low sun closing the boulevard */}
      <mesh material={sunMat} position={[0, 4.5, -24]}>
        <circleGeometry args={[2.4, 24]} />
      </mesh>

      {/* the NORTH PARK gateway sign mid-street */}
      <NorthParkSign position={[0, 0, -6]} />

      {/* the little beers */}
      {beers.map((p, i) => (
        <BeerCup key={i} position={p} />
      ))}

      {/* the one MYSTERY cabinet — a random-roll machine glowing on the +X curb (a
          slot-pull of games, the d20/luck chaos made a place); clear of the beers +
          the gateway sign. No `game` prop = it rolls. */}
      <ArcadeCabinet position={[6.5, 0, 1]} rotationY={-Math.PI / 2} tint="#e8b24a" />
    </group>
  );
}
