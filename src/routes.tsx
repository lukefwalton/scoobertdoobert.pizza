import type { RouteRecord } from 'vite-react-ssg';
import Storefront from './pages/Storefront';
import TextOnly from './pages/TextOnly';

// Two static documents, each prerendered to crawlable HTML by vite-react-ssg:
//   /      -> the dead-plain Electronic Pizza Storefront (the fallback layer)
//   /text  -> the genuinely flat text-only index
//
// Eager elements (not lazy) so both pages are baked into the prerender and the
// initial HTML. three.js is NOT imported here — it only arrives later via a
// dynamic import behind the Calzone Player install gag.
export const routes: RouteRecord[] = [
  { path: '/', element: <Storefront /> },
  { path: '/text', element: <TextOnly /> },
];
