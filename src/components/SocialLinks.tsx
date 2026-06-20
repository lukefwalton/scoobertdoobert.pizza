import { SOCIAL_DESTINATIONS } from '../data/links';

// Compact "find Scoobert everywhere" row — the secondary platform links the
// curated Sample Menu leaves out (Apple Music, SoundCloud, TikTok, Threads,
// Reddit, merch, podcast feed). Restored from the live site so the rebuild
// drops no real backlink or merch link. Driven by links.ts like everything else.
export function SocialLinks() {
  return (
    <nav className="socials" aria-label="More places to find Scoobert Doobert">
      <span className="socials__label">Also on:</span>{' '}
      {SOCIAL_DESTINATIONS.map((d, i) => (
        <span key={d.id}>
          {i > 0 ? ' · ' : ''}
          <a href={d.href} target="_blank" rel="noopener noreferrer">
            {d.label}
          </a>
        </span>
      ))}
    </nav>
  );
}
