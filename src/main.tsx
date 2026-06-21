import './styles/global.css';
import './lib/chunkReload'; // recover from stale content-hashed chunks after a redeploy
import { ViteReactSSG } from 'vite-react-ssg';
import { routes } from './routes';

// vite-react-ssg renders these routes to static HTML at build time and hydrates
// them in the browser. With JS disabled the prerendered markup stands on its
// own — that is the whole point of the storefront fallback layer.
export const createRoot = ViteReactSSG({ routes });
