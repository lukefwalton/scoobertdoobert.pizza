import { Head } from 'vite-react-ssg';
import '../styles/storefront.css';
import { discographyGraph } from '../data/discography';
import { destById } from '../data/links';
import { PERSON_ID } from '../data/identity';
import { AudioBootstrap } from '../components/AudioBootstrap';
import { ProgressTracker } from '../components/ProgressTracker';
import { DreadConductor } from '../components/DreadConductor';
import { Terminal } from '../components/Terminal';
import { Descent } from '../components/Descent';
import { WorldMount } from '../components/WorldMount';
import { FloorView } from '../floors/FloorView';

// ───────────────────────────────────────────────────────────────────────────
// The "/" route — now a thin host for the descent. It renders the always-on
// machinery (audio, the lazy world mount, the install/transition) plus the
// current floor via <FloorView>, which is driven by FLOORS[currentFloor].
//
// Floor 0 is the dead-plain storefront (template `plain`); it is no longer
// special-cased — it's just the top of the descent. The page prerenders with
// currentFloor = 0, so crawlers and no-JS / reduced-motion visitors always get
// the storefront. The <head> here describes floor 0 (the indexed page).
// ───────────────────────────────────────────────────────────────────────────
export default function Storefront() {
  return (
    <>
      <Head>
        <title>Electronic Pizza Storefront — Scoobert Doobert</title>
        <link rel="canonical" href="https://www.scoobertdoobert.pizza/" />
        <meta
          name="description"
          content="A pizza shop off the coast of San Diego — secretly the solo music project of Scoobert Doobert: artist, and mixing engineer & producer for hire. There is a whole world underneath."
        />
        <meta property="og:url" content="https://www.scoobertdoobert.pizza/" />
        <meta property="og:title" content="Electronic Pizza Storefront — Scoobert Doobert" />
        <meta
          property="og:description"
          content="A pizza shop off the coast of San Diego — secretly the solo music project of Scoobert Doobert: artist, and mixing engineer & producer for hire. There is a whole world underneath."
        />
        {/* Discography: every album in the storefront grid as a MusicAlbum tied
            to the canonical #scoobert artist. Source of truth: albums.json. */}
        <script type="application/ld+json">{JSON.stringify(discographyGraph())}</script>
        {/* The Reel (ADDENDUM #8): the hire-reel playlist as a MusicPlaylist tied
            to the shared #person creator. Deliberately NOT in CANONICAL_SAMEAS —
            a playlist is a work, not a person-representing URL. */}
        <script type="application/ld+json">
          {JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'MusicPlaylist',
            '@id': 'https://www.scoobertdoobert.pizza/#reel',
            name: 'The Reel — productions, collabs & mixes by Scoobert Doobert',
            description:
              'The hire reel of Scoobert Doobert (Luke F. Walton), mixing engineer & producer for hire: productions & collabs throughout; the mixes are at the bottom. He mixes, produces, and plays on all of his own records.',
            url:
              destById('reel')?.href ?? 'https://open.spotify.com/playlist/7pmgoZlkf6exw4BAJTQs7Q',
            creator: { '@id': PERSON_ID },
            about: { '@id': 'https://lukefwalton.com/#scoobert' },
          })}
        </script>
      </Head>
      <AudioBootstrap />
      <ProgressTracker />
      <DreadConductor />
      <Terminal />
      <WorldMount />
      <Descent />
      <a className="skip-link" href="#menu">
        Skip to the menu
      </a>

      <FloorView />
    </>
  );
}
