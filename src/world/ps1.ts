import * as THREE from 'three';
import { OCEAN, FOG_NEAR, FOG_FAR } from './constants';

// ───────────────────────────────────────────────────────────────────────────
// The PS1/N64 look, as reusable pieces. Three tells do most of the work:
//   1. vertex snapping  — round clip-space xy to a coarse grid (the wobble)
//   2. affine UVs       — drop perspective correction on textures (the swim)
//   3. ordered dither   — fake limited color depth
// Plus nearest-filtered <=128px textures, fog, flat shading, and a low-res
// render target (handled by the Canvas dpr in World.tsx).
// ───────────────────────────────────────────────────────────────────────────

export const PS1_SNAP_GLSL = /* glsl */ `
  vec4 ps1Snap(vec4 clip, float grid) {
    vec3 ndc = clip.xyz / clip.w;
    ndc.xy = floor(ndc.xy * grid) / grid;
    return vec4(ndc * clip.w, clip.w);
  }
`;

export const PS1_DITHER_GLSL = /* glsl */ `
  float ps1Bayer(vec2 p) {
    float m[16];
    m[0]=0.0;  m[1]=8.0;  m[2]=2.0;  m[3]=10.0;
    m[4]=12.0; m[5]=4.0;  m[6]=14.0; m[7]=6.0;
    m[8]=3.0;  m[9]=11.0; m[10]=1.0; m[11]=9.0;
    m[12]=15.0;m[13]=7.0; m[14]=13.0;m[15]=5.0;
    int idx = int(mod(p.x, 4.0)) + int(mod(p.y, 4.0)) * 4;
    float v = 0.0;
    for (int k = 0; k < 16; k++) { if (k == idx) v = m[k]; }
    return v / 16.0 - 0.5;
  }
  vec3 ps1Quantize(vec3 c, vec2 fragCoord, float levels) {
    c += ps1Bayer(fragCoord) / levels;
    return floor(c * levels + 0.5) / levels;
  }
`;

/**
 * Patch any standard three material with vertex snapping. Returns the live
 * uniform object so leva can tune the grid at runtime.
 */
export function applyVertexSnap(material: THREE.Material, grid = 64): { value: number } {
  const uSnap = { value: grid };
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSnap = uSnap;
    shader.vertexShader =
      'uniform float uSnap;\n' +
      shader.vertexShader.replace(
        '#include <project_vertex>',
        `#include <project_vertex>
        {
          vec3 _ndc = gl_Position.xyz / gl_Position.w;
          _ndc.xy = floor(_ndc.xy * uSnap) / uSnap;
          gl_Position.xyz = _ndc * gl_Position.w;
        }`,
      );
  };
  material.needsUpdate = true;
  return uSnap;
}

/** Red/white pizzeria checkerboard. Nearest-filtered, <=128px, no mipmaps. */
export function makeCheckerTexture(cells = 8, a = '#c7402f', b = '#efe6d2'): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const cell = size / cells;
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? a : b;
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/**
 * A textured material with AFFINE UV mapping — the signature PS1 texture swim.
 * The `uv * w` / divide-by-`w` trick cancels the GPU's perspective correction,
 * so the checkerboard warps as the camera moves. Also snaps vertices, dithers,
 * and fogs. Best used on the floor, where the wobble reads most clearly.
 */
export function makeAffineTexturedMaterial(
  map: THREE.Texture,
  repeat = 6,
  fog: { color: THREE.ColorRepresentation; near: number; far: number } = {
    color: OCEAN,
    near: FOG_NEAR,
    far: FOG_FAR,
  },
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uSnap: { value: 64 },
      uRepeat: { value: repeat },
      // This material does its own fog (raw shader, bypasses scene.fog), so each
      // room must hand in its fog or the affine floor would dissolve into the
      // shop's cyan everywhere. Defaults to the shop palette for back-compat.
      uFog: { value: new THREE.Color(fog.color) },
      uFogNear: { value: fog.near },
      uFogFar: { value: fog.far },
    },
    vertexShader: /* glsl */ `
      uniform float uSnap;
      varying vec2 vUv;
      varying float vW;
      varying float vViewZ;
      ${PS1_SNAP_GLSL}
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewZ = -mv.z;
        vec4 clip = ps1Snap(projectionMatrix * mv, uSnap);
        gl_Position = clip;
        vUv = uv * clip.w;   // affine: pre-multiply by w
        vW = clip.w;
      }
    `,
    fragmentShader: /* glsl */ `
      precision mediump float;
      uniform sampler2D uMap;
      uniform float uRepeat;
      uniform vec3 uFog;
      uniform float uFogNear;
      uniform float uFogFar;
      varying vec2 vUv;
      varying float vW;
      varying float vViewZ;
      ${PS1_DITHER_GLSL}
      void main() {
        vec2 auv = (vUv / vW) * uRepeat;   // divide back out -> affine UV
        vec3 col = texture2D(uMap, auv).rgb;
        col = ps1Quantize(col, gl_FragCoord.xy, 12.0);
        float fog = clamp((vViewZ - uFogNear) / (uFogFar - uFogNear), 0.0, 1.0);
        col = mix(col, uFog, fog);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
}

/**
 * Windows-3D-Maze red brick: offset courses with mortar lines, faintly speckled
 * so the flat fill doesn't read as a single chip. Nearest-filtered, <=128px.
 * The hallway/maze rooms wear this; it's the "you are in the dead web" texture.
 */
export function makeBrickTexture(brick = '#7d2b22', mortar = '#2a1410', rows = 6): THREE.Texture {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = mortar;
  ctx.fillRect(0, 0, size, size);
  const bh = size / rows;
  const bw = size / 3; // three bricks per course
  ctx.fillStyle = brick;
  for (let r = 0; r < rows; r++) {
    const offset = r % 2 === 0 ? 0 : -bw / 2;
    for (let x = -1; x < 4; x++) {
      ctx.fillRect(x * bw + offset + 1, r * bh + 1, bw - 2, bh - 2);
    }
  }
  // a few darker chips so the bricks aren't perfectly flat
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  for (let i = 0; i < size; i++) {
    ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** A blocky procedural texture for walls — flat base + sparse darker specks. */
export function makeSpeckTexture(base = '#d9b48c', speck = '#b8895f'): THREE.Texture {
  const size = 64;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = speck;
  for (let i = 0; i < size * 4; i++) {
    ctx.fillRect(Math.floor(Math.random() * size), Math.floor(Math.random() * size), 1, 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}
