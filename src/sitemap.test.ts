import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// public/robots.txt + public/sitemap.xml are static files. This guards them against
// drift from routes.tsx the SAME way routes.test.ts does — by SOURCE-TEXT match
// (importing the route table would drag the browser-only page/component tree into
// the node test run). Every prerendered route must appear in the sitemap exactly
// once, and vice versa, so adding a route without listing it (or listing a dead
// one) fails HERE instead of leaving the sitemap quietly wrong.
const HOST = 'https://www.scoobertdoobert.pizza';

const routesSrc = readFileSync(new URL('./routes.tsx', import.meta.url), 'utf8');
const routePaths = [...routesSrc.matchAll(/path: '([^']+)'/g)].map((m) => m[1]);
const expectedLocs = routePaths.map((p) => (p === '/' ? `${HOST}/` : `${HOST}${p}`)).sort();

const sitemap = readFileSync(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const sitemapLocs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).sort();

describe('sitemap.xml stays in sync with routes.tsx', () => {
  it('lists every prerendered route exactly once, and nothing extra', () => {
    expect(sitemapLocs).toEqual(expectedLocs);
  });

  it('has no duplicate <loc> entries', () => {
    expect(new Set(sitemapLocs).size).toBe(sitemapLocs.length);
  });

  it('is structurally well-formed (xml decl, root urlset opens + closes, balanced <url>)', () => {
    expect(sitemap.trimStart().startsWith('<?xml')).toBe(true);
    expect(sitemap).toContain('<urlset');
    expect(sitemap.trimEnd().endsWith('</urlset>')).toBe(true);
    const open = (sitemap.match(/<url>/g) ?? []).length;
    const close = (sitemap.match(/<\/url>/g) ?? []).length;
    expect(open).toBe(close);
    expect(open).toBe(expectedLocs.length);
  });

  it('robots.txt points at the sitemap', () => {
    const robots = readFileSync(new URL('../public/robots.txt', import.meta.url), 'utf8');
    expect(robots).toContain(`Sitemap: ${HOST}/sitemap.xml`);
  });
});
