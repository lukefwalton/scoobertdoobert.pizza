# Contributing

scoobertdoobert.pizza is a personal art-and-music project — the goblin-mode home
of **Scoobert Doobert** (a solo music project by Luke F. Walton). It is **not
open source**: the source code and the creative content (music, lyrics, words,
art) are both © Luke F. Walton, all rights reserved — see [LICENSE](LICENSE).
You're very welcome to read the code and see how the site works; the content
isn't yours to reuse.

By participating in the issue tracker you agree to abide by the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Found a bug? A broken link? A floor that won't render?

That's the most useful thing you can file. Open a
[bug report](https://github.com/lukefwalton/scoobertdoobert.pizza/issues/new/choose) —
what you did, what happened, and your browser/device. Screenshots help.

## Pull requests

This is a solo project and it isn't taking feature PRs. If you've found a clear
bug with an obvious fix, open an issue first so we can talk about it. Please
don't open PRs that add or reuse creative content, or that pull in copyrighted
marks/assets — the whole project is **original parody by rule**.

## Running it locally

```bash
npm ci
npm run dev        # storefront + the descent + the 3D world
npm run build      # production build (+ postbuild asset/notice guards)
npm test           # Vitest unit suite
npm run shoot:all  # Playwright smoke suite (needs a build)
```

Anything that touches the code must respect the rules in [`CLAUDE.md`](CLAUDE.md):
the JS-off storefront stays crawlable, every destination is a real `<a href>`, no
copyrighted assets, and the PS1/N64 look is a hard constraint.
[`ARCHITECTURE.md`](ARCHITECTURE.md) explains how it's wired;
[`STRUCTURE.md`](STRUCTURE.md) maps where everything lives.

## Line endings

`.gitattributes` forces **LF** on source and CI/shell files so a checkout on
another OS can't introduce CRLF breakage. Shipped, hand-authored period assets
under `public/` and source media under `media/` are deliberately left alone
(`-text`) — some are intentionally CRLF, mimicking 1990s files, and they aren't
ours to reflow (same set `.prettierignore` skips). If you ever see a stray
line-ending-only diff, run `git add --renormalize .` once on a clean tree; it
should report no changes.

## Security

Found a vulnerability — in the `api/` functions, the leaderboard, or anything
touching stored opt-in emails? Please report it privately — see
[SECURITY.md](SECURITY.md).
