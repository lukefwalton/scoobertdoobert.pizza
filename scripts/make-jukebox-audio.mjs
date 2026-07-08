// Render the jukebox catalog: each master in media/masters/ becomes a degraded,
// tape-warped loop in public/audio/jukebox/<slug>.mp3 — the "fucked up" versions
// the jukebox plays. Same headless-Chromium / Web-Audio trick as
// make-boot-audio.mjs (no ffmpeg here), with an added TAPE pass: the segment is
// resampled at a wobbling, slightly-slow read rate (wow + flutter + a warped
// slow-down) and dusted with hiss before the 8-bit / 11 kHz crush. Recognizable,
// but wrong — a memory of the song, not the song.
//
// PLUS the HI-FI variant (the restoration reward): the same 18-second segment of
// the same master, rendered CLEAN — 44.1 kHz stereo, no tape pass, no hiss, no
// crush — to public/audio/jukebox/hifi/<slug>.mp3. Restoring a track at the
// control-room bench swaps its playback to this file; the lo-fi/hi-fi A/B is the
// whole reward, so the two bounces open on the same bar (same silence-skip).
// NOTE the hi-fi loop runs ~18.0s vs the lo-fi's ~18.65s (the 0.965 tape
// slow-down stretches it) — the engine crossfades between them, never syncs.
//
//   node scripts/make-jukebox-audio.mjs             # render both variants
//   node scripts/make-jukebox-audio.mjs --hifi-only # only the hi-fi files
//     (the lo-fi pass seeds Math.random() hiss, so re-rendering it churns
//      already-shipped bytes — use --hifi-only to add hi-fi without touching it)
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { encodeMp3, encodeMp3Stereo, int16FromB64 } from './lib/mp3.mjs';

const TARGET_SR = 11025;
const HIFI_SR = 44100;
const LOOP_SECONDS = 18;
const OUT_DIR = 'public/audio/jukebox';
const HIFI_DIR = 'public/audio/jukebox/hifi';
const HIFI_ONLY = process.argv.includes('--hifi-only');

// Single source of truth for the catalog (shared with src/data/jukebox.ts), so a
// slug can't drift between what we render here and what the app asks for. Each
// row: { slug, title, source } — `source` is the master in media/masters/, `slug`
// is the output filename. (`title` is the app's concern; ignored here.)
const TRACKS = JSON.parse(
  readFileSync(new URL('../src/data/jukebox.catalog.json', import.meta.url)),
).map(({ source, slug }) => ({ file: source, slug }));

// Preflight: every catalog `source` must exist before we spin up Chromium, so a
// bad catalog edit (typo'd filename, master not dropped in yet) fails fast with
// a clear message instead of partway through a render.
// A catalog `source` is either a bare filename (lives in media/masters/) OR a
// path with a slash (resolved under media/ — e.g. "music/2023/mob/07 Underwater.mp3"),
// so the catalog can pull straight from the album tree without copying masters in.
const masterPath = (f) => (f.includes('/') ? `media/${f}` : `media/masters/${f}`);

const missing = TRACKS.filter((t) => !existsSync(masterPath(t.file)));
if (missing.length) {
  console.error('make-jukebox-audio: missing masters:');
  for (const m of missing) console.error(`  - ${masterPath(m.file)}  (slug "${m.slug}")`);
  process.exit(1);
}

// And slugs must be unique — a duplicate would silently overwrite another
// track's <slug>.mp3 (the slug is the output filename).
const dupes = [...new Set(TRACKS.map((t) => t.slug).filter((s, i, a) => a.indexOf(s) !== i))];
if (dupes.length) {
  console.error(
    `make-jukebox-audio: duplicate catalog slug(s) — would overwrite output: ${dupes.join(', ')}`,
  );
  process.exit(1);
}

const browser = await chromium.launch();
const page = await browser.newPage();
mkdirSync(OUT_DIR, { recursive: true });
mkdirSync(HIFI_DIR, { recursive: true });

