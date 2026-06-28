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

/**
 * Flat-shaded, vertex-snapped Lambert material — the default surface for the
 * hand-built PS1 rooms (a snapped MeshLambertMaterial, no PBR). Every room used
 * to re-declare its own `flatMat`; this is the one home. `side` defaults to
 * FrontSide (pass DoubleSide for thin / inside-visible geometry like walls);
 * `map` is optional.
 */
export function flatMat(
  color: THREE.ColorRepresentation,
  { side = THREE.FrontSide, map }: { side?: THREE.Side; map?: THREE.Texture } = {},
): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ color, map, flatShading: true, side });
  applyVertexSnap(m, 64);
  return m;
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

/**
 * Bake text into a nearest-filtered texture (a glowing sign / marquee). Lines
 * split on \n; the font auto-shrinks to fit the widest line. Blocky on purpose.
 */
export function makeTextTexture(
  text: string,
  opts: { fg?: string; bg?: string; w?: number; h?: number } = {},
): THREE.Texture {
  const { fg = '#ffe9c2', bg = 'transparent', w = 256, h = 128 } = opts;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  if (bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
  }
  const lines = text.split('\n');
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = fg;
  // shrink the font until the widest line fits with margin
  let fontPx = Math.floor((h / (lines.length + 0.5)) * 0.9);
  const fit = () => {
    ctx.font = `bold ${fontPx}px "Courier New", monospace`;
    return Math.max(...lines.map((l) => ctx.measureText(l).width));
  };
  while (fontPx > 8 && fit() > w * 0.92) fontPx -= 2;
  const lh = h / (lines.length + 0.5);
  lines.forEach((ln, i) => ctx.fillText(ln, w / 2, lh * (i + 0.85)));
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
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

/** A tiny seeded LCG → a deterministic 0..1 generator, so a scatter (grass tufts,
 *  flowers, rocks) is STABLE across frames + reloads instead of reshuffling. One
 *  home; rooms used to each re-declare their own copy. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
}

/** A tuft-of-grass sprite: green blades on transparent, 32px + NearestFilter
 *  (PS1). Two crossed quads of it read as a clump of tall grass. Shared by the
 *  grass field + the Grassrooms (was copy-pasted in both). */
export function makeGrassTexture(): THREE.Texture {
  const s = 32;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, s, s);
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    const blades: [string, number][] = [
      ['#6f9a3e', 7],
      ['#83b24a', 13],
      ['#5f8a36', 19],
      ['#8fc056', 25],
    ];
    for (const [col, x] of blades) {
      ctx.strokeStyle = col;
      ctx.beginPath();
      ctx.moveTo(x, s);
      ctx.quadraticCurveTo(x + (x < s / 2 ? -3 : 3), s * 0.45, x + (x < s / 2 ? -2 : 2), 3);
      ctx.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}

/** A bilingual plaque texture: a Japanese line over an English line on a tinted
 *  panel with accent bars, drawn to a NearestFilter canvas so it reads as a
 *  printed sign (not a clean modern label). The site keeps its words EN + JP
 *  (草の間 / THE GRASSROOMS, ゴーストレース / RACE THE GHOST, cf. 青函トンネル). */
export function makeBilingualSign(
  jp: string,
  en: string,
  opts: {
    w?: number;
    h?: number;
    bg?: string;
    accent?: string;
    accentH?: number;
    jpColor?: string;
    jpSize?: number;
    jpY?: number;
    enColor?: string;
    enSize?: number;
    enY?: number;
  } = {},
): THREE.Texture {
  const {
    w = 256,
    h = 96,
    bg = '#f3f4ee',
    accent = '#3a5a32',
    accentH = 4,
    jpColor = '#2f4a2a',
    jpSize = 40,
    jpY = 48,
    enColor = '#4a6a40',
    enSize = 20,
    enY = 80,
  } = opts;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  if (ctx) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, w, accentH);
    ctx.fillRect(0, h - accentH, w, accentH);
    ctx.textAlign = 'center';
    ctx.fillStyle = jpColor;
    ctx.font = `bold ${jpSize}px "Hiragino Kaku Gothic Pro", "Yu Gothic", sans-serif`;
    ctx.fillText(jp, w / 2, jpY);
    ctx.fillStyle = enColor;
    ctx.font = `bold ${enSize}px "Courier New", monospace`;
    ctx.fillText(en, w / 2, enY);
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  return t;
}
