# Security Policy

scoobertdoobert.pizza is a mostly-static site (Vite + React, prerendered, hosted
on Vercel). It has a small backend surface — two serverless functions under
[`api/`](../api/):

- **`api/order.ts`** — the (theatrical) order form. If a visitor types an email
  **and** ticks the opt-in box, that one address is written to a **private**
  Vercel Blob. That's the only PII the site stores.
- **`api/score.ts`** — the arcade leaderboard. `GET` returns the top board;
  `POST` submits 3 initials + a score (validated server-side). Board entries
  (initials + score) are not PII.

There's no login, no session, no database, and no third-party analytics or
tracking. The bulk of the site is static assets and client-side WebGL.

## Reporting a vulnerability

Please **do not open a public issue** for a security problem. Instead:

1. Email **[luke@lukefwalton.com](mailto:luke@lukefwalton.com)** with a
   description of the issue.
2. Include steps to reproduce, the affected area, and the potential impact.
3. You'll get an acknowledgement within a few days. Please allow a reasonable
   window to ship a fix before disclosing publicly.

## In scope

- The `api/` serverless functions: anything that exposes the stored opt-in
  emails, lets the leaderboard be forged/abused beyond its validation, or leaks
  the Blob store token (`BLOB_READ_WRITE_TOKEN`)
- Client-side issues: XSS or injection through any user-reachable input
- Secrets accidentally committed or exposed through the build

## Not a security issue

- Bugs in the experience itself (broken links, audio that won't play, a floor
  that renders wrong) — please use
  [GitHub Issues](https://github.com/lukefwalton/scoobertdoobert.pizza/issues).
- Reminder: the source code and the creative content are both **all rights
  reserved** (see [LICENSE](../LICENSE)). Security reports are welcome regardless.

## Supported versions

Fixes target the live site and the `main` branch.
