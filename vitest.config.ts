import { defineConfig } from 'vitest/config';

// Unit tests cover the PURE logic only — no DOM, no three, no audio — so the
// default node environment is enough (and fast). The browser-driven surface
// (scenes, nav, audio, the JS-off storefront) stays covered by the Playwright
// `shoot:*` smokes; these two layers are deliberately complementary.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
