import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// ───────────────────────────────────────────────────────────────────────────
// CONSTITUTION TRIPWIRES — machine guards for hard lines in CLAUDE.md that were
// previously discipline-only (found by the 2026-07-07 constitution audit).
// These are deliberately crude SOURCE-TEXT scans (like sitemap.test.ts): they
// don't prove safety, they make the cheap regression loud. If one fires on a
// legitimate change, fix the change or (rarely) amend the rule in CLAUDE.md —
// never quietly loosen the test.
// ───────────────────────────────────────────────────────────────────────────

const SRC = new URL('.', import.meta.url).pathname;

function read(rel: string): string {
  return readFileSync(join(SRC, rel), 'utf8');
}

// ── WCAG 2.3.1 — nothing may flash more than 3×/second ─────────────────────
// A "flash" is a LUMINANCE change (opacity/visibility/background/color
// keyframes), not a transform loop (a spinning die or a barber-pole scroll is
// movement, not a flash). For every `animation: … infinite` whose keyframes
// touch luminance, the period must be ≥ 0.34s (< ~3 flashes/sec). One-shot
// animations (forwards/backwards/both, no infinite) are transitions, exempt.
describe('WCAG 2.3.1 flash-rate tripwire (src/styles/*.css)', () => {
  const styleDir = join(SRC, 'styles');
  const cssFiles = readdirSync(styleDir).filter((f) => f.endsWith('.css'));

  const MIN_PERIOD_S = 0.34;

  function parseDurationSeconds(decl: string): number | null {
    // First time value in the shorthand is the duration (delay comes second).
    const m = decl.match(/(\d+(?:\.\d+)?)(ms|s)\b/);
    if (!m) return null;
    const v = Number(m[1]);
    return m[2] === 'ms' ? v / 1000 : v;
  }

  for (const file of cssFiles) {
    const css = read(join('styles', file));

    // Keyframes that change luminance (background-position is movement, skip it).
    const luminanceFrames = new Set<string>();
    for (const kf of css.matchAll(/@keyframes\s+([\w-]+)\s*\{([\s\S]*?)\n\}/g)) {
      const body = kf[2];
      if (/\bopacity\s*:|\bvisibility\s*:|\bbackground\s*:|\bbackground-color\s*:|[^-]\bcolor\s*:/.test(body)) {
        luminanceFrames.add(kf[1]);
      }
    }

    const infiniteDecls = [...css.matchAll(/animation:\s*([^;]+);/g)]
      .map((m) => m[1])
      .filter((d) => /\binfinite\b/.test(d));

    it(`${file}: no luminance keyframes loop faster than 3 flashes/sec`, () => {
      for (const decl of infiniteDecls) {
        const name = [...luminanceFrames].find((n) => decl.includes(n));
        if (!name) continue; // transform/position loop — movement, not a flash
        const dur = parseDurationSeconds(decl);
        expect(dur, `could not parse duration in "animation: ${decl}"`).not.toBeNull();
        expect(
          dur!,
          `"${name}" loops every ${dur}s (> 3 flashes/sec) — WCAG 2.3.1`,
        ).toBeGreaterThanOrEqual(MIN_PERIOD_S);
      }
    });

    it(`${file}: animated files carry a prefers-reduced-motion block`, () => {
      const hasRealAnimation = [...css.matchAll(/animation:\s*([^;]+);/g)].some(
        (m) => !/^\s*none\b/.test(m[1]),
      );
      if (!hasRealAnimation) return;
      expect(
        css.includes('prefers-reduced-motion'),
        `${file} declares animations but has no prefers-reduced-motion block`,
      ).toBe(true);
    });
  }
});

// ── PS1 texture ceiling — 512px is the amended hard cap ────────────────────
// CLAUDE.md (amended 2026-07-07, Luke): ≤128px stays the default grain; text
// atlases / FX canvases may go to 512; NOTHING goes past 512. Scans the world
// code for canvas/texture dimension literals.
describe('PS1 texture-size tripwire (src/world/**)', () => {
  const worldDir = join(SRC, 'world');
  const files = readdirSync(worldDir, { recursive: true })
    .map(String)
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.endsWith('.test.ts'));

  const CEILING = 512;

  it('no canvas/texture dimension literal exceeds 512px', () => {
    for (const file of files) {
      const src = read(join('world', file));
      const hits = [
        // canvas assignments: c.width = 512 / c.width = c.height = 256
        ...src.matchAll(/\.(?:width|height)\s*=\s*(?:[\w.]+\s*=\s*)?(\d{2,})/g),
        // texture-factory options: { w: 512, h: 128 }
        ...src.matchAll(/\b[wh]:\s*(\d{2,})/g),
      ];
      for (const m of hits) {
        expect(
          Number(m[1]),
          `${file}: texture/canvas dimension ${m[1]}px exceeds the ${CEILING}px ceiling (CLAUDE.md PS1 constraints)`,
        ).toBeLessThanOrEqual(CEILING);
      }
    }
  });
});
