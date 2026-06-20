import type { ReactElement } from 'react';
import type { ToppingId } from '../data/links';

// Small, flat, original topping glyphs — the 1996 equivalent would have been
// little GIF bullets. Inline SVG so they cost zero extra network requests and
// render fine with the rest of the static document. Deliberately simple; the
// dead-plain storefront does not want polished iconography.
const ICONS: Record<ToppingId, ReactElement> = {
  pepperoni: (
    <>
      <circle cx="12" cy="12" r="10" fill="#c2342b" />
      <circle cx="8" cy="9" r="1.6" fill="#8f211b" />
      <circle cx="15.5" cy="8.5" r="1.4" fill="#8f211b" />
      <circle cx="13" cy="14.5" r="1.9" fill="#8f211b" />
      <circle cx="8.5" cy="15" r="1.3" fill="#8f211b" />
    </>
  ),
  mushroom: (
    <>
      <path d="M3 12a9 6 0 0 1 18 0z" fill="#cdb38a" />
      <rect x="9.5" y="11.5" width="5" height="8" rx="1.6" fill="#efe3cc" />
    </>
  ),
  pepper: <circle cx="12" cy="12" r="8.5" fill="none" stroke="#2f8f3e" strokeWidth="3.6" />,
  olive: (
    <>
      <circle cx="12" cy="12" r="9" fill="#3a3a3a" />
      <circle cx="12" cy="12" r="3.4" fill="#b23b2e" />
    </>
  ),
  basil: (
    <>
      <path d="M12 3C7 6 5 12 5 19c7 0 14-4 14-12 0-2-3-4-7-4z" fill="#2f8f3e" />
      <path d="M12 5c-3 3-4 8-4 13" fill="none" stroke="#1f6e2c" strokeWidth="1" />
    </>
  ),
  onion: (
    <>
      <path d="M3 13a9 5 0 0 1 18 0z" fill="none" stroke="#8e7bb0" strokeWidth="2" />
      <path d="M6.5 13a5.5 3 0 0 1 11 0z" fill="none" stroke="#b6a6d2" strokeWidth="1.5" />
    </>
  ),
  chili: (
    <>
      <path d="M5 7c4 0 9.5 3 12 11 1-6-3-13-12-13z" fill="#c2342b" />
      <path d="M5 7c-1-2 0-3 2-3" fill="none" stroke="#2f8f3e" strokeWidth="2" />
    </>
  ),
  anchovy: (
    <>
      <path d="M3 12c4-5 11-5 15 0-4 5-11 5-15 0z" fill="#8a8f98" />
      <path d="M18 12l3.5-2.2v4.4z" fill="#8a8f98" />
      <circle cx="7" cy="11" r="1" fill="#1c1c1c" />
    </>
  ),
};

export function ToppingIcon({ topping }: { topping?: ToppingId }) {
  if (!topping) return null;
  return (
    <svg
      className="topping"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[topping]}
    </svg>
  );
}
