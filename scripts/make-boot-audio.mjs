// Turn a real Scoobert track into the "degraded MIDI / haunted CD-ROM" boot loop.
//
//   node scripts/make-boot-audio.mjs <src.mp3> <dst.mp3> [loopSeconds]
//
// There's no ffmpeg/sox in this env, so we drive the Chromium that ships with
// Playwright: decode the MP3 with Web Audio (resampling straight down to a crunchy
// 11.025 kHz), grab a hooky segment past the intro silence, soften it with a
// one-pole lowpass, equal-power crossfade the loop seam so it repeats seamlessly,
// then quantize to 8-bit mono PCM (the quantization noise IS the aesthetic — how
// a 1996 CD-ROM would have stored this) and compress to a small low-bitrate MP3
// (no WAV in this repo). An 18 s loop lands ~70 kB.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { chromium } from 'playwright';
import { encodeMp3, int16FromB64 } from './lib/mp3.mjs';

const [, , src, dst, loopArg = '18'] = process.argv;
if (!src || !dst) {
  console.error('usage: make-boot-audio.mjs <src.mp3> <dst.mp3> [loopSeconds]');
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
    const a = 0.3;
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

    // Quantize to 8-bit (the crunch), then expand back to 16-bit PCM for the MP3
    // encoder — the lo-fi character is baked in before MP3 compression.
    const pcm = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
      let s = out[i] * gain;
      s = Math.max(-1, Math.min(1, s));
      const q = Math.round((s + 1) * 127.5); // 8-bit (0..255)
      pcm[i] = Math.max(-32768, Math.min(32767, Math.round((q / 127.5 - 1) * 32767)));
    }
    const u8 = new Uint8Array(pcm.buffer);
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
    return btoa(s);
  },
  { srcB64, TARGET_SR, loopSeconds },
);
await browser.close();

mkdirSync(dirname(dst), { recursive: true });
const mp3 = encodeMp3(int16FromB64(b64), TARGET_SR);
writeFileSync(dst, mp3);
console.log(`wrote ${dst} (${(mp3.length / 1024) | 0} kB, ${TARGET_SR} Hz mono MP3)`);
