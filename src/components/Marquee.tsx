import type { ReactNode } from 'react';

// A period-authentic scrolling headline — the GeoCities <marquee>, rebuilt in CSS
// so it degrades honestly. It is real, selectable text with real <a> links inside
// (crawlable + works with JavaScript off; it's just static text without CSS). The
// motion is accommodated three ways so it never fights accessibility:
//   • prefers-reduced-motion → no scroll, the text sits static and wraps.
//   • hover / keyboard focus → the scroll pauses (WCAG 2.2.2, moving content).
//   • the loop is a slow, single-direction crawl — no flashing (WCAG 2.3.1).
// The run is duplicated for a seamless loop; the second copy is aria-hidden so a
// screen reader hears the headline once.
export function Marquee({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div className="marquee" aria-label={label}>
      <div className="marquee__track">
        <span className="marquee__run">{children}</span>
        <span className="marquee__run" aria-hidden="true">
          {children}
        </span>
      </div>
    </div>
  );
}
