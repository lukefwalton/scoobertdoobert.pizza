import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { flatMat } from './ps1';
import { useSceneStore } from '../state/sceneStore';
import { albumBySlug } from '../data/albums';
import { type RoomPainting } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// CoverArt — album covers as framed paintings on the walls (Luke: "do that with my
// album art... places throughout, large on the walls with borders"). The SM64
// grammar: big gold-framed canvases hung around the world. Some are just showcase
// art; some are PORTALS you dive into (a door with `art`, handled in Doors.tsx) —
// the cover lunges at you as you step through.
//
// Real art loads from a URL when present (Luke drops degraded derivatives in
// public/brand/albums/); until then a procedural placeholder stands in so the
// frames look intentional. Covers are square (album format) + unlit so the art
// reads clearly in any room's light, with a lit gold frame to seat them on the wall.
// ───────────────────────────────────────────────────────────────────────────

// A procedural stand-in album cover — a glossy two-tone field, a soft sun, a ♪, and
// the artist + a placeholder title. Seeded by hue/title so showcased covers differ.
export function makeCoverTexture(hue: number, title: string): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 256, 256);
  g.addColorStop(0, `hsl(${hue}, 70%, 60%)`);
  g.addColorStop(1, `hsl(${(hue + 40) % 360}, 65%, 32%)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  // a soft sun/disc
  const rg = ctx.createRadialGradient(180, 80, 0, 180, 80, 90);
  rg.addColorStop(0, 'rgba(255,255,240,0.95)');
  rg.addColorStop(1, 'rgba(255,255,240,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, 256, 256);
  // a big ♪
  ctx.fillStyle = 'rgba(20,16,30,0.85)';
  ctx.font = 'bold 120px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', 78, 120);
  // artist + title
  ctx.fillStyle = '#fdf6e3';
  ctx.font = 'bold 18px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('SCOOBERT DOOBERT', 16, 222);
  ctx.font = 'italic 15px Georgia, serif';
  ctx.fillStyle = 'rgba(253,246,227,0.85)';
  ctx.fillText(title, 16, 244);
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 250, 250);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  t.generateMipmaps = false;
  return t;
}

// Load real cover art from `art` when given, else keep the procedural placeholder.
// Graceful: a missing/failed image just leaves the placeholder (no Suspense, no crash).
function useCoverTexture(art: string | undefined, placeholder: THREE.Texture): THREE.Texture {
  const [tex, setTex] = useState<THREE.Texture>(placeholder);
  useEffect(() => {
    setTex(placeholder);
    if (!art) return;
    let alive = true;
    new THREE.TextureLoader().load(
      art,
      (t) => {
        if (!alive) return;
        t.colorSpace = THREE.SRGBColorSpace;
        setTex(t);
      },
      undefined,
      () => {
        /* keep the placeholder on error */
      },
    );
    return () => {
      alive = false;
    };
  }, [art, placeholder]);
  return tex;
}

/**
 * A framed album cover. Positioned/rotated by its parent (against a wall). When
 * `diveTo` is set (a portal painting) it watches the room transition and LUNGES —
 * scales up + rushes the camera — as you step into that room, the SM64 dive.
 */
export function FramedCover({
  art,
  album,
  hue = 210,
  size = 2.4,
  diveTo,
}: {
  art?: string;
  album?: string;
  hue?: number;
  size?: number;
  diveTo?: string;
}) {
  const placeholder = useMemo(() => makeCoverTexture(hue, album ?? 'untitled'), [hue, album]);
  useEffect(() => () => placeholder.dispose(), [placeholder]);
  const tex = useCoverTexture(art, placeholder);

  // DoubleSide so a portal cover (hung in a door, whichever way it's turned) is
  // never invisible from the approach side.
  const coverMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }),
    [tex],
  );
  const frameMat = useMemo(() => flatMat('#caa14a'), []); // gilt frame
  const matMat = useMemo(() => flatMat('#1a1410', { side: THREE.DoubleSide }), []); // dark inner mat
  useEffect(
    () => () => {
      coverMat.dispose();
      frameMat.dispose();
      matMat.dispose();
    },
    [coverMat, frameMat, matMat],
  );

  const inner = useRef<THREE.Group>(null);
  const dive = useRef(0);
  useFrame((state, delta) => {
    const g = inner.current;
    if (!g) return;
    if (diveTo) {
      const st = useSceneStore.getState();
      const target = st.transitioning && st.pendingRoom?.to === diveTo ? 1 : 0;
      dive.current += (target - dive.current) * Math.min(1, delta * 14);
      const s = 1 + dive.current * 6; // swell to swallow the view (orientation-safe)
      g.scale.set(s, s, 1);
    }
    // a faint glossy shimmer sweep so the gilt catches the eye (subtle, no flashing)
    const t = state.clock.elapsedTime;
    (frameMat as THREE.MeshLambertMaterial).emissive?.setRGB(
      0.05 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.3)),
      0.04,
      0,
    );
  });

  const fw = size + 0.34; // outer frame footprint
  const t = 0.17; // frame bar thickness
  return (
    <group ref={inner}>
      {/* gilt frame bars */}
      <mesh material={frameMat} position={[0, size / 2 + t / 2, 0]}>
        <boxGeometry args={[fw, t, 0.16]} />
      </mesh>
      <mesh material={frameMat} position={[0, -size / 2 - t / 2, 0]}>
        <boxGeometry args={[fw, t, 0.16]} />
      </mesh>
      <mesh material={frameMat} position={[-size / 2 - t / 2, 0, 0]}>
        <boxGeometry args={[t, size + t * 2, 0.16]} />
      </mesh>
      <mesh material={frameMat} position={[size / 2 + t / 2, 0, 0]}>
        <boxGeometry args={[t, size + t * 2, 0.16]} />
      </mesh>
      {/* dark mat just behind the canvas edge */}
      <mesh material={matMat} position={[0, 0, -0.02]}>
        <planeGeometry args={[size + 0.08, size + 0.08]} />
      </mesh>
      {/* the cover itself */}
      <mesh material={coverMat} position={[0, 0, 0.01]}>
        <planeGeometry args={[size, size]} />
      </mesh>
    </group>
  );
}

// Decorative showcase covers for a room (room.paintings) — framed album art hung
// on the walls, no interaction. Portals are separate (doors with `albumSlug`, in
// Doors.tsx). Each references an album by slug, resolved against the catalog.
export function Paintings({ list }: { list: RoomPainting[] }) {
  return (
    <>
      {list.map((p, i) => {
        const al = albumBySlug(p.slug);
        if (!al) return null;
        return (
          <group key={i} position={p.position} rotation-y={p.rotationY ?? 0}>
            <FramedCover art={al.art} album={al.title} size={p.size} />
          </group>
        );
      })}
    </>
  );
}
