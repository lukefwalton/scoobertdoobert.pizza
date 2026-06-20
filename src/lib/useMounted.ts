import { useEffect, useState } from 'react';

/**
 * Returns false on the server / first client render, true after mount. Use it
 * to gate JavaScript-only enhancements so they never appear in the prerendered
 * (crawlable, no-JS) HTML and never cause a hydration mismatch.
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
