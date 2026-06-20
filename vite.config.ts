import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// MPA app type so `vite preview` serves the SSG output as real files
// (/text -> dist/text.html) instead of falling back to index.html like an SPA.
// This matters: the storefront and the text-only page are independent static
// documents, and the whole point of Phase 1 is that they work as plain HTML.
export default defineConfig({
  plugins: [react()],
  appType: 'mpa',
  build: {
    outDir: 'dist',
    // No three.js in the initial bundle — it only arrives via the dynamic
    // import behind the Calzone Player install gag (Phase 1, step 3+).
    target: 'es2020',
  },
});
