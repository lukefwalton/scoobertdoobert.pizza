import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../state/sceneStore';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';
import { type Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// RoomFireball — the FIREBALL spell's world effect (Luke: "the room gets lit on
// fire hahaha"). A one-shot AoE that blooms across the current room: a field of
// additive flame quads rising off the floor, a warm point light that lights the
// walls, drifting embers — then it dies down. Mounted once in World; it watches
// the cast nonce (sceneStore.triggerCastFx) and ignites each time it bumps.
//
// SAFETY (WCAG 2.3.1, hard line in CLAUDE.md): NO strobe, NO full-field luminance
// flash. The whole thing is a SMOOTH envelope — the light ramps up over ~0.5s and
// decays over ~4s with only a gentle (≤6%), slow (<3 Hz) flicker; the "fire" reads
// from localized per-quad motion, never a screen-wide blink. Additive + fog:false
// so it glows through even the darkest rooms (classified), but it's all in-scene
// (no DOM overlay), so the dither/fog still bound it. Taste guardrail: goofy-cool
// spectacle, never traumatic — nothing is harmed, the room just briefly roars warm.
// ───────────────────────────────────────────────────────────────────────────

const BURN_MS = 4500; // total burn; long enough to enjoy, short enough not to linger
const N_FLAMES = 16; // flame quads spread across the floor
const LIGHT_PEAK = 2.6; // warm point-light intensity at the height of the burn

// A soft radial flame blob — white core → transparent edge, tinted by the material
// color. ≤128px + NearestFilter to stay in the PS1 budget.
function makeFlameTexture(): THREE.Texture {
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(s / 2, s * 0.62, 2, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,228,150,0.95)');
  g.addColorStop(0.7, 'rgba(255,140,40,0.55)');
  g.addColorStop(1, 'rgba(120,30,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

// Smooth 0→1→0 burn envelope: a gentle attack (~10% of the burn), then an
// ease-out decay. No discontinuities — that's what keeps it WCAG-safe.
function envelope(t: number): number {
  if (t <= 0 || t >= 1) return 0;
  const ATTACK = 0.1;
  if (t < ATTACK) {
    const x = t / ATTACK; // smoothstep up
    return x * x * (3 - 2 * x);
  }
  const d = (t - ATTACK) / (1 - ATTACK); // 0→1 across the decay
  return 1 - d * d * d; // ease-out (cubic) down to 0
}

export function RoomFireball({ room }: { room: Room }) {
  const { camera } = useThree();
  const castNonce = useSceneStore((s) => s.castNonce);
  const castingSpell = useSceneStore((s) => s.castingSpell);

  const group = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const flameRefs = useRef<(THREE.Mesh | null)[]>([]);
  const embers = useRef<THREE.Points>(null);

  // Burn bookkeeping: when the current burn started (in clock seconds) and which
  // nonce it belongs to, so a re-cast mid-burn restarts cleanly.
  const igniteAt = useRef<number>(-1);
  const lastNonce = useRef<number>(castNonce); // don't fire on mount, only on bumps
  const active = useRef<boolean>(false);
  // The room the burn was cast in — so it can't BLEED through a door: if you cast
  // then walk out before it dies down, the fire stays in the room you lit, not the
  // one you arrive in (RoomFireball is mounted once at world scope; this binds an
  // active burn to its origin room).
  const igniteRoom = useRef<string>(room.id);

  const tex = useMemo(() => makeFlameTexture(), []);
  const flameMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: tex,
        color: '#ff7a2a',
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        opacity: 0,
      }),
    [tex],
  );
  const emberMat = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: '#ffd27a',
        size: 0.14,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
        opacity: 0,
      }),
    [],
  );

  // Where the flames stand: a deterministic scatter across the floor, capped to a
  // sane radius so a huge GLB level doesn't try to ignite to its far walls.
  const spread = Math.min(room.dims.halfW, room.dims.halfD, 7);
  const flames = useMemo(() => {
    const out: { x: number; z: number; phase: number; scale: number }[] = [];
    for (let i = 0; i < N_FLAMES; i++) {
      // a cheap golden-angle spiral → even, non-grid coverage
      const a = i * 2.399963;
      const r = spread * Math.sqrt((i + 0.5) / N_FLAMES);
      out.push({
        x: Math.cos(a) * r,
        z: Math.sin(a) * r,
        phase: (i % 7) * 0.9,
        scale: 1.1 + ((i * 13) % 5) * 0.22,
      });
    }
    return out;
  }, [spread]);

  const emberGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const n = 24;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = i * 2.399963;
      const r = spread * Math.sqrt((i + 0.5) / n);
      pos[i * 3] = Math.cos(a) * r;
      pos[i * 3 + 1] = 0.2 + (i % 5) * 0.1;
      pos[i * 3 + 2] = Math.sin(a) * r;
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, [spread]);

  useEffect(
    () => () => {
      tex.dispose();
      flameMat.dispose();
      emberMat.dispose();
      emberGeo.dispose();
    },
    [tex, flameMat, emberMat, emberGeo],
  );

  // Ignite when the nonce bumps (and it's the fireball). The clock is read in the
  // frame loop, so we just flag "ignite on next frame".
  useEffect(() => {
    if (castNonce === lastNonce.current) return;
    lastNonce.current = castNonce;
    if (castingSpell !== 'fireball') return;
    igniteAt.current = -1; // "stamp me at the next frame's clock time"
    igniteRoom.current = room.id; // bind this burn to the room it was cast in
    active.current = true;
    // SFX: a low whoomph + a couple of bright crackles. Mute-aware + no-op
    // pre-gesture (spellcast already called audio.unlock on the cast gesture).
    audio.playTone(70, 620, 0.22); // the deep ignition whoomph
    audio.playTone(120, 360, 0.16);
    audio.playChime(noteToFreq('A', 6), -0.3, 0.1, 0.5);
    audio.playChime(noteToFreq('E', 6), 0.3, 0.09, 0.6);
    exposeTestGlobal('__sdpFireball', { nonce: castNonce, room: room.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [castNonce, castingSpell]);

  useFrame((state) => {
    if (!active.current) return;
    const now = state.clock.elapsedTime;
    if (igniteAt.current < 0) igniteAt.current = now; // stamp on the first burn frame
    const t = (now - igniteAt.current) / (BURN_MS / 1000);
    const env = envelope(t);

    // Done when the burn finishes OR you've left the room you cast it in (no
    // bleed through a door). Either way: zero everything out and go idle.
    const leftRoom = room.id !== igniteRoom.current;
    if (t >= 1 || leftRoom) {
      active.current = false;
      if (light.current) light.current.intensity = 0;
      flameMat.opacity = 0;
      emberMat.opacity = 0;
      exposeTestGlobal('__sdpFireball', {
        nonce: castNonce,
        room: igniteRoom.current,
        done: true,
        aborted: leftRoom,
      });
      return;
    }

    // Warm light: smooth envelope + a gentle, slow flicker (≤6%, <3 Hz → WCAG-safe).
    if (light.current) {
      const flick = 1 + Math.sin(now * 13) * 0.06;
      light.current.intensity = LIGHT_PEAK * env * flick;
    }

    // Flames: rise + scale + fade together on the envelope; per-quad motion gives
    // the "fire" read without any screen-wide blink. Billboard to the camera.
    flameMat.opacity = env;
    for (let i = 0; i < flames.length; i++) {
      const m = flameRefs.current[i];
      if (!m) continue;
      const f = flames[i];
      const lic = Math.sin(now * 9 + f.phase) * 0.5 + 0.5; // 0..1 lick
      const rise = 0.5 + env * 1.4 + lic * 0.35;
      m.position.set(f.x, rise, f.z);
      const s = f.scale * (0.6 + env * 0.9) * (0.85 + lic * 0.3);
      m.scale.set(s, s * 1.5, s); // taller than wide — flame-shaped
      m.quaternion.copy(camera.quaternion); // face the camera
    }

    // Embers drift up slowly and twinkle out with the burn.
    if (embers.current) {
      emberMat.opacity = env * 0.9;
      embers.current.position.y = env * 1.2;
      embers.current.rotation.y = now * 0.3;
    }
  });

  // The rig stays mounted at opacity 0 between casts (no setup hitch on ignite);
  // the envelope drives everything visible, so an idle fireball costs ~nothing.
  return (
    <group ref={group}>
      <pointLight
        ref={light}
        position={[0, 1.4, 0]}
        intensity={0}
        distance={spread * 3.2}
        color="#ff8a3a"
      />
      {flames.map((f, i) => (
        <mesh
          key={i}
          ref={(m) => (flameRefs.current[i] = m)}
          material={flameMat}
          position={[f.x, 0.5, f.z]}
        >
          <planeGeometry args={[1, 1.5]} />
        </mesh>
      ))}
      <points ref={embers} material={emberMat} geometry={emberGeo} />
    </group>
  );
}
