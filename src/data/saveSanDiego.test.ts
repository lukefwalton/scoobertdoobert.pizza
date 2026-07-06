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

// The ARG's completion (the BONUS 'saved-san-diego' objective) is banked when the win
// terminus renders a DEDICATED marker element — never by sniffing free-form text. That
// distinction is the whole point: the intro passage echoes the prompted $name back into
// the story, so a text-match on the win phrase would let a player forge the objective by
// typing it as their name. Harlowe escapes variable text to inert characters, so it can
// never conjure a real element — keying off the marker closes the hole. These guards pin
// that contract in the shipped file (the shoot:savesandiego smoke proves the live wiring).
describe('1101 win signal is a dedicated marker, not forgeable text', () => {
  const userScript = html.match(/id="twine-user-script"[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? '';
  const WIN_PHRASE = /SAN DIEGO IS SAVED/i;
  const MARKER = 'data-sdp-ending="win"';

  it('the user-script detects the marker element, never the win text', () => {
    expect(userScript).toContain('data-sdp-ending');
    // If it ever sniffed the rendered phrase, echoed player input could forge the win.
    expect(userScript).not.toMatch(WIN_PHRASE);
    expect(userScript).not.toMatch(/\bSAVED\b/i);
  });

  it('every win terminus emits the marker', () => {
    const winPassages = passages.filter((p) => WIN_PHRASE.test(p.body));
    expect(winPassages.length).toBeGreaterThanOrEqual(1);
    for (const p of winPassages) {
      expect(p.body, `win passage [${p.name}] must carry the marker`).toContain(MARKER);
    }
  });

  it('the marker appears ONLY on win termini (nothing else can emit it)', () => {
    const marked = passages.filter((p) => p.body.includes('data-sdp-ending')).map((p) => p.name);
    const wins = passages.filter((p) => WIN_PHRASE.test(p.body)).map((p) => p.name);
    expect(marked.sort()).toEqual(wins.sort());
  });
});
