# media/ — source originals (NOT shipped)

Heavy source material, kept out of the build. Only web-sized / degraded
derivatives under `public/` are ever served.

- `masters/` — full song masters (`.mp3`). The boot loop ships as a degraded
  8-bit bounce at `public/audio/boot.wav`, generated from one of these by
  `scripts/make-boot-audio.mjs`. (Layer themes: "Jolly Roger Bay (64)" = #1 /
  the world; "Information" = down a layer; "1101" = the save-san-diego ARG.)
- `brand/` — original brand-logo files. The copies the site actually serves
  live in `public/brand/`.
- `photos/` — the full-resolution press/photo archive. Web-sized picks ship
  from `public/press/`.

If this tree gets heavy, consider Git LFS — but originals don't belong in the
deploy, only their derivatives.
