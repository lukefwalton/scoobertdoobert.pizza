import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// RoomLight — the LIGHT cantrip's world effect: the gentle counterpart to the
// Fireball. A soft mote of candle-warm light lifts to mid-room and holds for a
// while, raising a calm ambient + point light so a dark room "remembers its
// corners" — genuinely useful in the dread depths, and free to cast (cantrip).
// Mounted once in World; watches the cast nonce, gated on castingSpell==='light'.
//
// SAFETY (WCAG 2.3.1): a STEADY light — smooth ~1s ramp, long hold, ~2s fade, NO
// flicker at all (unlike fire). Calm by design; the contrast with Fireball's lick
// is the point. Additive orb with fog:false so it reads in the darkest rooms.
// ───────────────────────────────────────────────────────────────────────────

const LIGHT_MS = 16000; // a long, useful glow (it's your "see in the dark" tool)
const AMBIENT_PEAK = 0.55;
const POINT_PEAK = 1.9;

// Smooth attack → long hold → smooth release. No discontinuities (WCAG-safe), and
// crucially NO flicker term — Light is a calm, steady glow.
function holdEnvelope(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  const A = 0.06;
  const R = 0.85;
  if (t < A) {
    const x = t / A;
    return x * x * (3 - 2 * x);
  }
  if (t > R) {
    const x = (1 - t) / (1 - R);
    return x * x * (3 - 2 * x);
  }
  return 1;
}

export function RoomLight({ room }: { room: Room }) {
  const castNonce = useSceneStore((s) => s.castNonce);
  const castingSpell = useSceneStore((s) => s.castingSpell);

  const ambient = useRef<THREE.AmbientLight>(null);
  const point = useRef<THREE.PointLight>(null);
  const orb = useRef<THREE.Mesh>(null);

  const igniteAt = useRef<number>(-1);
  const lastNonce = useRef<number>(castNonce);
  const active = useRef<boolean>(false);
  // The room the glow was cast in — so it can't bleed through a door (RoomLight is
  // mounted once at world scope; this binds an active glow to its origin room).
  const igniteRoom = useRef<string>(room.id);

  const orbMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffe9c0',
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        opacity: 0,
      }),
    [],
  );
  useEffect(() => () => orbMat.dispose(), [orbMat]);

  // The mote hangs at a comfortable mid-room height (capped for tall GLB levels).
  const orbY = Math.min(room.dims.height * 0.6, 2.6);

  useEffect(() => {
    if (castNonce === lastNonce.current) return;
    lastNonce.current = castNonce;
    if (castingSpell !== 'light') return;
    igniteAt.current = -1;
    igniteRoom.current = room.id; // bind this glow to the room it was cast in
    active.current = true;
    // A soft, bright twin-chime — a "ting" of light (calm, not a whoomph).
    audio.playChime(noteToFreq('E', 6), 0, 0.12, 0.9);
    audio.playChime(noteToFreq('B', 6), 0.2, 0.1, 1.1);
    exposeTestGlobal('__sdpLight', { nonce: castNonce, room: room.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [castNonce, castingSpell]);

  useFrame((state) => {
    if (!active.current) return;
    const now = state.clock.elapsedTime;
    if (igniteAt.current < 0) igniteAt.current = now;
    const t = (now - igniteAt.current) / (LIGHT_MS / 1000);
    const env = holdEnvelope(t);

    // Done when the glow finishes OR you've left the room you cast it in (no
    // bleed through a door).
    const leftRoom = room.id !== igniteRoom.current;
    if (t >= 1 || leftRoom) {
      active.current = false;
      if (ambient.current) ambient.current.intensity = 0;
      if (point.current) point.current.intensity = 0;
      orbMat.opacity = 0;
      exposeTestGlobal('__sdpLight', {
        nonce: castNonce,
        room: igniteRoom.current,
        done: true,
        aborted: leftRoom,
      });
      return;
    }

    if (ambient.current) ambient.current.intensity = AMBIENT_PEAK * env;
    if (point.current) point.current.intensity = POINT_PEAK * env;
    orbMat.opacity = env;
    // a barely-there bob so the mote feels alive (no luminance change — pure motion)
    if (orb.current) orb.current.position.y = orbY + Math.sin(now * 1.4) * 0.12;
  });

  return (
    <group>
      <ambientLight ref={ambient} intensity={0} color="#ffeccb" />
      <pointLight
        ref={point}
        position={[0, orbY, 0]}
        intensity={0}
        distance={Math.max(room.dims.halfW, room.dims.halfD) * 3}
        color="#fff2d6"
      />
      <mesh ref={orb} material={orbMat} position={[0, orbY, 0]}>
        <sphereGeometry args={[0.18, 10, 10]} />
      </mesh>
    </group>
  );
}
