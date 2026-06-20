// Render the jukebox catalog: each master in media/masters/ becomes a degraded,
// tape-warped loop in public/audio/jukebox/<slug>.wav — the "fucked up" versions
// the jukebox plays. Same headless-Chromium / Web-Audio trick as
// make-boot-audio.mjs (no ffmpeg here), with an added TAPE pass: the segment is
// resampled at a wobbling, slightly-slow read rate (wow + flutter + a warped
// slow-down) and dusted with hiss before the 8-bit / 11 kHz crush. Recognizable,
// but wrong — a memory of the song, not the song.
//
//   node scripts/make-jukebox-audio.mjs
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { chromium } from 'playwright';

const TARGET_SR = 11025;
const LOOP_SECONDS = 18;
const OUT_DIR = 'public/audio/jukebox';

// Single source of truth for the catalog (shared with src/data/jukebox.ts), so a
// slug can't drift between what we render here and what the app asks for. Each
// row: { slug, title, source } — `source` is the master in media/masters/, `slug`
// is the output filename. (`title` is the app's concern; ignored here.)
const TRACKS = JSON.parse(readFileSync(new URL('../src/data/jukebox.catalog.json', import.meta.url))).map(
  ({ source, slug }) => ({ file: source, slug }),
);

const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync(OUT_DIR, { recursive: true });

for (const { file, slug } of TRACKS) {
  const srcB64 = readFileSync(`media/masters/${file}`).toString('base64');
  const b64 = await page.evaluate(
    async ({ srcB64, TARGET_SR, loopSeconds }) => {
      const bin = atob(srcB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const ctx = new OfflineAudioContext(1, 1, TARGET_SR);
      const decoded = await ctx.decodeAudioData(bytes.buffer);

      // downmix to mono
      const ch = decoded.numberOfChannels;
      const N = decoded.length;
      const mono = new Float32Array(N);
      for (let c = 0; c < ch; c++) {
        const d = decoded.getChannelData(c);
        for (let i = 0; i < N; i++) mono[i] += d[i] / ch;
      }

      // skip leading silence / count-in
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

      let segLen = Math.floor(loopSeconds * TARGET_SR);
      if (start + segLen > N) segLen = N - start;
      const seg = mono.slice(start, start + segLen);

      // gentle warmth lowpass
      let prev = seg[0];
      for (let i = 0; i < seg.length; i++) {
        prev = prev + 0.3 * (seg[i] - prev);
        seg[i] = prev;
      }

      // ── TAPE: resample at a wobbling, slightly-slow rate (wow + flutter +
      //    a warped overall slow-down). This is the "fucked up" pitch character.
      const wowF = 0.6;
      const wowD = 0.024; // ±2.4% slow drift
      const flutF = 7.3;
      const flutD = 0.008; // ±0.8% flutter
      const base = 0.965; // overall warped slow-down (lower = more dragged)
      const warpedLen = Math.floor(seg.length / base);
      const warped = new Float32Array(warpedLen);
      let rp = 0;
      for (let i = 0; i < warpedLen; i++) {
        const t = i / TARGET_SR;
        const rate =
          base * (1 + wowD * Math.sin(2 * Math.PI * wowF * t) + flutD * Math.sin(2 * Math.PI * flutF * t + 1.3));
        const idx = Math.floor(rp);
        const frac = rp - idx;
        const a = seg[idx] || 0;
        const b = idx + 1 < seg.length ? seg[idx + 1] : a;
        warped[i] = a + (b - a) * frac;
        rp += rate;
        if (rp > seg.length - 2) rp = seg.length - 2;
      }

      // equal-power crossfade the seam on the warped buffer so it loops clean
      const xf = Math.min(Math.floor(0.4 * TARGET_SR), Math.floor(warped.length / 4));
      const outLen = warped.length - xf;
      const out = new Float32Array(outLen);
      for (let i = 0; i < outLen; i++) out[i] = warped[i];
      for (let i = 0; i < xf; i++) {
        const t = i / xf;
        out[i] = warped[i] * Math.sin((t * Math.PI) / 2) + warped[outLen + i] * Math.cos((t * Math.PI) / 2);
      }

      // a breath of tape hiss
      for (let i = 0; i < outLen; i++) out[i] += (Math.random() * 2 - 1) * 0.006;

      // normalize to ~-1 dBFS
      let peak = 1e-6;
      for (let i = 0; i < outLen; i++) peak = Math.max(peak, Math.abs(out[i]));
      const gain = 0.9 / peak;

      // 8-bit unsigned PCM WAV
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

      let s = '';
      for (let i = 0; i < wav.length; i++) s += String.fromCharCode(wav[i]);
      return btoa(s);
    },
    { srcB64, TARGET_SR, loopSeconds: LOOP_SECONDS },
  );
  const buf = Buffer.from(b64, 'base64');
  writeFileSync(`${OUT_DIR}/${slug}.wav`, buf);
  console.log(`wrote ${OUT_DIR}/${slug}.wav (${(buf.length / 1024) | 0} kB)`);
}

await browser.close();
