import { SOCIAL_DESTINATIONS } from '../data/links';
import { ExternalLink } from './ExternalLink';

// Compact "find Scoobert everywhere" row — the secondary platform links the
// curated Sample Menu leaves out (Apple Music, SoundCloud, TikTok, Threads,
// Reddit, merch). All Scoobert Doobert profiles. Driven by links.ts like
// everything else.
export function SocialLinks() {
  return (
    <nav className="socials" aria-label="More places to find Scoobert Doobert">
      <span className="socials__label">Also on:</span>{' '}
      {SOCIAL_DESTINATIONS.map((d, i) => (
        <span key={d.id}>
          {i > 0 ? ' · ' : ''}
          <ExternalLink href={d.href}>{d.label}</ExternalLink>
        </span>
      ))}
    </nav>
  );
}
