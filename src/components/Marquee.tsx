import type { ReactNode } from 'react';

// A period-authentic scrolling headline — the classic GeoCities <marquee>: the
// bar starts EMPTY, the headline scrolls in from the right edge, crosses, exits
// left, then repeats. Rebuilt in CSS so it degrades honestly:
//   • prefers-reduced-motion → no scroll; the text sits static and wraps.
//   • hover / keyboard focus → the scroll pauses (WCAG 2.2.2, moving content).
//   • slow, single-direction crawl — no flashing (WCAG 2.3.1).
// It's real, selectable text with real <a> links inside (crawlable + works with
// JavaScript off; without CSS it's just a line of text). A single run — so a
// link is a single tab stop — and if a browser ever stalls the animation, the
// run rests off-screen right, i.e. an empty bar rather than clipped text.
export function Marquee({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="marquee" aria-label={label}>
      <span className="marquee__run">{children}</span>
    </div>
  );
}
