import { Component, useMemo, useRef, type ReactNode } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { applyVertexSnap } from './ps1';
import type { RoomProp } from '../data/rooms';

// ───────────────────────────────────────────────────────────────────────────
// GlbProp — Phase 6. Set-dressing from the (wide-permission, crunched) model
// trove: a single small GLB placed in a room — a palm by the shop window, an
// arcade cabinet by the jukebox, a real Möbius strip in the corridor, a broken
// statue in the pool. Unlike GlbRoom (a whole level behind the loader minigame),
// a prop is tiny, loads fast, and just pops in (Suspense null). Same PS1
// treatment as everything else: NearestFilter textures, no mipmaps, flat +
// vertex-snapped materials. Auto-fits to a target size and sits its base at the
// group origin so placement is "feet at (x,z)". Provenance: THIRD_PARTY_NOTICES.
// ───────────────────────────────────────────────────────────────────────────

const TEX_KEYS = ['map', 'emissiveMap', 'roughnessMap', 'metalnessMap', 'normalMap', 'aoMap'] as const;

// A failed prop load must never blow up the room — render nothing on error and
// drop the poisoned cache entry so a transient failure can recover on revisit.
class PropBoundary extends Component<{ url: string; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(err: unknown) {
    console.error('[GlbProp] prop failed to load:', this.props.url, err);
    useGLTF.clear(this.props.url);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function PropInner({ spec }: { spec: RoomProp }) {
  const { scene } = useGLTF(spec.url);
  const ref = useRef<THREE.Group>(null);

  const fitted = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      // scene.clone(true) clones NODES but shares materials with the cached GLTF
      // (and with sibling placements). Clone the material(s) per placement before
      // mutating, so a per-placement tweak like `glow` stays isolated and never
      // bleeds into the cached asset or another room reusing the same GLB.
      const orig = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const cloned = orig.map((m) => (m as THREE.Material).clone());
      mesh.material = Array.isArray(mesh.material) ? cloned : cloned[0];
      for (const m of cloned) {
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
        // Lift it off pure black in dim rooms (e.g. the Möbius strip in the
        // corridor) by tinting emissive toward its own colour.
        if (spec.glow && mat.emissive) {
          mat.emissive.copy(mat.color ?? new THREE.Color('#ffffff'));
          mat.emissiveIntensity = spec.glow;
        }
        applyVertexSnap(mat, 64);
        mat.needsUpdate = true;
      }
    });
    // Auto-fit: scale so the largest dimension == fit; drop base to y=0, centre x/z.
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = spec.fit ? spec.fit / maxDim : 1;
    clone.position.set(-center.x, -box.min.y, -center.z);
    return { clone, scale };
  }, [scene, spec.fit]);

  useFrame((_, delta) => {
    if (spec.spin && ref.current) ref.current.rotation.y += spec.spin * Math.min(delta, 0.05);
  });

  return (
    <group position={spec.position} rotation-y={spec.rotationY ?? 0}>
      <group ref={ref}>
        <group scale={fitted.scale}>
          <primitive object={fitted.clone} />
        </group>
      </group>
    </group>
  );
}

export function GlbProp({ spec }: { spec: RoomProp }) {
  return (
    <PropBoundary url={spec.url}>
      <PropInner spec={spec} />
    </PropBoundary>
  );
}
