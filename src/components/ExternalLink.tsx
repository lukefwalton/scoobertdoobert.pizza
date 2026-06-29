import type { ReactNode } from 'react';

// A link to somewhere off-site: always opens in a new tab with the
// noopener/noreferrer safety rel. One home for the external-anchor pattern that
// was hand-rolled across the About pages, the link archive, and the socials row
// (so the security rel can't be forgotten on a new one).
export function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  );
}
