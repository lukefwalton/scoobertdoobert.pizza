import type { RouteRecord } from 'vite-react-ssg';
import Storefront from './pages/Storefront';
import TextOnly from './pages/TextOnly';
import LinkArchive from './pages/LinkArchive';
import About from './pages/About';
import Arcade from './pages/Arcade';
import Poke from './pages/Poke';
import Chimes from './pages/Chimes';
import Cultures from './pages/Cultures';

// Static documents, each prerendered to crawlable HTML by vite-react-ssg:
//   /       -> the dead-plain Electronic Pizza Storefront (the fallback layer)
//   /text   -> the genuinely flat text-only index
//   /links  -> the exhaustive Link Archive (SEO surface + period "Links" page)
//
// Eager elements (not lazy) so the pages are baked into the prerender and the
// initial HTML. three.js is NOT imported here — it only arrives later via a
// dynamic import behind the Calzone Player install gag.
export const routes: RouteRecord[] = [
  { path: '/', element: <Storefront /> },
  { path: '/text', element: <TextOnly /> },
  { path: '/links', element: <LinkArchive /> },
  { path: '/about', element: <About /> },
  // /arcade -> the touch-first Pizza Run minigame (the mobile reward). A real,
  // crawlable route; the live canvas game is a post-hydration enhancement.
  { path: '/arcade', element: <Arcade /> },
  // /poke -> "Poke Scoobert," the face-stretch instrument (a second cabinet).
  { path: '/poke', element: <Poke /> },
  // /chimes -> "Pendulum Chimes," a tap-to-play bell instrument (a third cabinet,
  // synthesised — ported from the `fun` playground, re-homed as our own files).
  { path: '/chimes', element: <Chimes /> },
  // /cultures -> "Cultures," a stir-to-play living-colony drone (a fourth cabinet,
  // the DNA instrument from `fun`, re-homed and synthesised — nothing ships).
  { path: '/cultures', element: <Cultures /> },
];
