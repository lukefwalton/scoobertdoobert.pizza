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
// loaded — which it reports via levelStore so the DOM loader minigame knows when
// to show TAP-TO-ENTER. Runtime PS1 treatment makes a downloaded environment
// match the world: every texture → NearestFilter, no mipmaps; every material →
// vertex-snapped + flat; scene fog applies. Auto-centers + auto-fits so we don't
// have to hand-tune each model's native scale.
//
// Asset provenance for anything shipped here is tracked in THIRD_PARTY_NOTICES.md.
// ───────────────────────────────────────────────────────────────────────────

const TEX_KEYS = ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'aoMap'] as const;

// A fetch/decode failure on useGLTF (404, corrupt file, GPU OOM) re-throws
// during render once the suspended promise rejects. Without a boundary that
// would blow up the whole world subtree — and because GlbRoom is what flips
// levelStore.ready, the player would also be stuck on a loader that never turns
// ready. This boundary catches it INSIDE the canvas, flips levelStore.error so
// the DOM loader can offer a way back out, and renders an empty room (fog +
// doors survive, so the exit door still works as a fallback). Error boundaries
// have to be class components.
class GlbErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    // Surface it once for debugging; the player-facing recovery is the loader.
    console.error('[GlbRoom] level failed to load:', err);
    useLevelStore.getState().setError(true);
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function GlbRoom({ room }: { room: Room }) {
  return (
    <GlbErrorBoundary>
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
    // Center on XZ, drop the floor to y=0, scale so the footprint fits the room.
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    clone.position.set(-center.x, -box.min.y, -center.z);
    const maxXZ = Math.max(size.x, size.z) || 1;
    const scale = (glb.fit ?? 18) / maxXZ;
    return { clone, scale };
  }, [scene, glb.fit]);

  // Report loaded (we only get here post-Suspense) so the loader can offer ENTER.
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
