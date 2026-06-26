import { describe, it, expect } from 'vitest';
import { encodeGif, lzwEncode, lzwDecode } from './gif89a.mjs';

// A spec-level GIF89a parser — walks the real block structure (LSD, GCT, the
// NETSCAPE loop ext, each frame's GCE + image data sub-blocks) and LZW-decodes
// every frame back to indices. Pairing it with the encoder gives a true file-
// level round-trip; Chromium's own decoder is the separate end-to-end oracle
// (shoot:gifs). Kept in the test only — production never decodes.
function parseGif(bytes) {
  let p = 0;
  const u8 = () => bytes[p++];
  const u16 = () => {
    const v = bytes[p] | (bytes[p + 1] << 8);
    p += 2;
    return v;
  };
  const sig = String.fromCharCode(...bytes.slice(0, 6));
  p = 6;
  const width = u16();
  const height = u16();
  const packed = u8();
  u8(); // background index
  u8(); // aspect ratio
  const palette = [];
  if (packed & 0x80) {
    const n = 1 << ((packed & 0x07) + 1);
    for (let i = 0; i < n; i++) palette.push([u8(), u8(), u8()]);
  }
  const frames = [];
  let loop = null;
  let delay = 0;
  for (;;) {
    const b = u8();
    if (b === 0x3b) break; // trailer
    if (b === 0x21) {
      const label = u8();
      if (label === 0xf9) {
        u8(); // block size (4)
        u8(); // flags
        delay = u16();
        u8(); // transparent index
        u8(); // block terminator
      } else if (label === 0xff) {
        const size = u8();
        const name = String.fromCharCode(...bytes.slice(p, p + size));
        p += size;
        let sub;
        while ((sub = u8()) !== 0) {
          if (name === 'NETSCAPE2.0' && sub === 3) {
            u8(); // sub-block id (1)
            loop = u16();
          } else {
            p += sub;
          }
        }
      } else {
        let sub;
        while ((sub = u8()) !== 0) p += sub;
      }
    } else if (b === 0x2c) {
      u16(); // left
      u16(); // top
      const w = u16();
      const h = u16();
      u8(); // image packed (no local table from our encoder)
      const minCodeSize = u8();
      const data = [];
      let sub;
      while ((sub = u8()) !== 0) for (let i = 0; i < sub; i++) data.push(u8());
      frames.push({ delay, w, h, indices: lzwDecode(minCodeSize, data) });
    }
  }
  return { sig, width, height, palette, frames, loop };
}

describe('gif89a: LZW round-trips', () => {
  it('round-trips a flat run (heavy dictionary reuse)', () => {
    const idx = new Array(500).fill(3);
    expect(lzwDecode(2, lzwEncode(2, idx))).toEqual(idx);
  });

  it('round-trips a varied stream that forces several code-width bumps', () => {
    // Deterministic but varied — exercises dictionary growth past 8/16/32 codes.
    const idx = Array.from({ length: 4000 }, (_, i) => (i * i + i * 7) % 13);
    expect(lzwDecode(4, lzwEncode(4, idx))).toEqual(idx);
  });

  it('round-trips a single-pixel stream (degenerate)', () => {
    expect(lzwDecode(2, lzwEncode(2, [1]))).toEqual([1]);
  });
});

describe('gif89a: file structure', () => {
  const palette = [
    [0, 0, 0],
    [255, 0, 0],
    [0, 255, 0],
    [0, 0, 255],
  ];
  // two 2x2 frames
  const frames = [
    { indices: [0, 1, 2, 3], delay: 12 },
    { indices: [3, 2, 1, 0], delay: 20 },
  ];
  const gif = encodeGif({ width: 2, height: 2, palette, frames, loop: 0 });

  it('starts with the GIF89a signature and ends with the trailer', () => {
    expect(String.fromCharCode(...gif.slice(0, 6))).toBe('GIF89a');
    expect(gif[gif.length - 1]).toBe(0x3b);
  });

  it('parses back to the same dimensions, frame count, loop flag, and palette head', () => {
    const g = parseGif(gif);
    expect(g.sig).toBe('GIF89a');
    expect([g.width, g.height]).toEqual([2, 2]);
    expect(g.frames).toHaveLength(2);
    expect(g.loop).toBe(0); // loop forever
    expect(g.palette.slice(0, 4)).toEqual(palette);
  });

  it('round-trips every frame’s pixels and per-frame delay through the full file', () => {
    const g = parseGif(gif);
    expect(g.frames[0].indices).toEqual(frames[0].indices);
    expect(g.frames[1].indices).toEqual(frames[1].indices);
    expect(g.frames.map((f) => f.delay)).toEqual([12, 20]);
  });

  it('round-trips a wider 16-color frame (minCodeSize 4) end to end', () => {
    const pal16 = Array.from({ length: 16 }, (_, i) => [i * 16, 255 - i * 16, (i * 32) % 256]);
    const indices = Array.from({ length: 8 * 8 }, (_, i) => i % 16);
    const g = parseGif(encodeGif({ width: 8, height: 8, palette: pal16, frames: [{ indices }] }));
    expect(g.frames[0].indices).toEqual(indices);
  });

  it('rejects a frame whose pixel count doesn’t match the canvas', () => {
    expect(() =>
      encodeGif({ width: 2, height: 2, palette, frames: [{ indices: [0, 1, 2] }] }),
    ).toThrow();
  });

  it('rejects a palette index past the table (fail fast on a bad asset)', () => {
    // palette has 4 colors → indices 0..3 valid; 4 references a non-existent color.
    expect(() =>
      encodeGif({ width: 2, height: 2, palette, frames: [{ indices: [0, 1, 2, 4] }] }),
    ).toThrow(/out of range/);
  });
});
