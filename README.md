# scoobertdoobert.pizza

A fake late-90s "electronic pizza storefront" that comes alive, falls backward
through web eras, and drops you into a low-poly PS1/N64 world — a pizza shop off
the coast of San Diego that is secretly the archive of **Scoobert Doobert**, a
philosopher's solo music project.

> A pizza shop off the coast of San Diego.
> (It is actually a solo music project by a philosopher.)

See [`CLAUDE.md`](./CLAUDE.md) for the full spec, the architecture
non-negotiables, the PS1 hard constraints, and the phase tracker.

## Run

```bash
npm install
npm run dev        # vite dev server
npm run build      # static prerender via vite-react-ssg -> dist/
npm run preview    # serve the built dist/ on :4173
```

Deploy target: **Vercel** (static). `npm run build` emits `dist/`.

## Where things live

- **Add or change a destination link:** `src/data/links.ts` — single source of
  truth for the storefront menu, the text-only page, and (later) the 3D
  hotspots. Every `href` must be real; never `#`.
- **Add an in-world hotspot:** `src/data/hotspots.ts` (Phase 1, step 5) — points
  at a `links.ts` id, so links stay single-source.
- **Storefront copy / layout:** `src/pages/Storefront.tsx`.
- **The flat fallback:** `src/pages/TextOnly.tsx`.

## Architecture in one breath

The plain HTML storefront **is** the fallback layer: it works with JavaScript
disabled, is crawlable, and ships with zero three.js. Everything else — the boot
shell, the Calzone Player™ install gag, the 3D world — is progressive
enhancement that lazy-loads on top.

## Self-verification

```bash
npm run build && npm run preview &   # serve dist/
npx playwright install chromium      # once
npm run shoot                        # screenshots -> .shots/ (incl. JS-disabled)
```

## Assets & licensing

All original / CC0. No proprietary marks, logos, copy, or game assets. WebGL
technique ported from another project is re-homed as this repo's own standalone
files (see `CLAUDE.md`). The `legacy/` folder preserves the previous
hand-built site for reference; it is not part of the build.
