import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import * as THREE from 'three';
import { PS1_SNAP_GLSL, PS1_DITHER_GLSL } from './ps1';
import { OCEAN, FOG_NEAR, FOG_FAR, SEA } from './constants';

// The degraded water. Same simulation idea as the source (a subdivided plane
// displaced by overlapping sine waves) but the modern finish is stripped: no
// reflection, no fresnel, no gloss. Instead it runs through the PS1 pipeline —
// vertex-snapped, ordered-dithered, fogged — so it reads crunchy and wobbly.
const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uSnap;
  uniform float uAmp;
  uniform float uFreq;
  varying float vCrest;
  varying float vViewZ;
  ${PS1_SNAP_GLSL}
  void main() {
    vec3 pos = position;
    float w = sin(pos.x * uFreq + uTime * 1.3) * 0.6
            + sin(pos.y * uFreq * 1.4 - uTime * 1.1) * 0.4
            + sin((pos.x + pos.y) * uFreq * 0.7 + uTime * 0.7) * 0.5;
    pos.z += w * uAmp;
    vCrest = w;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vViewZ = -mv.z;
    gl_Position = ps1Snap(projectionMatrix * mv, uSnap);
  }
`;

const fragmentShader = /* glsl */ `
  precision mediump float;
  uniform vec3 uBase;
  uniform vec3 uCrest;
  uniform vec3 uFog;
  uniform float uFogNear;
  uniform float uFogFar;
  varying float vCrest;
  varying float vViewZ;
  ${PS1_DITHER_GLSL}
  void main() {
    float crest = smoothstep(0.35, 1.1, vCrest);
    vec3 col = mix(uBase, uCrest, crest);
    col = ps1Quantize(col, gl_FragCoord.xy, 10.0);
    float fog = clamp((vViewZ - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
    col = mix(col, uFog, fog);
    gl_FragColor = vec4(col, 1.0);
  }
`;

// The shop's sea is the default; the boardwalk wing reuses the SAME crunchy water
// with a different tint/placement (a golden-hour sea, a moonlit tide). All props
// are optional with the shop's values as defaults, so `<Water />` is unchanged.
export function Water({
  base = '#1aa3c8',
  crest = '#bfeef6',
  fog,
  fogNear = FOG_NEAR,
  fogFar = FOG_FAR,
  y = SEA.waterY,
  z = SEA.z,
}: {
  base?: THREE.ColorRepresentation;
  crest?: THREE.ColorRepresentation;
  fog?: THREE.ColorRepresentation;
  fogNear?: number;
  fogFar?: number;
  y?: number;
  z?: number;
} = {}) {
  const { amp, freq, snap } = useControls('water', {
    amp: { value: 1.2, min: 0, max: 3, step: 0.1 },
    freq: { value: 0.18, min: 0.02, max: 0.6, step: 0.01 },
    snap: { value: 56, min: 8, max: 200, step: 1 },
  });

  const geometry = useMemo(() => new THREE.PlaneGeometry(280, 220, 56, 44), []);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uSnap: { value: 56 },
          uAmp: { value: 1.2 },
          uFreq: { value: 0.18 },
          uBase: { value: new THREE.Color(base) },
          uCrest: { value: new THREE.Color(crest) },
          // Default the water's own fog to the shop OCEAN cyan (back-compat); a
          // room passes its palette fog so the sea dissolves into the right dusk.
          uFog: { value: fog ? new THREE.Color(fog) : OCEAN.clone() },
          uFogNear: { value: fogNear },
          uFogFar: { value: fogFar },
        },
      }),
    [base, crest, fog, fogNear, fogFar],
  );
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uAmp.value = amp;
    material.uniforms.uFreq.value = freq;
    material.uniforms.uSnap.value = snap;
  });

  return (
    <mesh geometry={geometry} material={material} rotation-x={-Math.PI / 2} position={[0, y, z]} />
  );
}
