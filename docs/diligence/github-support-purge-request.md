# GitHub Support request: purge contaminated pull-request refs

## Subject

Purge removed third-party character model blobs retained by closed PR refs

## Request

Repository: https://github.com/lukefwalton/scoobertdoobert.pizza  
Visibility: Public  
Owner/admin: `lukefwalton`

Third-party character IP scout models were accidentally committed and later removed. We rewrote `main` history on 2026-07-08, and current `HEAD` ancestry is clean. However, closed pull-request tip refs still expose the removed blobs to unauthenticated clients that fetch `refs/pull/*/head`.

Please purge these exact paths from all reachable repository objects and pull-request refs:

- `media/models/animatronics/customizable-animatronics-fazbear.glb`
- `media/models/animatronics/springbonnie-chuck-e-cheese-style.glb`
- `media/models/animatronics/nightmare-shrek-animatronic.glb`
- `media/models/levels/max-and-ruby-house.glb`

The contaminated refs are `refs/pull/13/head` through `refs/pull/128/head`: 116 closed PR refs total, comprising 114 merged PRs and two closed-unmerged PRs (#54 and #84). Clean PR tip refs exist outside this range (#1–#12 and #129 onward). A complete ref-to-SHA inventory is attached as `contaminated-pr-refs.tsv`.

Please:

1. Delete or hide those pull refs, or otherwise make the listed blobs unreachable from every repository ref.
2. Purge cached pull-request diffs and file views that retain the objects.
3. Run repository garbage collection so unauthenticated clones that fetch `refs/pull/*/head` can no longer retrieve the objects.

We cannot delete `refs/pull/*` ourselves: GitHub rejects admin attempts with HTTP 422 because pull-request refs are read-only.

After Support confirms completion, we will verify from a fresh unauthenticated clone by fetching the pull refs and running:

```sh
git rev-list --objects --all | grep -E 'customizable-animatronics-fazbear\.glb|springbonnie-chuck-e-cheese-style\.glb|nightmare-shrek-animatronic\.glb|max-and-ruby-house\.glb'
```

Expected result: zero hits.
