# fun/ — placeholder (separate repo, not yet wired in)

`fun/` is meant to hold a **separate project** — Luke's half-built JS music
apps — that will be borrowed from later (see "Post-loop — wire up `fun/`" in
[`../docs/PHASES.md`](../docs/PHASES.md); the instrument rooms come from here).

It was originally copied in as a nested git repository, so git recorded it as a
broken **gitlink** (a submodule pointer with no `.gitmodules`) and none of the
actual files came across. That phantom pointer has been removed so the tree is
legible; this README is the placeholder.

**Referenced commit (preserved so nothing is lost):**
`067385f4e0a7ab0709f37bc31cf507b5b904e149`

## To actually bring it in later, pick one:

- **Proper submodule** (keeps it as its own repo):
  ```bash
  git submodule add <repo-url> fun
  ```
- **Vendor the files** (copy in as normal tracked files): copy the project in,
  delete its nested `.git/`, then `git add fun/`.

Until then, nothing here is built or shipped.
