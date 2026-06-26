// gif89a.mjs — a tiny, DEPENDENCY-FREE GIF89a encoder. Just enough to emit our own
// ORIGINAL animated GIFs (looping, per-frame delay, an indexed palette) without
// pulling in a library or fetching anyone else's artifact. This is the joke made
// literal: a 2026 codebase hand-rolling LZW to print period-correct 1999 GIFs.
//
// It is NOT a general image library — frames are arrays of PALETTE INDICES (no
// quantizer), which keeps the art crisp + the encoder small. The companion
// decoder (lzwDecode) exists only so the unit test can prove a real round-trip;
// Chromium's own decoder is the final oracle (the shoot:gifs smoke renders them).
//
// Refs (algorithm only, no code copied): the GIF89a spec's LZW appendix and the
// classic Weiner/Poskanzer code-width timing (bump when the next free code passes
// the current width's max).

// ── LSB-first bit packer for variable-width LZW codes ──────────────────────────
class BitWriter {
  constructor() {
    this.bytes = [];
    this.acc = 0; // bit accumulator (stays < 2^20, safe for 32-bit bitwise)
    this.n = 0; // bits currently buffered
  }
  write(code, size) {
    this.acc |= code << this.n;
    this.n += size;
    while (this.n >= 8) {
      this.bytes.push(this.acc & 0xff);
      this.acc >>>= 8;
      this.n -= 8;
    }
  }
  flush() {
    if (this.n > 0) {
      this.bytes.push(this.acc & 0xff);
      this.acc = 0;
      this.n = 0;
    }
  }
}

/**
 * GIF-flavored LZW compress a stream of palette indices. `minCodeSize` is the
 * starting code width (>=2); clear = 1<<minCodeSize, EOI = clear+1, first data
 * code = EOI+1. Codes widen from minCodeSize+1 up to 12 bits, then a clear resets
 * the table — exactly the contract a GIF decoder reads back. Returns a byte array
 * (still un-sub-blocked).
 */
export function lzwEncode(minCodeSize, indices) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  const bw = new BitWriter();
  let codeSize = minCodeSize + 1;
  let dict = new Map();
  let next = eoiCode + 1;

  bw.write(clearCode, codeSize);

  if (indices.length === 0) {
    bw.write(eoiCode, codeSize);
    bw.flush();
    return bw.bytes;
  }

  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i];
    const key = prefix * 256 + k; // prefix <= 4095, k <= 255 → collision-free
    const found = dict.get(key);
    if (found !== undefined) {
      prefix = found;
    } else {
      bw.write(prefix, codeSize);
      if (next < 4096) {
        dict.set(key, next++);
        // Widen once the code value JUST assigned needs the wider width — i.e. the
        // assigned code reached 1<<codeSize. The prefix in this iteration was already
        // emitted at the old width above, so a value-V code is only ever emitted at a
        // width that can hold V (the Weiner/omggif timing; off-by-one here desyncs
        // any spec decoder at the first width bump even while a matching decoder
        // round-trips it). next is post-increment, so the assigned code was next-1.
        if (next - 1 >= 1 << codeSize && codeSize < 12) codeSize++;
      } else {
        // Table full at 4096 — emit a clear and start the dictionary over.
        bw.write(clearCode, codeSize);
        dict = new Map();
        codeSize = minCodeSize + 1;
        next = eoiCode + 1;
      }
      prefix = k;
    }
  }
  bw.write(prefix, codeSize);
  bw.write(eoiCode, codeSize);
  bw.flush();
  return bw.bytes;
}

