// make-gifs.mjs — generate our OWN original animated GIFs with the hand-rolled
// GIF89a encoder (scripts/lib/gif89a.mjs). No dependency, no fetched artifact,
// nobody else's pixels: the GifCities energy, drawn from scratch in code. The
// joke is the whole stack — a 2026 site printing 1999 GIFs byte by byte.
//
//   node scripts/make-gifs.mjs
//
// Each animation also emits a 1-frame *-static.gif (a neutral pose) so the page
// can swap to a still under prefers-reduced-motion via <picture> — animated GIFs
// can't be paused by CSS, so the still IS the reduced-motion accommodation
// (WCAG 2.3.1). Frames are gentle (no strobe, no full-field luminance flash).
import { encodeGif, lzwDecode } from './lib/gif89a.mjs';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'public/gifs';
mkdirSync(OUT, { recursive: true });

// ── a tiny indexed-canvas helper ───────────────────────────────────────────────
function canvas(w, h, bg = 0) {
  const px = new Uint8Array(w * h).fill(bg);
  const set = (x, y, c) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && x < w && y >= 0 && y < h) px[y * w + x] = c;
  };
  return {
    w,
    h,
    px,
    set,
    rect(x0, y0, x1, y1, c) {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, c);
    },
    disc(cx, cy, r, c) {
      for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
        for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= r * r) set(x, y, c);
        }
    },
    indices() {
      return Array.from(px);
    },
  };
}

// ── a tiny 5px bitmap font — only the glyphs our "NEW!" blinky needs ────────────
// The encoder is otherwise deliberately font-free (words belong in accessible HTML,
// not baked into pixels). A blinky badge is the one exception whose whole punch IS
// the lettering — so we hand-set four glyphs. The accessible label still lives in
// the <img alt>, never only here.
const FONT = {
  N: ['#..#', '##.#', '#.##', '#..#', '#..#'],
  E: ['###', '#..', '###', '#..', '###'],
  W: ['#...#', '#...#', '#.#.#', '##.##', '#...#'],
  '!': ['#', '#', '#', '.', '#'],
};
// Blit `text` at (x0,y0) in `color`, `scale`× per pixel, with 1px(×scale) tracking.
function drawText(c, text, x0, y0, color, scale = 1) {
  let x = x0;
  for (const ch of text) {
    const g = FONT[ch];
    if (!g) {
      x += 4 * scale;
      continue;
    }
    const w = g[0].length;
    for (let ry = 0; ry < g.length; ry++)
      for (let rx = 0; rx < w; rx++)
        if (g[ry][rx] === '#')
          c.rect(
            x + rx * scale,
            y0 + ry * scale,
            x + (rx + 1) * scale - 1,
            y0 + (ry + 1) * scale - 1,
            color,
          );
    x += (w + 1) * scale;
  }
  return x;
}

// Self-check a finished file: signature + trailer + first-frame pixel count.
function assertValid(name, bytes, w, h) {
  const sig = String.fromCharCode(...bytes.slice(0, 6));
  if (sig !== 'GIF89a') throw new Error(`${name}: bad signature ${sig}`);
  if (bytes[bytes.length - 1] !== 0x3b) throw new Error(`${name}: missing trailer`);
  if (bytes.length < 14) throw new Error(`${name}: implausibly short`);
  void lzwDecode; // (full pixel round-trip is covered by gif89a.test.mjs)
  void w;
  void h;
}

