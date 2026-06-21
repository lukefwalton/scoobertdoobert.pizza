import { useCallback, useEffect, useRef, useState } from 'react';
import { useMounted } from '../lib/useMounted';
import { lookupCommand } from '../data/commands';
import { DREAD } from '../data/dread';
import { useDreadStore } from '../state/dreadStore';
import { getProgressSnapshot, useProgressStore } from '../state/progressStore';

// ───────────────────────────────────────────────────────────────────────────
// Terminal — Phase 4. A hidden dead-web SGI/X-Files command line. Press the
// backtick ( ` ) key anywhere to summon it; Esc or `exit` closes it. Commands
// are data-driven (src/data/commands.ts); this component owns I/O, history, and
// the side effects. FORBIDDEN commands nudge `unease` up — the Phase-4→5 bridge.
//
// Client-only (gated on useMounted), a pure JS overlay: it never touches the
// prerendered / crawlable / JS-off storefront. Mounted on the storefront shell
// so it's reachable from every floor and the world.
// ───────────────────────────────────────────────────────────────────────────

const PROMPT = 'C:\\SCOOBERT> ';

type Line = { text: string; kind: 'cmd' | 'out' | 'sys' };

const BANNER: Line[] = [
  { text: 'SILICON SLICE™ — Pizza Graphics Workstation', kind: 'sys' },
  { text: 'IRIX-ish 5.3  ·  (c) 1997 Scoobert Doobert, Inc.', kind: 'sys' },
  { text: 'type `help`.  press ` (backtick) or Esc to close.', kind: 'sys' },
  { text: ' ', kind: 'sys' },
];

export function Terminal() {
  const mounted = useMounted();
  const [open, setOpen] = useState(false);
  const [lines, setLines] = useState<Line[]>(BANNER);
  const [history, setHistory] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const histIdx = useRef(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Summon / dismiss with backtick — unless you're typing in another field (so
  // a backtick in the order form doesn't pop the terminal). Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const typingElsewhere =
        !!el && el !== inputRef.current && /^(input|textarea|select)$/i.test(el.tagName);
      if ((e.key === '`' || e.key === '~') && !typingElsewhere) {
        e.preventDefault();
        setOpen((o) => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    // Summoning the hidden terminal IS a discovery — record it durably so the
    // site "remembers" you poked the machine (idempotent; feeds the rat's wink).
    useProgressStore.getState().findSecret('terminal');
  }, [open]);
  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lines, open]);

  const submit = useCallback(
    (raw: string) => {
      const cmdLine = raw.trim();
      setLines((ls) => [...ls, { text: PROMPT + raw, kind: 'cmd' }]);
      histIdx.current = -1;
      if (!cmdLine) return;
      setHistory((h) => [...h, cmdLine]);

      const [name, ...args] = cmdLine.split(/\s+/);
      const cmd = lookupCommand(name);
      if (!cmd) {
        setLines((ls) => [
          ...ls,
          { text: `'${name}' is not recognized. try \`help\`.`, kind: 'out' },
        ]);
        return;
      }
      const res = cmd.run({ args, history, progress: getProgressSnapshot() });
      // Forbidden commands poke the machine: a one-shot unease bump.
      if (cmd.forbidden) {
        const d = DREAD.triggers['terminal-forbidden-cmd'] ?? 0;
        const s = useDreadStore.getState();
        s.setUnease(Math.min(1, s.unease + d));
      }
      if (res.action?.type === 'clear') {
        setLines([]);
        return;
      }
      setLines((ls) => [
        ...ls,
        ...res.output.map((text) => ({ text: text || ' ', kind: 'out' as const })),
      ]);
      if (res.action?.type === 'close') window.setTimeout(() => setOpen(false), 250);
      if (res.action?.type === 'navigate') {
        const href = res.action.href;
        window.setTimeout(() => window.location.assign(href), 300);
      }
    },
    [history],
  );

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit(draft);
      setDraft('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!history.length) return;
      histIdx.current = histIdx.current < 0 ? history.length - 1 : Math.max(0, histIdx.current - 1);
      setDraft(history[histIdx.current] ?? '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx.current < 0) return;
      histIdx.current = histIdx.current + 1;
      if (histIdx.current >= history.length) {
        histIdx.current = -1;
        setDraft('');
      } else {
        setDraft(history[histIdx.current] ?? '');
      }
    }
  };

  if (!mounted || !open) return null;

  return (
    <div
      role="dialog"
      aria-label="Terminal"
      onClick={() => inputRef.current?.focus()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        background: 'rgba(0, 8, 0, 0.92)',
        color: '#33ff88',
        font: '14px/1.5 "Courier New", monospace',
        textShadow: '0 0 4px rgba(51,255,136,0.55)',
        padding: '18px 18px 12px',
        display: 'flex',
        flexDirection: 'column',
        cursor: 'text',
      }}
    >
      <div
        ref={bodyRef}
        style={{ flex: 1, overflowY: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
      >
        {lines.map((l, i) => (
          <div key={i} style={{ opacity: l.kind === 'sys' ? 0.7 : l.kind === 'cmd' ? 1 : 0.92 }}>
            {l.text}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', marginTop: 6 }}>
        <span aria-hidden="true">{PROMPT}</span>
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onInputKey}
          spellCheck={false}
          autoComplete="off"
          aria-label="terminal input"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'inherit',
            font: 'inherit',
            textShadow: 'inherit',
            caretColor: '#33ff88',
          }}
        />
      </div>
    </div>
  );
}
