import { describe, it, expect } from 'vitest';
import { wrapText } from './textwrap';

describe('wrapText', () => {
  it('wraps at word boundaries within the max', () => {
    const lines = wrapText('the quick brown fox jumps over the lazy dog', 15);
    expect(lines.every((l) => l.length <= 15)).toBe(true);
    expect(lines.join(' ')).toBe('the quick brown fox jumps over the lazy dog');
  });

  it('gives an overlong word its own line instead of splitting it', () => {
    expect(wrapText('a supercalifragilistic b', 10)).toEqual(['a', 'supercalifragilistic', 'b']);
  });

  it('respects existing hard breaks', () => {
    expect(wrapText('one\ntwo three', 20)).toEqual(['one', 'two three']);
  });

  it('handles empty input', () => {
    expect(wrapText('', 10)).toEqual(['']);
  });
});
