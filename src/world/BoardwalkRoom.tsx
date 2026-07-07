import { useMemo } from 'react';
import * as THREE from 'three';
import { flatMat, makeAffineTexturedMaterial, makeCheckerTexture } from './ps1';
import { useDispose } from '../lib/useDispose';
import { Water } from './Water';
import { ArcadeCabinet } from './ArcadeCabinet';
import { fogFor, type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// BoardwalkRoom — the head of the Boardwalk wing. Step out the side of the shop
// onto a golden-hour SoCal pier over the (degraded, crunchy) sea: weathered
// planks, a rail you can lean on, pilings running down into the water, a low sun
// near the fog line. Sweet + goofy — the surface stays safe (taste guardrail).
//
// Outdoor + open like the shrine (no RoomBox cage): the palette is the sky, the
// sea is out the -Z edge, and the palms / arcade cabinet ride in as room.props.
// PS1 register throughout (flat-shaded, vertex-snapped, affine sand, fogged).
// ───────────────────────────────────────────────────────────────────────────

// A run of pier railing: posts + a top rail along one side of the deck (at ±x).
function Railing({ x, mat }: { x: number; mat: THREE.Material }) {
  const posts = useMemo(() => {
    const zs: number[] = [];
    for (let z = -8.5; z <= 7.5; z += 1.6) zs.push(z);
    return zs;
  }, []);
  return (
    <group position={[x, 0, 0]}>
      {posts.map((z, i) => (
        <mesh key={i} material={mat} position={[0, 0.7, z]}>
          <boxGeometry args={[0.16, 1.4, 0.16]} />
        </mesh>
      ))}
      {/* top rail */}
      <mesh material={mat} position={[0, 1.32, -0.5]}>
        <boxGeometry args={[0.18, 0.16, 17]} />
      </mesh>
    </group>
  );
}

export function BoardwalkRoom({ room }: { room: Room }) {
  const fog = fogFor(room);

  // Warm tan beach sand — affine on the ground so it swims as you stroll.
  const sandTex = useMemo(() => {
    const t = makeCheckerTexture(8, '#d8c08a', '#e9d6a6'); // two warm sands
    t.repeat.set(8, 8);
    return t;
  }, []);
  const groundMat = useMemo(
    () => makeAffineTexturedMaterial(sandTex, 10, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sandTex, fog.color, fog.near, fog.far],
  );
  // Sun-bleached plank deck — a wood-tone checker for the board seams.
  const plankTex = useMemo(() => {
    const t = makeCheckerTexture(6, '#a9774a', '#c69a63'); // weathered boards
    t.repeat.set(2, 10);
    return t;
  }, []);
  const deckMat = useMemo(
    () => makeAffineTexturedMaterial(plankTex, 2, fog),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plankTex, fog.color, fog.near, fog.far],
  );
  const railMat = useMemo(() => flatMat('#7a5230'), []);
  const pilingMat = useMemo(() => flatMat('#5e3f25'), []);
  const sunMat = useMemo(() => new THREE.MeshBasicMaterial({ color: '#ffdf9c' }), []);

  useDispose(sandTex, plankTex);

  // pilings marching down into the sea under the deck
  const pilings = useMemo(() => {
    const out: [number, number][] = [];
    for (let z = -9; z >= -16; z -= 2.4) {
      out.push([-2.4, z]);
      out.push([2.4, z]);
    }
    return out;
  }, []);

  return (
    <group>
      {/* golden-hour light: warm sky/ground hemisphere + a low raking sun */}
      <hemisphereLight args={['#ffd9a0', '#9a7b54', 0.85]} />
      <ambientLight intensity={0.4} color="#ffe7c2" />
      <directionalLight position={[-2, 4, -12]} intensity={0.8} color="#ffca7a" />

      {/* the beach: a wide sand plane under everything */}
      <mesh material={groundMat} rotation-x={-Math.PI / 2} position={[0, 0, 2]}>
        <planeGeometry args={[room.dims.halfW * 2 + 40, room.dims.halfD * 2 + 30]} />
      </mesh>

      {/* the pier deck — a raised plank runway from the shop steps (+Z) out over
          the water (-Z) */}
      <mesh material={deckMat} rotation-x={-Math.PI / 2} position={[0, 0.16, -1]}>
        <planeGeometry args={[6, 24]} />
      </mesh>
      {/* deck edge lips so it reads as a raised boardwalk, not a painted strip */}
      <mesh material={railMat} position={[-3, 0.08, -1]}>
        <boxGeometry args={[0.18, 0.22, 24]} />
      </mesh>
      <mesh material={railMat} position={[3, 0.08, -1]}>
        <boxGeometry args={[0.18, 0.22, 24]} />
      </mesh>

      {/* a rail down both sides to lean on */}
      <Railing x={-2.9} mat={railMat} />
      <Railing x={2.9} mat={railMat} />

      {/* pilings down into the sea past the deck's end */}
      {pilings.map(([x, z], i) => (
        <mesh key={i} material={pilingMat} position={[x, -0.6, z]}>
          <boxGeometry args={[0.32, 3.2, 0.32]} />
        </mesh>
      ))}

      {/* the degraded sea out past the pier — the shop's own crunchy water, tinted
          for golden hour and dropped below the deck */}
      <Water
        base="#1f93b8"
        crest="#ffe6b0"
        fog={room.palette.fog}
        fogNear={room.palette.fogNear}
        fogFar={room.palette.fogFar}
        y={-1.1}
        z={-24}
      />

      {/* the low dusk sun sitting on the horizon at the fog line */}
      <mesh material={sunMat} position={[-3.5, 4.2, -26]}>
        <circleGeometry args={[2.6, 22]} />
      </mesh>

      {/* a procedural arcade cabinet on the pier (a real CRT + joystick), angled to
          face the player stepping out of the shop — CRUSTEROIDS, a boardwalk shooter */}
      <ArcadeCabinet position={[2.9, 0, 0.5]} rotationY={-0.4} tint="#2f9fb8" game="crusteroids" />
    </group>
  );
}
