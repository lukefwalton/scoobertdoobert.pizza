import { describe, it, expect } from 'vitest';
import { LMM_EPISODES, LMM_CONCEPT, LMM_HOME } from './lmm';
import { LORE, loreAt } from './lore';
import { lookupCommand, type CommandCtx } from './commands';
import type { Progress } from '../state/progressStore';

// The content commands (lmm/lore/discography) don't read progress, so a bare stub
// is fine; cast keeps the test from depending on the full Progress shape.
const ctx = (args: string[]): CommandCtx => ({
  args,
  history: [],
  progress: {} as Progress,
});

describe('Love Music More data', () => {
  it('has a concept blurb and a home link', () => {
    expect(LMM_CONCEPT.length).toBeGreaterThan(20);
    expect(LMM_HOME).toMatch(/^https:\/\//);
  });

  it('every episode has a title, blurb, and a youtube/spotify https url', () => {
    expect(LMM_EPISODES.length).toBeGreaterThan(5);
    for (const ep of LMM_EPISODES) {
      expect(ep.title.length, 'title').toBeGreaterThan(3);
      expect(ep.blurb.length, `${ep.title} blurb`).toBeGreaterThan(10);
      expect(ep.url, `${ep.title} url`).toMatch(
        /^https:\/\/(www\.youtube\.com|open\.spotify\.com)\//,
      );
    }
  });
});

describe('lore data', () => {
  it('has many non-empty, reasonably short facts', () => {
    expect(LORE.length).toBeGreaterThan(10);
    for (const line of LORE) {
      expect(line.trim().length).toBeGreaterThan(0);
      expect(line.length, `too long: ${line.slice(0, 40)}…`).toBeLessThanOrEqual(220);
    }
  });

  it('loreAt wraps for any index (incl. large/negative)', () => {
    expect(loreAt(0)).toBe(LORE[0]);
    expect(loreAt(LORE.length)).toBe(LORE[0]);
    expect(loreAt(-1)).toBe(LORE[LORE.length - 1]);
  });
});

describe('terminal content commands', () => {
  it('`lmm` lists episodes; `lmm 1` opens the first (external navigate)', () => {
    const list = lookupCommand('lmm')!.run(ctx([]));
    expect(list.output.join('\n')).toMatch(/EPISODES/);

    const open = lookupCommand('lmm')!.run(ctx(['1']));
    expect(open.action).toEqual({
      type: 'navigate',
      href: LMM_EPISODES[0].url,
      external: true,
    });
  });

  it('`lore` prints a fact and varies with history length', () => {
    const a = lookupCommand('lore')!.run({ args: [], history: [], progress: {} as Progress });
    const b = lookupCommand('lore')!.run({
      args: [],
      history: ['lore'],
      progress: {} as Progress,
    });
    expect(a.output.join('')).toContain(LORE[0]);
    expect(b.output.join('')).toContain(LORE[1]);
  });

  it('`discography` lists the records', () => {
    const out = lookupCommand('discography')!.run(ctx([])).output.join('\n');
    expect(out).toMatch(/THE RECORDS/);
    expect(out).toMatch(/MÖB/);
  });

  it('the content commands are discoverable in help', () => {
    for (const name of ['lmm', 'lore', 'discography', 'lyrics']) {
      expect(lookupCommand(name)?.help, `${name} should be listed in help`).toBeTruthy();
    }
  });
});
