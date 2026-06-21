// Shared MP3 encoder for the audio render scripts (make-boot-audio / make-jukebox-
// audio). There's no ffmpeg in this env, so we use @breezystack/lamejs (a pure-JS
// LAME port — the ESM-safe fork; the classic `lamejs` throws "MPEGMode is not
// defined" under ESM). Input is mono Int16 PCM at `sampleRate`; output is an MP3
// Buffer. Low bitrate on purpose — the source is already an 8-bit / 11 kHz crunch,
// so a small MP3 keeps the lo-fi character and ships tiny ("optimized", no WAV).
import lame from '@breezystack/lamejs';

const Lame = lame.default || lame;

/** Encode mono Int16 PCM → MP3 Buffer. `kbps` defaults low to match the crunch. */
export function encodeMp3(int16, sampleRate, kbps = 32) {
  const enc = new Lame.Mp3Encoder(1, sampleRate, kbps);
  const BLOCK = 1152; // one MPEG frame of samples
  const chunks = [];
  for (let i = 0; i < int16.length; i += BLOCK) {
    const buf = enc.encodeBuffer(int16.subarray(i, i + BLOCK));
    if (buf.length > 0) chunks.push(Buffer.from(buf));
  }
  const end = enc.flush();
  if (end.length > 0) chunks.push(Buffer.from(end));
  return Buffer.concat(chunks);
}

/** Decode base64 little-endian Int16 bytes (from the in-browser bridge) → Int16Array. */
export function int16FromB64(b64) {
  const buf = Buffer.from(b64, 'base64');
  const pcm = new Int16Array(buf.length >> 1);
  for (let i = 0; i < pcm.length; i++) pcm[i] = buf.readInt16LE(i * 2);
  return pcm;
}
