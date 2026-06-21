// ───────────────────────────────────────────────────────────────────────────
// Stale-chunk recovery.
//
// Vite emits content-hashed chunk filenames (e.g. MiniWorldPreview-CD_OXLrX.js).
// After a redeploy the old hashes are gone, so a still-open tab — or a browser /
// CDN holding a cached index.html — references chunk names the server no longer
// has. The next lazy import (the 3D world, the machine-room mini-preview, the
// boids) then 404s with "Failed to fetch dynamically imported module" and trips
// the route error boundary.
//
// Vite fires a `vite:preloadError` window event for exactly this case (it wraps
// every dynamic import + its preloads). We recover by reloading ONCE to pull the
// fresh HTML and the current chunk names. A sessionStorage guard means that if a
// chunk is genuinely missing (a real broken deploy, not a stale one) we don't
// loop — the second failure surfaces normally to the boundary. The guard lives
// in sessionStorage, so it resets when the tab closes and a future redeploy can
// self-heal again.
// ───────────────────────────────────────────────────────────────────────────

const GUARD = 'sdp:chunk-reloaded';

if (typeof window !== 'undefined') {
  window.addEventListener('vite:preloadError', (event) => {
    // Already reloaded once this tab session and still failing → stop looping
    // and let the error reach the boundary.
    if (sessionStorage.getItem(GUARD)) return;
    event.preventDefault(); // we're handling recovery; don't also rethrow
    sessionStorage.setItem(GUARD, '1');
    window.location.reload(); // fresh HTML → the chunk names that actually exist
  });
}

export {};
