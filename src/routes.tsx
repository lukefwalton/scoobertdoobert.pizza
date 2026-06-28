import type { RouteRecord } from 'vite-react-ssg';
import Storefront from './pages/Storefront';
import TextOnly from './pages/TextOnly';
import LinkArchive from './pages/LinkArchive';
import About from './pages/About';
import AboutJp from './pages/AboutJp';
import Arcade from './pages/Arcade';
import Crusteroids from './pages/Crusteroids';
import SliceBreaker from './pages/SliceBreaker';
import JazzSnake from './pages/JazzSnake';
import PizzaRadar from './pages/PizzaRadar';
import BurritoBelt from './pages/BurritoBelt';
import DeliveryDash from './pages/DeliveryDash';
import Poke from './pages/Poke';
import Chimes from './pages/Chimes';
import Cultures from './pages/Cultures';
import Leaderboard from './pages/Leaderboard';

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
  // /about/jp -> the Japanese-language twin of /about (the one translated page),
  // reciprocally hreflang-linked with /about. Stresses the Japan credits.
  { path: '/about/jp', element: <AboutJp /> },
  // /arcade -> the touch-first Pizza Run minigame (the mobile reward). A real,
  // crawlable route; the live canvas game is a post-hydration enhancement.
  { path: '/arcade', element: <Arcade /> },
  // The Asteroids/Breakout/Snake reskins — more touch-first cabinets (the mobile
  // arcade shelf). Original code + art, no famous marks; each its own route via
  // the shared ArcadeCabinetPage shell.
  { path: '/crusteroids', element: <Crusteroids /> },
  { path: '/slice-breaker', element: <SliceBreaker /> },
  { path: '/jazz-snake', element: <JazzSnake /> },
  // /pizza-radar -> "Pizza Radar 1996," a green-phosphor Space-Invaders defense.
  { path: '/pizza-radar', element: <PizzaRadar /> },
  // /burrito-belt -> "Burrito Belt," the falling-blocks stacker.
  { path: '/burrito-belt', element: <BurritoBelt /> },
  // /delivery-dash -> "Delivery Dash," the cross-the-traffic pizza-courier game.
  { path: '/delivery-dash', element: <DeliveryDash /> },
  // /poke -> "Poke Scoobert," the face-stretch instrument (a second cabinet).
  { path: '/poke', element: <Poke /> },
  // /chimes -> "Pendulum Chimes," a tap-to-play bell instrument (a third cabinet,
  // synthesised — ported from the `fun` playground, re-homed as our own files).
  { path: '/chimes', element: <Chimes /> },
  // /cultures -> "Cultures," a stir-to-play living-colony drone (a fourth cabinet,
  // the DNA instrument from `fun`, re-homed and synthesised — nothing ships).
  { path: '/cultures', element: <Cultures /> },
  // /leaderboard -> the PIZZA POINTS arcade high-score board (3 initials, Vercel
  // Blob backend). Crawlable shell; the live board mounts post-hydration.
  { path: '/leaderboard', element: <Leaderboard /> },
];
