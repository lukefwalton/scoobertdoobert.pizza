import { Component, useEffect, useMemo, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { applyVertexSnap } from './ps1';
import { useLevelStore } from '../state/levelStore';
import type { Room } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GlbRoom — Phase 6. Renders a real (third-party, wide-permission) GLB level,
// crunched by gltf-transform to public/models/ and lazy-loaded here. useGLTF
// suspends until the file resolves, so this component only mounts once it's
// loaded — which it reports via levelStore.ready so the DOM loader clears and the
// level auto-enters. Runtime PS1 treatment makes a downloaded environment match
// the world: every texture → NearestFilter, no mipmaps; every material →
// vertex-snapped + flat; scene fog applies. Auto-centers + auto-fits (footprint
// AND a minimum interior height) so we don't hand-tune each model's native scale.
//
// Asset provenance for anything shipped here is tracked in THIRD_PARTY_NOTICES.md.
// ───────────────────────────────────────────────────────────────────────────

const TEX_KEYS = [
  'map',
  'emissiveMap',
  'roughnessMap',
  'metalnessMap',
  'normalMap',
  'aoMap',
] as const;

// A fetch/decode failure on useGLTF (404, corrupt file, GPU OOM) re-throws
// during render once the suspended promise rejects. Without a boundary that
// would blow up the whole world subtree — and because GlbRoom is what flips
// levelStore.ready, the player would also be stuck on a loader that never turns
// ready. This boundary catches it INSIDE the canvas, flips levelStore.error so
// the DOM loader can offer a way back out, and renders an empty room (fog +
// doors survive, so the exit door still works as a fallback). Error boundaries
// have to be class components.
//
// It also CLEARS the failed url from useGLTF's cache (drei caches the rejected
// promise too), so a transient failure — CDN hiccup, a one-off decode error —
// can be retried by re-entering the room in the same tab instead of staying
// poisoned until a full page reload.
class GlbErrorBoundary extends Component<
  { url: string; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    // Surface it once for debugging; the player-facing recovery is the loader.
    console.error('[GlbRoom] level failed to load:', err);
    useLevelStore.getState().setError(true);
    useGLTF.clear(this.props.url); // drop the poisoned cache entry → retryable
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function GlbRoom({ room }: { room: Room }) {
  return (
    <GlbErrorBoundary url={room.glb!.url}>
      <GlbRoomInner room={room} />
    </GlbErrorBoundary>
  );
}

function GlbRoomInner({ room }: { room: Room }) {
  const glb = room.glb!;
  const { scene } = useGLTF(glb.url);
  const setReady = useLevelStore((s) => s.setReady);

  const fitted = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial;
        for (const key of TEX_KEYS) {
          const tex = mat[key] as THREE.Texture | null | undefined;
          if (tex) {
            tex.magFilter = THREE.NearestFilter;
            tex.minFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            tex.needsUpdate = true;
          }
        }
        mat.flatShading = true;
        applyVertexSnap(mat, 64); // the PS1 wobble, on bought geometry
        mat.needsUpdate = true;
      }
    });
    // Center on XZ, drop the floor to y=0, then scale to fit the room.
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    const maxXZ = Math.max(size.x, size.z) || 1;
    const footprintScale = (glb.fit ?? 18) / maxXZ;
    // A long/flat model (a tunnel, a backrooms floor) scaled to its FOOTPRINT can come
    // out shorter than the player's eye — so you stand ABOVE the roof looking down
    // instead of standing INSIDE it. Floor the scale so the interior clears the eye
    // with headroom. This only ever INCREASES the scale: an already-tall model (e.g. the
    // deep pool) keeps its footprint fit untouched, while a squashed one gets lifted
    // until you're enclosed. (size is pre-scale, so divide the target height by size.y.)
    const heightScale = (room.dims.eye + 2.2) / (size.y || 1);
    const scale = Math.max(footprintScale, heightScale);
    return { clone, scale };
  }, [scene, glb.fit, room.dims.eye]);

  // Report loaded (we only get here post-Suspense) so the loader clears + auto-enters.
  useEffect(() => {
    useLevelStore.getState().setReady(true);
    return () => setReady(false);
  }, [setReady]);

  return (
    <group>
      {/* over-lit + even — bought GLBs ship dark without their own lights */}
      <ambientLight intensity={0.95} color="#e8eef6" />
      <directionalLight position={[6, 12, 4]} intensity={0.6} color="#fff4e0" />
      <group scale={fitted.scale} rotation-y={glb.rotationY ?? 0}>
        <primitive object={fitted.clone} />
      </group>
    </group>
  );
}