for (const { file, slug } of TRACKS) {
  const srcB64 = readFileSync(masterPath(file)).toString('base64');
  if (HIFI_ONLY) {
    await renderHifi(srcB64, slug);
    continue;
  }
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
          base *
          (1 +
            wowD * Math.sin(2 * Math.PI * wowF * t) +
            flutD * Math.sin(2 * Math.PI * flutF * t + 1.3));
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
        out[i] =
          warped[i] * Math.sin((t * Math.PI) / 2) +
          warped[outLen + i] * Math.cos((t * Math.PI) / 2);
      }

      // a breath of tape hiss
      for (let i = 0; i < outLen; i++) out[i] += (Math.random() * 2 - 1) * 0.006;

      // normalize to ~-1 dBFS
      let peak = 1e-6;
      for (let i = 0; i < outLen; i++) peak = Math.max(peak, Math.abs(out[i]));
      const gain = 0.9 / peak;

      // Quantize to 8-bit (the crunch), then expand back to 16-bit PCM for the
      // MP3 encoder — so the lo-fi character is baked in before MP3 compression.
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
    { srcB64, TARGET_SR, loopSeconds: LOOP_SECONDS },
  );
  const mp3 = encodeMp3(int16FromB64(b64), TARGET_SR);
  writeFileSync(`${OUT_DIR}/${slug}.mp3`, mp3);
  console.log(`wrote ${OUT_DIR}/${slug}.mp3 (${(mp3.length / 1024) | 0} kB)`);
  await renderHifi(srcB64, slug);
}

// ── The HI-FI pass: the same segment, clean. Stereo 44.1 kHz, no tape / hiss /
//    crush / warmth — just silence-skip, the 18 s cut, a loop-seam crossfade,
//    and a −1 dBFS normalize (common gain across channels, so the image holds).
async function renderHifi(srcB64, slug) {
  const { l, r } = await page.evaluate(
    async ({ srcB64, HIFI_SR, loopSeconds }) => {
      const bin = atob(srcB64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      const ctx = new OfflineAudioContext(2, 1, HIFI_SR);
      const decoded = await ctx.decodeAudioData(bytes.buffer);

      // Keep stereo (duplicate a mono master); mix a mono reference for the
      // silence-skip so both bounces open on the same bar as the lo-fi cut.
      const N = decoded.length;
      const left = decoded.getChannelData(0);
      const right = decoded.numberOfChannels > 1 ? decoded.getChannelData(1) : left;
      const mono = new Float32Array(N);
      for (let i = 0; i < N; i++) mono[i] = (left[i] + right[i]) / 2;

      // Same RMS gate as the lo-fi pass, window scaled to ~the same duration
      // (1024 samples at 11025 Hz ≈ 93 ms → 4096 at 44100 Hz).
      const win = 4096;
      let start = 0;
      for (let i = 0; i + win < N; i += win) {
        let sum = 0;
        for (let j = 0; j < win; j++) sum += mono[i + j] * mono[i + j];
        if (Math.sqrt(sum / win) > 0.015) {
          start = Math.max(0, i - win);
          break;
        }
      }

      let segLen = Math.floor(loopSeconds * HIFI_SR);
      if (start + segLen > N) segLen = N - start;

      // Equal-power crossfade the loop seam, per channel with the same gains.
      const xf = Math.min(Math.floor(0.4 * HIFI_SR), Math.floor(segLen / 4));
      const outLen = segLen - xf;
      const chans = [left, right].map((src) => {
        const seg = src.subarray(start, start + segLen);
        const out = new Float32Array(outLen);
        for (let i = 0; i < outLen; i++) out[i] = seg[i];
        for (let i = 0; i < xf; i++) {
          const t = i / xf;
          out[i] =
            seg[i] * Math.sin((t * Math.PI) / 2) + seg[outLen + i] * Math.cos((t * Math.PI) / 2);
        }
        return out;
      });

      // Normalize to ~-1 dBFS with ONE gain across both channels.
      let peak = 1e-6;
      for (const ch of chans)
        for (let i = 0; i < outLen; i++) peak = Math.max(peak, Math.abs(ch[i]));
      const gain = 0.9 / peak;

      const toB64 = (ch) => {
        const pcm = new Int16Array(outLen);
        for (let i = 0; i < outLen; i++) {
          const s = Math.max(-1, Math.min(1, ch[i] * gain));
          pcm[i] = Math.max(-32768, Math.min(32767, Math.round(s * 32767)));
        }
        const u8 = new Uint8Array(pcm.buffer);
        const CHUNK = 0x8000;
        let out = '';
        for (let i = 0; i < u8.length; i += CHUNK)
          out += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
        return btoa(out);
      };
      return { l: toB64(chans[0]), r: toB64(chans[1]) };
    },
    { srcB64, HIFI_SR, loopSeconds: LOOP_SECONDS },
  );
  const mp3 = encodeMp3Stereo(int16FromB64(l), int16FromB64(r), HIFI_SR);
  writeFileSync(`${HIFI_DIR}/${slug}.mp3`, mp3);
  console.log(`wrote ${HIFI_DIR}/${slug}.mp3 (${(mp3.length / 1024) | 0} kB)`);
}

await browser.close();