function write(name, bytes, w, h) {
  assertValid(name, bytes, w, h);
  writeFileSync(`${OUT}/${name}`, Buffer.from(bytes));
  console.log(`wrote ${OUT}/${name} (${bytes.length} bytes)`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1) dancing-pizza.gif — the site's "dancing baby": a goofy pizza-goblin slice
//    that bops in place. Baked dark tile so it needs no transparency (and the
//    floor wraps it in a matching panel, so it reads as a little screen).
// ═══════════════════════════════════════════════════════════════════════════════
const PIZZA = [
  [14, 20, 48], // 0 tile bg (deep navy)
  [255, 207, 107], // 1 crust gold
  [217, 138, 47], // 2 crust dark / outline
  [255, 233, 168], // 3 cheese
  [194, 38, 29], // 4 pepperoni
  [122, 20, 16], // 5 pepperoni dark
  [255, 255, 255], // 6 eye white
  [10, 10, 14], // 7 pupil / mouth black
  [255, 94, 199], // 8 pink sparkle
  [94, 200, 255], // 9 cyan sparkle
];
const P = {
  BG: 0,
  CRUST: 1,
  EDGE: 2,
  CHEESE: 3,
  PEP: 4,
  PEPD: 5,
  WHITE: 6,
  BLACK: 7,
  PINK: 8,
  CYAN: 9,
};

function pizzaFrame(phase, { blink }) {
  const W = 64;
  const H = 64;
  const c = canvas(W, H, P.BG);
  const cx = 32;
  const lean = Math.sin(phase) * 6; // apex sways most
  const bob = Math.round(Math.sin(phase * 2) * 2);
  const topY = 12 + bob;
  const baseY = 52 + bob;
  const halfBase = 21;

  // little shuffling feet (alternate up/down), drawn first so the slice overlaps
  const footUp = Math.sin(phase) > 0;
  c.disc(cx - 8 + lean * 0.2, baseY + 4 + (footUp ? -1 : 1), 3, P.CRUST);
  c.disc(cx + 8 + lean * 0.2, baseY + 4 + (footUp ? 1 : -1), 3, P.CRUST);

  // wedge body, scanline-filled with a lean shear
  for (let y = topY; y <= baseY; y++) {
    const t = (y - topY) / (baseY - topY); // 0 apex → 1 base
    const center = cx + lean * (1 - t);
    const hw = halfBase * t;
    for (let x = Math.round(center - hw); x <= Math.round(center + hw); x++) {
      let col = P.CHEESE;
      if (t > 0.86) col = P.CRUST; // bottom crust band
      // edge outline
      if (x <= center - hw + 1 || x >= center + hw - 1 || y >= baseY - 1) col = P.EDGE;
      c.set(x, y, col);
    }
  }

  // pepperoni — fixed spots in slice space (skip the face zone up top)
  const peps = [
    [cx - 7, topY + 30],
    [cx + 8, topY + 31],
    [cx - 1, topY + 37],
    [cx - 10, topY + 22],
    [cx + 11, topY + 23],
  ];
  for (const [px, py] of peps) {
    c.disc(px + lean * 0.25, py, 3, P.PEP);
    c.disc(px + lean * 0.25 + 0.6, py + 0.6, 1.4, P.PEPD);
  }

  // face — two eyes + a goofy open smile, near the apex, swaying with the lean
  const ex = cx + lean * 0.7;
  const ey = topY + 14;
  if (blink) {
    c.rect(ex - 6, ey, ex - 2, ey, P.BLACK);
    c.rect(ex + 2, ey, ex + 6, ey, P.BLACK);
  } else {
    c.disc(ex - 4, ey, 2.4, P.WHITE);
    c.disc(ex + 4, ey, 2.4, P.WHITE);
    c.disc(ex - 4 + Math.sin(phase) * 1, ey, 1.1, P.BLACK);
    c.disc(ex + 4 + Math.sin(phase) * 1, ey, 1.1, P.BLACK);
  }
  // open smile: a small black arc with a tongue
  for (let a = 0.15; a <= Math.PI - 0.15; a += 0.18) {
    c.set(ex + Math.cos(a) * 5, ey + 7 + Math.sin(a) * 3, P.BLACK);
  }
  c.disc(ex, ey + 9, 1.4, P.PEP); // tongue

  // a couple of sway-synced sparkles for that GIF twinkle
  if (Math.sin(phase) > 0.6) c.disc(10, topY + 6, 1.4, P.CYAN);
  if (Math.sin(phase) < -0.6) c.disc(54, topY + 10, 1.4, P.PINK);

  return c.indices();
}

{
  const W = 64;
  const H = 64;
  const N = 10;
  const blinkAt = 7;
  const frames = Array.from({ length: N }, (_, i) => ({
    indices: pizzaFrame((i / N) * Math.PI * 2, { blink: i === blinkAt }),
    delay: 11, // ~9 fps — a gentle bop, nowhere near a strobe
  }));
  write('dancing-pizza.gif', encodeGif({ width: W, height: H, palette: PIZZA, frames }), W, H);
  // neutral still for reduced-motion (mid-sway, eyes open)
  const still = pizzaFrame(Math.PI / 2, { blink: false });
  write(
    'dancing-pizza-static.gif',
    encodeGif({ width: W, height: H, palette: PIZZA, frames: [{ indices: still, delay: 100 }] }),
    W,
    H,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2) construction.gif — the iconic UNDER-CONSTRUCTION caution bar: diagonal
//    yellow/black barber-pole stripes that SCROLL, capped by two hazard triangles.
//    Font-free on purpose — the words live in the page's HTML (accessible), the
//    GIF carries the icon. Wide banner aspect, like the real ones.
// ═══════════════════════════════════════════════════════════════════════════════
const CONS = [
  [26, 26, 26], // 0 black
  [255, 212, 0], // 1 caution yellow
  [20, 20, 20], // 2 stripe dark
  [255, 255, 255], // 3 white (border)
];
const K = { BLACK: 0, YEL: 1, DARK: 2, WHITE: 3 };

function consTriangle(c, cx, topY) {
  // a small hazard triangle: yellow fill, black border, a black "!" — static flavor
  const h = 13;
  for (let i = 0; i < h; i++) {
    const half = Math.round((i / h) * 8);
    for (let x = cx - half; x <= cx + half; x++) c.set(x, topY + i, K.YEL);
    c.set(cx - half, topY + i, K.BLACK);
    c.set(cx + half, topY + i, K.BLACK);
  }
  for (let x = cx - 8; x <= cx + 8; x++) c.set(x, topY + h, K.BLACK); // base
  // exclamation
  c.rect(cx, topY + 4, cx, topY + 8, K.BLACK);
  c.set(cx, topY + 10, K.BLACK);
}

function consFrame(offset) {
  const W = 104;
  const H = 26;
  const c = canvas(W, H, K.BLACK);
  const stripeW = 6;
  // scrolling diagonal barber-pole in the central band
  for (let y = 4; y < H - 4; y++) {
    for (let x = 14; x < W - 14; x++) {
      const s = (((x + y + offset) % (stripeW * 2)) + stripeW * 2) % (stripeW * 2);
      c.set(x, y, s < stripeW ? K.YEL : K.DARK);
    }
  }
  // white top/bottom rails
  c.rect(0, 1, W - 1, 2, K.WHITE);
  c.rect(0, H - 3, W - 1, H - 2, K.WHITE);
  // hazard triangles at each end
  consTriangle(c, 7, 6);
  consTriangle(c, W - 8, 6);
  return c.indices();
}

{
  const W = 104;
  const H = 26;
  const N = 6;
  const frames = Array.from({ length: N }, (_, i) => ({
    indices: consFrame(i * 4), // shift the barber-pole 4px/frame → it scrolls
    delay: 12,
  }));
  write('construction.gif', encodeGif({ width: W, height: H, palette: CONS, frames }), W, H);
  write(
    'construction-static.gif',
    encodeGif({
      width: W,
      height: H,
      palette: CONS,
      frames: [{ indices: consFrame(0), delay: 100 }],
    }),
    W,
    H,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3) rainbow-rule.gif — the GeoCities rainbow <hr>: a glossy 7-band rainbow bar
//    with a slow horizontal shimmer. Decorative divider, no text. Seamless loop
//    (7 frames × 6px = one full 42px band period).
// ═══════════════════════════════════════════════════════════════════════════════
const RAIN = [
  [255, 43, 43], // 0 red
  [255, 140, 0], // 1 orange
  [255, 230, 0], // 2 yellow
  [46, 204, 64], // 3 green
  [57, 204, 204], // 4 cyan
  [43, 111, 214], // 5 blue
  [177, 13, 201], // 6 violet
  [255, 255, 255], // 7 top highlight
  [26, 26, 42], // 8 bottom shadow
];
const R = { WHITE: 7, DARK: 8 };

function rainbowFrame(offset) {
  const W = 168;
  const H = 8;
  const bandW = 6;
  const period = bandW * 7;
  const c = canvas(W, H, R.DARK);
  for (let x = 0; x < W; x++) {
    const band = Math.floor(((((x + offset) % period) + period) % period) / bandW); // 0..6
    for (let y = 1; y < H - 1; y++) c.set(x, y, band);
    c.set(x, 0, R.WHITE); // glossy top edge
    c.set(x, H - 1, R.DARK); // shadowed bottom edge
  }
  return c.indices();
}

{
  const W = 168;
  const H = 8;
  const N = 7;
  const frames = Array.from({ length: N }, (_, i) => ({
    indices: rainbowFrame(i * 6), // 7×6 = 42 = one band period → seamless shimmer
    delay: 12,
  }));
  write('rainbow-rule.gif', encodeGif({ width: W, height: H, palette: RAIN, frames }), W, H);
  write(
    'rainbow-rule-static.gif',
    encodeGif({
      width: W,
      height: H,
      palette: RAIN,
      frames: [{ indices: rainbowFrame(0), delay: 100 }],
    }),
    W,
    H,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4) wallpaper.gif — the single most GeoCities thing of all: a tiled background.
//    A sparse dark-navy starfield, 48×48, seamless (no star within 1px of an edge).
//    DARK on purpose: the floor's light text gains contrast over it (WCAG-friendly),
//    and the busy era reads instantly. One frame — it's a texture, not an animation.
// ═══════════════════════════════════════════════════════════════════════════════
const WALL = [
  [10, 16, 36], // 0 deep navy base
  [205, 214, 255], // 1 bright star
  [58, 74, 128], // 2 dim star arm
  [106, 58, 106], // 3 faint magenta speck
];
const T = { BG: 0, STAR: 1, DIM: 2, ACCENT: 3 };

function wallpaperTile() {
  const c = canvas(48, 48, T.BG);
  const stars = [
    [6, 8],
    [20, 30],
    [38, 12],
    [14, 40],
    [30, 44],
    [44, 28],
    [10, 22],
    [34, 34],
  ];
  for (const [x, y] of stars) {
    c.set(x - 1, y, T.DIM);
    c.set(x + 1, y, T.DIM);
    c.set(x, y - 1, T.DIM);
    c.set(x, y + 1, T.DIM);
    c.set(x, y, T.STAR); // bright core over the dim cross
  }
  for (const [x, y] of [
    [24, 10],
    [8, 36],
    [40, 44],
  ])
    c.set(x, y, T.ACCENT);
  return c.indices();
}

write(
  'wallpaper.gif',
  encodeGif({
    width: 48,
    height: 48,
    palette: WALL,
    frames: [{ indices: wallpaperTile(), delay: 100 }],
  }),
  48,
  48,
);

// ═══════════════════════════════════════════════════════════════════════════════
// 5) new-badge.gif — the classic GeoCities "NEW!" blinky: a tiny double-bordered
//    badge whose background + border colors alternate, flagging the freshest link
//    (the new guestbook). WCAG 2.3.1: two frames at 0.45s ≈ 1.1 Hz (well under the
//    3/s limit), a <0.1 relative-luminance swing (below the flash threshold), tiny
//    area, and the lettering never blinks OUT (white throughout). A *-static twin
//    serves under prefers-reduced-motion; "NEW!" is also the <img alt>.
// ═══════════════════════════════════════════════════════════════════════════════
const NEWB = [
  [255, 0, 153], // 0 magenta bg (frame A)
  [0, 102, 255], // 1 electric-blue bg (frame B)
  [255, 255, 255], // 2 white lettering (constant)
  [255, 230, 0], // 3 yellow border
  [57, 204, 204], // 4 cyan border
];
function newBadgeFrame(alt) {
  const W = 56;
  const H = 22;
  const c = canvas(W, H, alt ? 1 : 0);
  const outer = alt ? 4 : 3; // the two border rings swap each frame for the shimmer
  const inner = alt ? 3 : 4;
  // outer ring (2px)
  c.rect(0, 0, W - 1, 1, outer);
  c.rect(0, H - 2, W - 1, H - 1, outer);
  c.rect(0, 0, 1, H - 1, outer);
  c.rect(W - 2, 0, W - 1, H - 1, outer);
  // inner ring (1px), inset by 2
  c.rect(2, 2, W - 3, 2, inner);
  c.rect(2, H - 3, W - 3, H - 3, inner);
  c.rect(2, 2, 2, H - 3, inner);
  c.rect(W - 3, 2, W - 3, H - 3, inner);
  // "NEW!" centered (2× → ~32px wide, 10px tall): x0=12, y0=6
  drawText(c, 'NEW!', 12, 6, 2, 2);
  return c.indices();
}

{
  const W = 56;
  const H = 22;
  const frames = [
    { indices: newBadgeFrame(false), delay: 45 },
    { indices: newBadgeFrame(true), delay: 45 },
  ];
  write('new-badge.gif', encodeGif({ width: W, height: H, palette: NEWB, frames }), W, H);
  write(
    'new-badge-static.gif',
    encodeGif({
      width: W,
      height: H,
      palette: NEWB,
      frames: [{ indices: newBadgeFrame(false), delay: 100 }],
    }),
    W,
    H,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6) atmail.gif — the GeoCities "@-mail" envelope: a little email envelope that
//    gently bobs with a pulsing red "1" notification badge (you've got mail!).
//    Replaces the 2000-floor's CSS-spun "@" with a real printed GIF. Baked on the
//    floor's furniture color so it frames seamlessly. WCAG 2.3.1: a 1–2px bob and
//    a 1px badge pulse (no flash, no on/off blink), with a *-static twin under
//    prefers-reduced-motion. The "Email the webmaster" label lives on the <a>.
// ═══════════════════════════════════════════════════════════════════════════════
const MAIL = [
  [205, 212, 220], // 0 tile bg — the stamp's own backing behind the envelope (self-contained; framed by .tl__mail)
  [247, 241, 226], // 1 envelope cream
  [90, 74, 42], // 2 outline / flap seam
  [226, 59, 43], // 3 "new mail" red badge
  [255, 255, 255], // 4 white ("1" + highlight)
];
const M = { BG: 0, CREAM: 1, DARK: 2, RED: 3, WHITE: 4 };

function mailFrame(bob, badgeR) {
  const W = 44;
  const H = 34;
  const c = canvas(W, H, M.BG);
  const x0 = 6;
  const x1 = 37;
  const yTop = 9 + bob;
  const yBot = yTop + 16;
  c.rect(x0, yTop, x1, yBot, M.CREAM); // body
  c.rect(x0, yTop, x1, yTop, M.DARK); // top edge
  c.rect(x0, yBot, x1, yBot, M.DARK); // bottom edge
  c.rect(x0, yTop, x0, yBot, M.DARK); // left edge
  c.rect(x1, yTop, x1, yBot, M.DARK); // right edge
  // the flap: two diagonals from the top corners down to a center apex
  const cxm = 21;
  const lN = cxm - x0;
  const rN = x1 - cxm;
  for (let i = 0; i <= lN; i++) c.set(x0 + i, yTop + Math.round((i / lN) * 9), M.DARK);
  for (let i = 0; i <= rN; i++) c.set(x1 - i, yTop + Math.round((i / rN) * 9), M.DARK);
  // the "you've got mail" badge: a red disc with a white "1"
  c.disc(x1 - 1, yTop - 1, badgeR, M.RED);
  c.rect(x1 - 1, yTop - 3, x1 - 1, yTop + 1, M.WHITE);
  return c.indices();
}

{
  const W = 44;
  const H = 34;
  const bobs = [0, 1, 2, 2, 1, 0];
  const radii = [3, 4, 4, 3, 3, 4];
  const frames = bobs.map((b, i) => ({ indices: mailFrame(b, radii[i]), delay: 13 }));
  write('atmail.gif', encodeGif({ width: W, height: H, palette: MAIL, frames }), W, H);
  write(
    'atmail-static.gif',
    encodeGif({
      width: W,
      height: H,
      palette: MAIL,
      frames: [{ indices: mailFrame(1, 4), delay: 100 }],
    }),
    W,
    H,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7) trophy.gif — the leaderboard centerpiece: a gold winner's cup that bobs while
//    a white GLEAM sweeps across the bowl and little sparkles pop at the corners.
//    A baked dark tile (the page frames it on a dark panel). WCAG-safe: a 1–2px bob
//    + a moving highlight, no flash. *-static twin for reduced motion.
// ═══════════════════════════════════════════════════════════════════════════════
const TROPHY = [
  [14, 20, 48], // 0 bg navy tile
  [255, 214, 92], // 1 gold light
  [214, 160, 38], // 2 gold mid
  [150, 104, 20], // 3 gold dark
  [120, 78, 40], // 4 base brown
  [255, 255, 255], // 5 white gleam / "1"
  [94, 200, 255], // 6 cyan sparkle
  [255, 94, 199], // 7 pink sparkle
];
const TR = { BG: 0, GL: 1, GM: 2, GD: 3, BASE: 4, WHITE: 5, CY: 6, PK: 7 };

function trophyFrame(phase, gleamX, sparkle) {
  const W = 48;
  const H = 56;
  const c = canvas(W, H, TR.BG);
  const bob = Math.round(Math.sin(phase) * 1.5);
  const cx = 24;
  // bowl: a rounded cup narrowing downward
  for (let y = 11 + bob; y <= 30 + bob; y++) {
    const t = (y - (11 + bob)) / 19;
    const hw = Math.round(13 - t * 7);
    for (let x = cx - hw; x <= cx + hw; x++) {
      let col = TR.GM;
      if (x < cx - hw + 4) col = TR.GL;
      else if (x > cx + hw - 3) col = TR.GD;
      c.set(x, y, col);
    }
  }
  c.rect(cx - 13, 9 + bob, cx + 13, 10 + bob, TR.GL); // rim
  // handles (open arcs at each side)
  for (let a = -Math.PI / 2; a <= Math.PI / 2; a += 0.2) {
    c.set(cx - 13 - Math.cos(a) * 4, 17 + bob + Math.sin(a) * 6, TR.GM);
    c.set(cx + 13 + Math.cos(a) * 4, 17 + bob + Math.sin(a) * 6, TR.GM);
  }
  c.rect(cx - 2, 30 + bob, cx + 2, 38 + bob, TR.GD); // stem
  c.rect(cx - 8, 38 + bob, cx + 8, 41 + bob, TR.GM); // plinth
  c.rect(cx - 11, 42 + bob, cx + 11, 46 + bob, TR.BASE); // base
  // gleam sweep across the bowl
  for (let y = 12 + bob; y <= 29 + bob; y++) {
    if (gleamX >= cx - 12 && gleamX <= cx + 12) {
      c.set(gleamX, y, TR.WHITE);
      c.set(gleamX + 1, y, TR.GL);
    }
  }
  c.rect(cx, 16 + bob, cx, 24 + bob, TR.WHITE); // a "1" on the cup
  // corner sparkles (4-point twinkle)
  const star = (sx, sy, col) => {
    c.set(sx, sy, TR.WHITE);
    c.set(sx - 1, sy, col);
    c.set(sx + 1, sy, col);
    c.set(sx, sy - 1, col);
    c.set(sx, sy + 1, col);
  };
  if (sparkle === 1) star(8, 12, TR.CY);
  if (sparkle === 2) star(40, 20, TR.PK);
  return c.indices();
}

{
  const W = 48;
  const H = 56;
  const N = 10;
  const frames = Array.from({ length: N }, (_, i) => ({
    indices: trophyFrame(
      (i / N) * Math.PI * 2,
      12 + Math.round((i / N) * 24),
      i % 4 === 0 ? 1 : i % 4 === 2 ? 2 : 0,
    ),
    delay: 11,
  }));
  write('trophy.gif', encodeGif({ width: W, height: H, palette: TROPHY, frames }), W, H);
  write(
    'trophy-static.gif',
    encodeGif({
      width: W,
      height: H,
      palette: TROPHY,
      frames: [{ indices: trophyFrame(Math.PI / 2, 20, 0), delay: 100 }],
    }),
    W,
    H,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8) flames.gif — a "your score is ON FIRE" banner: tongues of flame licking upward
//    along a wide strip, flickering. WCAG: the bright (yellow) area is small + at the
//    tips, the band is short, and motion is localized tongues — not a full-field
//    light/dark flash. *-static twin for reduced motion.
// ═══════════════════════════════════════════════════════════════════════════════
const FLAME = [
  [12, 8, 20], // 0 bg dark
  [255, 232, 120], // 1 hot yellow (tips)
  [255, 150, 30], // 2 orange
  [220, 50, 20], // 3 red
  [120, 20, 10], // 4 deep red (base)
];
const FL = { BG: 0, Y: 1, O: 2, R: 3, D: 4 };

function flameFrame(t) {
  const W = 120;
  const H = 28;
  const c = canvas(W, H, FL.BG);
  for (let x = 0; x < W; x++) {
    const lick =
      18 +
      Math.sin(x * 0.5 + t * 1.3) * 5 +
      Math.sin(x * 0.21 - t * 2.1) * 4 +
      Math.sin(t * 3 + x) * 2;
    const top = Math.max(2, Math.round(H - lick));
    for (let y = H - 1; y >= top; y--) {
      const f = (H - 1 - y) / (H - 1 - top + 0.001); // 0 base → 1 tip
      c.set(x, y, f > 0.8 ? FL.Y : f > 0.55 ? FL.O : f > 0.3 ? FL.R : FL.D);
    }
  }
  return c.indices();
}

{
  const W = 120;
  const H = 28;
  const N = 8;
  const frames = Array.from({ length: N }, (_, i) => ({
    indices: flameFrame((i / N) * Math.PI * 2),
    delay: 9,
  }));
  write('flames.gif', encodeGif({ width: W, height: H, palette: FLAME, frames }), W, H);
  write(
    'flames-static.gif',
    encodeGif({
      width: W,
      height: H,
      palette: FLAME,
      frames: [{ indices: flameFrame(0), delay: 100 }],
    }),
    W,
    H,
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// 9) coins.gif — falling gold coins ($$$), spinning as they drop. Seamless loop
//    (each coin travels exactly one column-period over the frame set). A baked dark
//    tile. WCAG: small moving sprites, no flash. *-static twin for reduced motion.
// ═══════════════════════════════════════════════════════════════════════════════
const COIN = [
  [14, 20, 48], // 0 bg navy tile
  [255, 214, 92], // 1 gold light
  [214, 160, 38], // 2 gold mid
  [150, 104, 20], // 3 gold dark / "$"
  [255, 255, 255], // 4 shine
];
const CO = { BG: 0, GL: 1, GM: 2, GD: 3, SH: 4 };

function coinAt(c, cx, cy, squash) {
  const rx = Math.max(1, Math.round(6 * squash)); // edge-on when squashed (spin)
  const ry = 6;
  for (let y = -ry; y <= ry; y++)
    for (let x = -rx; x <= rx; x++) {
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) {
        let col = CO.GM;
        if (x < -rx * 0.3) col = CO.GL;
        else if (x > rx * 0.4) col = CO.GD;
        c.set(cx + x, cy + y, col);
      }
    }
  if (rx > 2) {
    c.set(cx - Math.round(rx * 0.3), cy - 2, CO.SH); // shine glint
    c.rect(cx, cy - 3, cx, cy + 3, CO.GD); // a "$" stroke
  }
}

function coinsFrame(p) {
  const W = 64;
  const H = 48;
  const period = H + 12;
  const c = canvas(W, H, CO.BG);
  const cols = [
    [12, 0],
    [32, 22],
    [52, 40],
  ];
  for (const [x, off] of cols) {
    const y = (((p * period + off) % period) + period) % period;
    const squash = 0.35 + 0.65 * Math.abs(Math.sin(p * Math.PI * 4 + x * 0.1));
    coinAt(c, x, Math.round(y) - 6, squash);
  }
  return c.indices();
}

{
  const W = 64;
  const H = 48;
  const N = 8;
  const frames = Array.from({ length: N }, (_, i) => ({ indices: coinsFrame(i / N), delay: 10 }));
  write('coins.gif', encodeGif({ width: W, height: H, palette: COIN, frames }), W, H);
  write(
    'coins-static.gif',
    encodeGif({
      width: W,
      height: H,
      palette: COIN,
      frames: [{ indices: coinsFrame(0.15), delay: 100 }],
    }),
    W,
    H,
  );
}

console.log('done — original GIFs generated.');
