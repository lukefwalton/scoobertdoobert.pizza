// ───────────────────────────────────────────────────────────────────────────
// src/lib/textwrap.ts — greedy word-wrap for canvas text textures (pure).
//
// makeTextTexture (world/ps1.ts) only splits on explicit '\n' and shrinks the
// font until the WIDEST line fits — so a 200-char museum-placard meaning would
// render as one unreadable micro-line. Wrap first, texture second.
// ───────────────────────────────────────────────────────────────────────────

/** Greedy-wrap `text` to lines of at most `max` chars (word boundaries; a single
 *  overlong word gets its own line rather than being split mid-word). Existing
 *  newlines are respected as hard breaks. */
export function wrapText(text: string, max = 30): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    const words = para.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      out.push('');
      continue;
    }
    let line = '';
    for (const w of words) {
      if (!line) line = w;
      else if (line.length + 1 + w.length <= max) line += ` ${w}`;
      else {
        out.push(line);
        line = w;
      }
    }
    out.push(line);
  }
  return out;
}