/** Inverse of lzwEncode — for the round-trip test only. Returns the index array. */
export function lzwDecode(minCodeSize, bytes) {
  const clearCode = 1 << minCodeSize;
  const eoiCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let dict = [];
  const reset = () => {
    dict = [];
    for (let i = 0; i < clearCode; i++) dict.push([i]);
    dict.push(null, null); // clear, eoi placeholders
    codeSize = minCodeSize + 1;
  };
  reset();

  const out = [];
  let acc = 0;
  let n = 0;
  let pos = 0;
  const read = () => {
    while (n < codeSize) {
      acc |= (bytes[pos++] ?? 0) << n;
      n += 8;
    }
    const code = acc & ((1 << codeSize) - 1);
    acc >>>= codeSize;
    n -= codeSize;
    return code;
  };

  let prev = null;
  for (;;) {
    const code = read();
    if (code === clearCode) {
      reset();
      prev = null;
      continue;
    }
    if (code === eoiCode) break;
    let entry;
    if (dict[code]) entry = dict[code];
    else if (code === dict.length && prev)
      entry = prev.concat(prev[0]); // KwKwK
    else throw new Error(`bad LZW code ${code} at byte ${pos}`);
    for (const v of entry) out.push(v);
    if (prev) {
      if (dict.length < 4096) dict.push(prev.concat(entry[0]));
      // Mirror of the encoder: the decoder lags by one entry, so it widens right
      // after the add that brings its highest index to (1<<codeSize)-1 — i.e. when
      // the new length reaches 1<<codeSize — so it's already wide for the next read.
      if (dict.length === 1 << codeSize && codeSize < 12) codeSize++;
    }
    prev = entry;
  }
  return out;
}

/** GCT "size" field (0..7): table holds 2^(field+1) entries, the smallest that
 *  covers `paletteLen` colors. */
function gctSizeField(paletteLen) {
  let field = 0;
  while (1 << (field + 1) < paletteLen) field++;
  return field;
}

/**
 * Encode an animated GIF89a.
 *   width, height : pixel dimensions (every frame is full-size + opaque)
 *   palette       : array of [r,g,b], length 1..256
 *   frames        : [{ indices: number[](w*h palette indices), delay: centiseconds }]
 *   loop          : 0 = forever (default), n = n extra loops
 * Returns a Uint8Array of the .gif file bytes.
 */
export function encodeGif({ width, height, palette, frames, loop = 0 }) {
  if (palette.length < 1 || palette.length > 256) {
    throw new Error(`palette must hold 1..256 colors (got ${palette.length})`);
  }
  const out = [];
  const u8 = (...b) => {
    for (const x of b) out.push(x & 0xff);
  };
  const u16 = (v) => out.push(v & 0xff, (v >> 8) & 0xff);
  const str = (s) => {
    for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i));
  };

  const sizeField = gctSizeField(palette.length);
  const gctEntries = 1 << (sizeField + 1);
  const minCodeSize = Math.max(2, sizeField + 1);

  // Header + Logical Screen Descriptor.
  str('GIF89a');
  u16(width);
  u16(height);
  u8(0x80 | (sizeField << 4) | sizeField); // GCT present, color-res + GCT size
  u8(0); // background color index
  u8(0); // pixel aspect ratio

  // Global Color Table (padded to a power of two).
  for (let i = 0; i < gctEntries; i++) {
    const c = palette[i] || [0, 0, 0];
    u8(c[0], c[1], c[2]);
  }

  // NETSCAPE2.0 application extension → loop.
  u8(0x21, 0xff, 0x0b);
  str('NETSCAPE2.0');
  u8(0x03, 0x01);
  u16(loop);
  u8(0x00);

  for (const f of frames) {
    if (f.indices.length !== width * height) {
      throw new Error(`frame has ${f.indices.length} indices, expected ${width * height}`);
    }
    // Fail fast on a bad palette index — a future asset bug is far easier to read
    // here than as a mysteriously corrupt GIF (an index past the table decodes to
    // garbage/black in a real viewer).
    for (let i = 0; i < f.indices.length; i++) {
      const v = f.indices[i];
      if (!Number.isInteger(v) || v < 0 || v >= palette.length) {
        throw new Error(`frame index ${v} at ${i} out of range 0..${palette.length - 1}`);
      }
    }
    // Graphic Control Extension (per-frame delay; disposal=1, no transparency).
    u8(0x21, 0xf9, 0x04, 0x04);
    u16(f.delay ?? 10);
    u8(0x00, 0x00);

    // Image Descriptor (full frame, no local color table).
    u8(0x2c);
    u16(0);
    u16(0);
    u16(width);
    u16(height);
    u8(0x00);

    // Image data: min code size, then 255-byte sub-blocks, then a 0 terminator.
    u8(minCodeSize);
    const data = lzwEncode(minCodeSize, f.indices);
    for (let i = 0; i < data.length; i += 255) {
      const len = Math.min(255, data.length - i);
      u8(len);
      for (let j = 0; j < len; j++) u8(data[i + j]);
    }
    u8(0x00);
  }

  u8(0x3b); // trailer
  return Uint8Array.from(out);
}
