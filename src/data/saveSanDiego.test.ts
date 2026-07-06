import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// public/1101.html is a HAND-EDITED Twine/Harlowe export — it isn't typechecked,
// so the exact bugs patched by hand (unbalanced hooks, unitless `(after:)`, dead
// links) could silently regress on a future edit. This guards the story's LOGIC by
// parsing the passages straight from the shipped file and asserting the invariants
// the fixes established. Pure + fast (no browser); the shoot:savesandiego smoke
// covers that the story actually boots in a real Harlowe runtime.
const html = readFileSync(new URL('../../public/1101.html', import.meta.url), 'utf8');

const dec = (s: string) =>
  s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');

type Passage = { name: string; body: string };
const passages: Passage[] = [
  ...html.matchAll(/<tw-passagedata pid="[^"]*" name="([^"]*)"[^>]*>([\s\S]*?)<\/tw-passagedata>/g),
].map((m) => ({ name: dec(m[1]), body: dec(m[2]) }));

const names = new Set(passages.map((p) => p.name));

describe('1101 (Save San Diego) — the hand-edited Twine story stays well-formed', () => {
  it('parses a healthy set of passages', () => {
    expect(passages.length).toBeGreaterThan(50);
  });

  it('every [[link]] points at a real passage (no dead ends)', () => {
    const broken: string[] = [];
    for (const p of passages) {
      for (const m of p.body.matchAll(/\[\[([^\]]+?)\]\]/g)) {
        const inside = m[1];
        const target = inside.includes('->')
          ? inside.split('->').pop()!
          : inside.includes('<-')
            ? inside.split('<-')[0]
            : inside;
        if (!names.has(target.trim())) broken.push(`[${p.name}] -> "${target.trim()}"`);
      }
    }
    expect(broken, `broken links: ${broken.join(', ')}`).toEqual([]);
  });

  it('every passage has balanced hook brackets (the unclosed-[ bug)', () => {
    const bad: string[] = [];
    for (const p of passages) {
      const open = (p.body.match(/\[/g) ?? []).length;
      const close = (p.body.match(/\]/g) ?? []).length;
      if (open !== close) bad.push(`[${p.name}] ${open}/${close}`);
    }
    expect(bad, `unbalanced hooks: ${bad.join(', ')}`).toEqual([]);
  });

  it('every (after:) carries a time unit (a bare number reads as ~ms)', () => {
    const bad: string[] = [];
    for (const p of passages) {
      for (const m of p.body.matchAll(/\(after:\s*([0-9.]+)\s*\)/g)) {
        bad.push(`[${p.name}] (after:${m[1]})`);
      }
    }
    expect(bad, `unitless (after:): ${bad.join(', ')}`).toEqual([]);
  });
});
