import { describe, it, expect, beforeEach } from 'vitest';
import { modalStack } from './useModalFocus';

// useModalFocus itself is DOM-bound (the real Tab/focus/restore flow is covered by the
// shoot:hud pause+lyrics smoke), but the STACK OWNERSHIP discipline is pure and worth a
// fast, deterministic guard: only the last-opened dialog owns the keyboard, and closing
// it hands ownership back DOWN to the layer beneath — the fix for the stacked-dialog
// focus bug. Ownership is identity-based, so plain sentinels stand in for elements.
const el = (id: string) => ({ id }) as unknown as HTMLElement;

describe('modalStack — topmost-only ownership', () => {
  beforeEach(() => {
    modalStack.roots.length = 0;
  });

  it('starts with nothing owning the keyboard', () => {
    expect(modalStack.isTop(el('x'))).toBe(false);
  });

  it('the last-opened root is the only one that is topmost', () => {
    const pause = el('pause');
    const lyrics = el('lyrics');
    modalStack.push(pause);
    expect(modalStack.isTop(pause)).toBe(true);
    // Lyrics opens ON TOP of the pause menu — pause must stand down (else both
    // trap Tab and fight over focus, the bug this stack fixes).
    modalStack.push(lyrics);
    expect(modalStack.isTop(pause)).toBe(false);
    expect(modalStack.isTop(lyrics)).toBe(true);
  });

  it('closing the top hands ownership back DOWN to the layer beneath', () => {
    const pause = el('pause');
    const lyrics = el('lyrics');
    modalStack.push(pause);
    modalStack.push(lyrics);
    modalStack.remove(lyrics);
    expect(modalStack.isTop(pause)).toBe(true);
  });

  it('remove targets a specific root and is a no-op when absent', () => {
    const a = el('a');
    expect(() => modalStack.remove(a)).not.toThrow();
    expect(modalStack.isTop(a)).toBe(false);
  });

  it('a root re-pushed on top gives up ownership only for its top occurrence', () => {
    const a = el('a');
    const b = el('b');
    modalStack.push(a);
    modalStack.push(b);
    modalStack.push(a); // `a` re-opened over `b`
    expect(modalStack.isTop(a)).toBe(true);
    modalStack.remove(a); // removes the most-recent occurrence, exposing `b`
    expect(modalStack.isTop(b)).toBe(true);
  });
});
