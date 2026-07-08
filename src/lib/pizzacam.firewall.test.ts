import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// The Webcam policy's hard line, as a failing test: the Pizza Cam (the one
// consensual real-camera surface) and the dread system (the always-FAKED
// "machine sees you" theater) must never touch. Not visually, not in code —
// no pizzacam module may import a dread module and no dread module may import
// a pizzacam one, so the two can't merge by accident in some future refactor.
// Source-text (not import-graph tooling) on purpose: same zero-dependency
// pattern as routes.test.ts, and comments mentioning "dread" are fine — only
// import lines count.

const SRC = new URL('..', import.meta.url).pathname;

const PIZZACAM_FILE = /pizzacam|PizzaCam|useCameraGrid|cameraConsent|(^|\/)Booth\.tsx$/i;
const DREAD_FILE = /dread/i;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const files = walk(SRC);
const importLines = (src: string) =>
  src.split('\n').filter((l) => /^\s*(import|export)\b.*\bfrom\s+['"]/.test(l));

describe('the dread firewall — pizzacam and dread never import each other', () => {
  const pizzacamFiles = files.filter((f) => PIZZACAM_FILE.test(f));
  const dreadFiles = files.filter((f) => DREAD_FILE.test(f));

  it('both sides of the firewall exist (this guard is guarding something)', () => {
    expect(pizzacamFiles.length).toBeGreaterThan(0);
    expect(dreadFiles.length).toBeGreaterThan(0);
  });

  for (const f of pizzacamFiles) {
    it(`${f.slice(SRC.length)} imports nothing dread`, () => {
      for (const line of importLines(readFileSync(f, 'utf8'))) {
        expect(line).not.toMatch(/dread/i);
      }
    });
  }

  for (const f of dreadFiles) {
    it(`${f.slice(SRC.length)} imports nothing pizzacam`, () => {
      for (const line of importLines(readFileSync(f, 'utf8'))) {
        expect(line).not.toMatch(/pizzacam|PizzaCam|useCameraGrid|cameraConsent|\/Booth/i);
      }
    });
  }
});
