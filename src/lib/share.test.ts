import { describe, it, expect, vi, afterEach } from 'vitest';
import { shareResult } from './share';
import { useToastStore } from '../state/toastStore';

describe('shareResult', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    useToastStore.setState({ toast: null });
  });

  it('opens the native share sheet when available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { share });
    const out = await shareResult('scored 999', 'https://x.test/');
    expect(out).toBe('shared');
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ text: 'scored 999', url: 'https://x.test/' }),
    );
  });

  it('treats a cancelled share sheet as done — never a surprise clipboard write', async () => {
    const share = vi.fn().mockRejectedValue(new DOMException('canceled', 'AbortError'));
    const writeText = vi.fn();
    vi.stubGlobal('navigator', { share, clipboard: { writeText } });
    const out = await shareResult('x');
    expect(out).toBe('shared');
    expect(writeText).not.toHaveBeenCalled();
  });

  it('copies to the clipboard + toasts when share is unavailable', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const out = await shareResult('scored 999', 'https://x.test/');
    expect(out).toBe('copied');
    expect(writeText).toHaveBeenCalledWith('scored 999 https://x.test/');
    expect(useToastStore.getState().toast?.msg).toMatch(/copied/i);
  });

  it('falls to unavailable + toasts when neither API exists', async () => {
    vi.stubGlobal('navigator', {});
    const out = await shareResult('x', 'https://x.test/');
    expect(out).toBe('unavailable');
    expect(useToastStore.getState().toast?.msg).toMatch(/url/i);
  });
});
