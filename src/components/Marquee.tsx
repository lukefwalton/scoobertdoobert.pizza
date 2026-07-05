import type { ReactNode } from 'react';

// A period-authentic scrolling headline — the GeoCities <marquee>, rebuilt in CSS
// so it degrades honestly. It is real, selectable text with real <a> links inside
// (crawlable + works with JavaScript off; it's just static text without CSS). The
// motion is accommodated three ways so it never fights accessibility:
//   • prefers-reduced-motion → no scroll, the text sits static and wraps.
//   • hover / keyboard focus → the scroll pauses (WCAG 2.2.2, moving content).
//   • the loop is a slow, single-direction crawl — no flashing (WCAG 2.3.1).
// The run is duplicated for a seamless loop; the second copy is BOTH aria-hidden
// (out of the a11y tree) AND `inert` (out of the tab order) — otherwise a link in
// `children` becomes a second, focusable-but-hidden tab stop. The marquee is pure
// CSS, so that duplicate persists in the JS-off HTML too; `inert` is a plain
// attribute that serializes there. (React 18's types don't know `inert` yet, hence
// the cast; the empty-string form is a present boolean attribute in every engine
// that supports it, and older engines just fall back to the aria-hidden hint.)
const INERT = { inert: '' } as Record<string, string>;

export function Marquee({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="marquee" aria-label={label}>
      <div className="marquee__track">
        <span className="marquee__run">{children}</span>
        <span className="marquee__run" aria-hidden="true" {...INERT}>
          {children}
        </span>
      </div>
    </div>
  );
}
