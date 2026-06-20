// Turn a real Scoobert track into the "degraded MIDI / haunted CD-ROM" boot loop.
//
//   node scripts/make-boot-audio.mjs <src.mp3> <dst.wav> [loopSeconds]
//
// There's no ffmpeg/sox in this env, so we drive the Chromium that ships with
// Playwright: decode the MP3 with Web Audio (resampling straight down to a crunchy
// 11.025 kHz), grab a hooky segment past the intro silence, soften it with a
// one-pole lowpass, equal-power crossfade the loop seam so it repeats seamlessly,
// then quantize to 8-bit mono PCM. 8-bit/11k is genuinely how a 1996 CD-ROM would
// have stored this, so the quantization noise IS the aesthetic. Output WAV is
// ~11 kB/sec, so an 18 s loop is ~200 kB — small enough to ship.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';

const [, , src, dst, loopArg = '18'] = process.argv;
if (!src || !dst) {
  console.error('usage: make-boot-audio.mjs <src.mp3> <dst.wav> [loopSeconds]');
  process.exit(1);
}
const loopSeconds = Number(loopArg);
const TARGET_SR = 11025;
const srcB64 = readFileSync(src).toString('base64');

const browser = await chromium.launch();
const page = await browser.newPage();
const b64 = await page.evaluate(
  async ({ srcB64, TARGET_SR, loopSeconds }) => {
    // base64 -> ArrayBuffer
    const bin = atob(srcB64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

    // Decode straight to the crunchy target rate (Chromium resamples on decode).
    const ctx = new OfflineAudioContext(1, 1, TARGET_SR);
    const decoded = await ctx.decodeAudioData(bytes.buffer);

    // Downmix to mono.
    const ch = decoded.numberOfChannels;
    const N = decoded.length;
    const mono = new Float32Array(N);
    for (let c = 0; c < ch; c++) {
      const d = decoded.getChannelData(c);
      for (let i = 0; i < N; i++) mono[i] += d[i] / ch;
    }

    // Skip leading silence / count-in: first sample whose 1024-window RMS clears
    // a threshold, then back off a hair so we don't clip the transient.
    const win = 1024;
    let start = 0;
    for (let i = 0; i + win < N; i += win) {
      let sum = 0;
      for (let j = 0; j < win; j++) sum += mono[i + j] * mono[i + j];
      if (Math.sqrt(sum / win) > 0.015) {
        start = Math.max(0, i - win);
        break;
      }
    }

    // Extract the loop segment (clamped to what's available).
    let segLen = Math.floor(loopSeconds * TARGET_SR);
    if (start + segLen > N) segLen = N - start;
    const seg = mono.slice(start, start + segLen);

    // Gentle one-pole lowpass for warmth (tames resampler/quantization fizz).
    const a = 0.30;
    let prev = seg[0];
    for (let i = 0; i < seg.length; i++) {
      prev = prev + a * (seg[i] - prev);
      seg[i] = prev;
    }

    // Equal-power crossfade the tail back into the head so the loop is seamless.
    const xf = Math.min(Math.floor(0.4 * TARGET_SR), Math.floor(seg.length / 4));
    const outLen = seg.length - xf;
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) out[i] = seg[i];
    for (let i = 0; i < xf; i++) {
      const t = i / xf;
      const fin = Math.sin((t * Math.PI) / 2);
      const fout = Math.cos((t * Math.PI) / 2);
      out[i] = seg[i] * fin + seg[outLen + i] * fout;
    }

    // Normalize to ~-1 dBFS so 8-bit uses its full range.
    let peak = 1e-6;
    for (let i = 0; i < outLen; i++) peak = Math.max(peak, Math.abs(out[i]));
    const gain = 0.9 / peak;

    // 8-bit unsigned PCM WAV (the quantization is the crunch).
    const headerLen = 44;
    const wav = new Uint8Array(headerLen + outLen);
    const dv = new DataView(wav.buffer);
    const wstr = (off, s) => { for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i)); };
    wstr(0, 'RIFF'); dv.setUint32(4, 36 + outLen, true); wstr(8, 'WAVE');
    wstr(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true);
    dv.setUint16(22, 1, true); dv.setUint32(24, TARGET_SR, true);
    dv.setUint32(28, TARGET_SR, true); dv.setUint16(32, 1, true); dv.setUint16(34, 8, true);
    wstr(36, 'data'); dv.setUint32(40, outLen, true);
    for (let i = 0; i < outLen; i++) {
      let s = out[i] * gain;
      s = Math.max(-1, Math.min(1, s));
      wav[headerLen + i] = Math.round((s + 1) * 127.5);
    }

    // back to base64 for the bridge
    let s = '';
    for (let i = 0; i < wav.length; i++) s += String.fromCharCode(wav[i]);
    return btoa(s);
  },
  { srcB64, TARGET_SR, loopSeconds },
);
await browser.close();

mkdirSync(dirname(dst), { recursive: true });
writeFileSync(dst, Buffer.from(b64, 'base64'));
console.log(`wrote ${dst} (${(Buffer.from(b64, 'base64').length / 1024) | 0} kB, ${TARGET_SR} Hz 8-bit mono)`);
