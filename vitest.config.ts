import { defineConfig } from 'vitest/config';

// Unit tests cover the PURE logic only — no DOM, no three, no audio — so the
// default node environment is enough (and fast). The browser-driven surface
// (scenes, nav, audio, the JS-off storefront) stays covered by the Playwright
// `shoot:*` smokes; these two layers are deliberately complementary.
//
// `scripts/**/*.test.mjs` covers pure BUILD tooling (e.g. the hand-rolled GIF89a
// encoder) — equally store-free logic that deserves CI coverage, just authored in
// .mjs since the generators run under plain `node`, not the TS app.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
  },
});
