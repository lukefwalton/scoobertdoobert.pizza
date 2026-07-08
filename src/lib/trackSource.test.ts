import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// playbackUrlFor is THE restored-aware url chooser: every runtime "play this
// catalog slug" site must resolve through it (or cuePlaybackUrl), or a restored
// track would silently play lo-fi from that one path. This guard scans the
// source tree (the routes.test source-text pattern — node can't import the
// browser component tree) and fails if a file outside the sanctioned allowlist
// touches the raw url builders or hand-writes a jukebox path.

const SRC = join(__dirname, '..');

// The files allowed to build a track url directly:
//  - data/jukebox.ts       — defines the builders
//  - data/music.ts         — cueUrl + loop-INDEX math (index, not playback)
//  - lib/trackSource.ts    — the chooser itself
//  - lib/restoration.ts    — the bench needs the explicit lo-fi/hi-fi PAIR
//  - audio/engine.ts       — url plumbing under the choosers, never chooses
const ALLOW = new Set([
  'data/jukebox.ts',
  'data/music.ts',
  'lib/trackSource.ts',
  'lib/restoration.ts',
  'audio/engine.ts',
]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

describe('trackSource is the one restored-aware chooser (call-site guard)', () => {
  const files = walk(SRC).map((p) => ({
    rel: p
      .slice(SRC.length + 1)
      .split('\\')
      .join('/'),
    text: readFileSync(p, 'utf8'),
  }));

  it('no runtime file outside the allowlist uses the raw url builders', () => {
    const offenders = files
      .filter((f) => !ALLOW.has(f.rel))
      .filter((f) => /\b(jukeboxTrackUrl|hifiTrackUrl)\s*\(/.test(f.text))
      .map((f) => f.rel);
    expect(
      offenders,
      `these files must resolve urls through playbackUrlFor/cuePlaybackUrl: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('no runtime file outside the allowlist hand-writes a jukebox audio path', () => {
    const offenders = files
      .filter((f) => !ALLOW.has(f.rel))
      .filter((f) => f.text.includes("'/audio/jukebox/") || f.text.includes('`/audio/jukebox/'))
      .map((f) => f.rel);
    expect(
      offenders,
      `these files hard-code a jukebox path instead of using the choosers: ${offenders.join(', ')}`,
    ).toEqual([]);
  });

  it('the sanctioned playback surfaces import the chooser', () => {
    // The canary set — the sites the feature converted. If one regresses to a
    // raw builder, the first test catches it; if one stops importing trackSource
    // entirely (a rewrite that "simplifies" it away), this one does.
    for (const rel of [
      'state/musicStore.ts',
      'lib/pickups.ts',
      'lib/dive.ts',
      'world/World.tsx',
      'world/JukeboxRoom.tsx',
      'world/ListeningRoom.tsx',
    ]) {
      const f = files.find((x) => x.rel === rel);
      expect(f, `${rel} missing from the scan`).toBeTruthy();
      expect(
        /from '(\.\.\/)*lib\/trackSource'|from '\.\/trackSource'/.test(f!.text),
        `${rel} no longer imports lib/trackSource`,
      ).toBe(true);
    }
  });
});
