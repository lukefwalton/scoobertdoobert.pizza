import { Head } from 'vite-react-ssg';
import '../styles/storefront.css';
import { AudioBootstrap } from '../components/AudioBootstrap';
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
        <link rel="canonical" href="https://scoobertdoobert.pizza/" />
        <meta
          name="description"
          content="A pizza shop off the coast of San Diego. (It is actually a solo music project by a philosopher.)"
        />
        <meta property="og:url" content="https://scoobertdoobert.pizza/" />
        <meta property="og:title" content="Electronic Pizza Storefront — Scoobert Doobert" />
        <meta
          property="og:description"
          content="A pizza shop off the coast of San Diego. (It is actually a solo music project by a philosopher.)"
        />
      </Head>
      <AudioBootstrap />
      <WorldMount />
      <Descent />
      <a className="skip-link" href="#menu">
        Skip to the menu
      </a>

      <FloorView />
    </>
  );
}
