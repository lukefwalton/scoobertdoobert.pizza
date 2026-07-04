// Post-build smoke check. The SSG / MPA contract says both documents must exist
// as real prerendered HTML containing their real content — not SPA fallbacks.
// Runs automatically after `npm run build` (and on Vercel), failing the build on
// a quiet config regression.
//
// vite-react-ssg emits the text-only route as dist/text.html. We accept either
// that or a nested dist/text/index.html so this guard stays correct if the SSG
// output shape ever changes.
import { existsSync, readFileSync, readdirSync } from 'node:fs';

function hasContent(file, needle) {
  return existsSync(file) && readFileSync(file, 'utf8').includes(needle);
}

const cases = [
  { label: 'storefront (/)', files: ['dist/index.html'], needle: 'Electronic Pizza Storefront' },
  {
    label: 'text-only (/text)',
    files: ['dist/text.html', 'dist/text/index.html'],
    needle: 'Text-Only Menu',
  },
  {
    label: 'leaderboard (/leaderboard)',
    files: ['dist/leaderboard.html', 'dist/leaderboard/index.html'],
    needle: 'HIGH SCORES',
  },
];

let failed = 0;
for (const c of cases) {
  const hit = c.files.find((f) => hasContent(f, c.needle));
  if (hit) {
    console.log(`  ok ${c.label} -> ${hit}`);
  } else {
    console.error(`  x ${c.label}: none of [${c.files.join(', ')}] contain "${c.needle}"`);
    failed++;
  }
}

// Provenance guard: every shipped 3D model (dist/models/*.glb) must have an entry
// in THIRD_PARTY_NOTICES.md, so a bundled third-party asset can't drift into the
// release without an attribution row. We only require the filename be PRESENT —
// the exact license text is Luke's to fill in (TODO(license) is allowed); a model
// with no row at all fails the build.
const NOTICES = 'THIRD_PARTY_NOTICES.md';
const modelsDir = 'dist/models';
if (existsSync(modelsDir)) {
  const notices = existsSync(NOTICES) ? readFileSync(NOTICES, 'utf8') : '';
  for (const glb of readdirSync(modelsDir).filter((f) => f.toLowerCase().endsWith('.glb'))) {
    if (notices.includes(glb)) {
      console.log(`  ok shipped model ${glb} -> has a ${NOTICES} entry`);
    } else {
      console.error(`  x shipped model ${glb}: no entry in ${NOTICES} (add an attribution row)`);
      failed++;
    }
  }
}

// Identity-unification guard: the whole point of the JSON-LD is that both domains
// resolve to ONE person via the canonical @id, and that the page-level `#scoobert`
// node bridges back to it (about/mainEntity -> #scoobert -> member -> #person). A
// vitest already pins the homepage SOURCE; here we assert the actual RENDERED
// crawler-facing HTML on every identity page keeps that bridge intact.
const PERSON_ID = 'https://lukefwalton.com/#person';
const SCOOBERT_ID = 'https://lukefwalton.com/#scoobert';

function graphNodes(file) {
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const blocks = [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi),
  ];
  const nodes = [];
  for (const m of blocks) {
    const parsed = JSON.parse(m[1]); // throws -> build fails on invalid JSON-LD
    nodes.push(...(parsed['@graph'] ?? [parsed]));
  }
  return nodes;
}

const HUB_URL = 'https://lukefwalton.com/';
// Each identity page must: carry the shared #person Person node, bridge #scoobert
// -> #person, list the hub in the Person's sameAs (the bidirectional link), and
// disambiguate from the Scooby-Doo character in the page's language. The about
// pages additionally declare the right inLanguage on their AboutPage node.
const identityPages = [
  { label: 'storefront (/)', files: ['dist/index.html'], disambig: 'Scooby-Doo' },
  {
    label: 'about (/about)',
    files: ['dist/about.html', 'dist/about/index.html'],
    disambig: 'Scooby-Doo',
    inLanguage: 'en',
  },
  {
    label: 'about-jp (/about/jp)',
    files: ['dist/about/jp.html', 'dist/about/jp/index.html'],
    disambig: 'スクービー',
    inLanguage: 'ja',
  },
];
for (const p of identityPages) {
  const file = p.files.find((f) => existsSync(f));
  if (!file) {
    console.error(`  x ${p.label}: none of [${p.files.join(', ')}] exist`);
    failed++;
    continue;
  }
  const nodes = graphNodes(file);
  const person = nodes.find((n) => n['@type'] === 'Person' && n['@id'] === PERSON_ID);
  const scoobert = nodes.find((n) => n['@type'] === 'MusicGroup' && n['@id'] === SCOOBERT_ID);
  const aboutPage = nodes.find((n) => n['@type'] === 'AboutPage');
  const checks = {
    person: !!person,
    'scoobert->person': scoobert?.member?.['@id'] === PERSON_ID,
    'hub in sameAs': (person?.sameAs ?? []).includes(HUB_URL),
    disambiguation: (person?.disambiguatingDescription ?? '').includes(p.disambig),
  };
  if (p.inLanguage) {
    // The about pages carry an AboutPage node; assert the full documented bridge
    // (about/mainEntity -> #scoobert) and the localized language tag.
    checks[`inLanguage=${p.inLanguage}`] = aboutPage?.inLanguage === p.inLanguage;
    checks['about->scoobert'] = aboutPage?.about?.['@id'] === SCOOBERT_ID;
    checks['mainEntity->scoobert'] = aboutPage?.mainEntity?.['@id'] === SCOOBERT_ID;
  }
  const broken = Object.entries(checks)
    .filter(([, ok]) => !ok)
    .map(([k]) => k);
  if (broken.length === 0) {
    console.log(`  ok ${p.label} -> shared #person identity intact`);
  } else {
    console.error(`  x ${p.label}: identity checks failed -> ${broken.join(', ')}`);
    // Print the actual values behind the failure so CI is diagnosable without a
    // local repro.
    console.error(
      `      actual: Person ${person ? 'present' : 'MISSING'}` +
        `, #scoobert.member=${JSON.stringify(scoobert?.member?.['@id'])}` +
        `, sameAs=${JSON.stringify(person?.sameAs)}` +
        `, disambiguatingDescription=${JSON.stringify(person?.disambiguatingDescription)}` +
        (p.inLanguage
          ? `, AboutPage.inLanguage=${JSON.stringify(aboutPage?.inLanguage)}` +
            `, AboutPage.about=${JSON.stringify(aboutPage?.about?.['@id'])}` +
            `, AboutPage.mainEntity=${JSON.stringify(aboutPage?.mainEntity?.['@id'])}`
          : ''),
    );
    failed++;
  }
}

// Bundle-discipline guard: the storefront's INITIAL JS graph must ship zero three.js
// and no debug-only `leva` — both are lazy (three behind the install gag, leva behind
// ?debug). We assert against the storefront HTML's OWN script graph, keyed on
// fingerprint tokens that survive minification (a class name / a hook name) rather
// than the word "leva" (which also hides inside "relevant" — a known false positive)
// or a chunk filename (which the bundler is free to rename). A static-import
// regression that pulls either dep into the entry chunk then fails the build.
// Several fingerprints per dep, not one: a tree-shaken subset of three that happened
// to exclude BufferGeometry would still violate the standard, but any real use pulls
// the renderer or the scene-graph base too — so we trip on ANY of them. All are absent
// from the legit storefront entry chunk today (verified), so no false positives.
const FORBIDDEN = [
  { token: 'BufferGeometry', dep: 'three.js' },
  { token: 'WebGLRenderer', dep: 'three.js' },
  { token: 'Object3D', dep: 'three.js' },
  { token: 'LevaPanel', dep: 'leva' },
  { token: 'useControls', dep: 'leva' },
];
const storefront = 'dist/index.html';
if (existsSync(storefront)) {
  const html = readFileSync(storefront, 'utf8');
  const entryJs = [
    ...new Set([...html.matchAll(/\/assets\/[A-Za-z0-9._-]+\.js/g)].map((m) => m[0])),
  ];
  let bundleBad = 0;
  // Fail CLOSED: a standards-enforcement guard must never pass by finding nothing. If
  // the storefront HTML no longer references any /assets/*.js (a build-output or
  // base-path change broke discovery), the three.js/leva rule would silently stop
  // being checked — so that's a failure, not a quiet success.
  if (entryJs.length === 0) {
    console.error(
      `  x storefront bundle guard found no /assets/*.js in ${storefront} — initial-graph discovery broke; refusing to pass without asserting the three.js/leva rule`,
    );
    bundleBad++;
  }
  for (const ref of entryJs) {
    const file = 'dist' + ref;
    const code = existsSync(file) ? readFileSync(file, 'utf8') : '';
    for (const { token, dep } of FORBIDDEN) {
      if (code.includes(token)) {
        console.error(
          `  x storefront chunk ${ref} contains ${dep} (${token}) — it must stay lazy, out of the initial bundle`,
        );
        bundleBad++;
      }
    }
  }
  failed += bundleBad;
  if (!bundleBad) {
    console.log(
      `  ok storefront initial JS graph (${entryJs.length} chunk) ships no three.js / leva`,
    );
  }
}

// Installability guard: every icon the manifest DECLARES must actually ship at the
// declared square dimensions, so a manifest/asset drift (a renamed or wrong-sized
// icon) fails the build instead of quietly breaking install / home-screen behavior.
// Reads the PNG IHDR directly — no image dep — and requires square.
function pngSize(file) {
  const buf = readFileSync(file);
  if (buf.length < 24 || buf.toString('ascii', 12, 16) !== 'IHDR') return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
// The apple-touch-icon is a SEPARATE contract in index.html (outside the manifest),
// so size-check it on its own — a rename or wrong-size there would otherwise slip past
// the manifest-icon loop below. Apple expects 180×180.
if (existsSync('dist/index.html')) {
  const linkTag = readFileSync('dist/index.html', 'utf8').match(
    /<link[^>]*apple-touch-icon[^>]*>/i,
  );
  const href = linkTag?.[0].match(/href="([^"]+)"/)?.[1];
  const file = href ? 'dist' + href : null;
  const sz = file && existsSync(file) ? pngSize(file) : null;
  if (!href) {
    console.error('  x index.html declares no apple-touch-icon');
    failed++;
  } else if (!sz) {
    console.error(`  x apple-touch-icon ${href} -> missing or not a PNG at dist${href}`);
    failed++;
  } else if (sz.w !== 180 || sz.h !== 180) {
    console.error(`  x apple-touch-icon ${href} -> is ${sz.w}x${sz.h}, expected 180x180`);
    failed++;
  } else {
    console.log(`  ok apple-touch-icon ${href} -> 180x180`);
  }
}
// Fail CLOSED on the manifest too: index.html links /site.webmanifest, so a copy or
// rename regression that drops it from dist must fail the build, not skip validation.
const manifestFile = 'dist/site.webmanifest';
const linksManifest =
  existsSync('dist/index.html') &&
  readFileSync('dist/index.html', 'utf8').includes('/site.webmanifest');
if (linksManifest && !existsSync(manifestFile)) {
  console.error(
    `  x index.html links /site.webmanifest but ${manifestFile} is missing — installability broken`,
  );
  failed++;
} else if (existsSync(manifestFile)) {
  const icons = JSON.parse(readFileSync(manifestFile, 'utf8')).icons ?? [];
  for (const icon of icons) {
    const file = 'dist' + icon.src;
    const sz = existsSync(file) ? pngSize(file) : null;
    if (!sz) {
      console.error(`  x manifest icon ${icon.src} -> missing or not a PNG at dist${icon.src}`);
      failed++;
    } else if (`${sz.w}x${sz.h}` !== icon.sizes) {
      console.error(
        `  x manifest icon ${icon.src} -> is ${sz.w}x${sz.h} but the manifest declares ${icon.sizes}`,
      );
      failed++;
    } else if (sz.w !== sz.h) {
      console.error(
        `  x manifest icon ${icon.src} -> ${sz.w}x${sz.h} is not square (install wants square)`,
      );
      failed++;
    } else {
      console.log(`  ok manifest icon ${icon.src} -> ${icon.sizes}, square`);
    }
  }
}

if (failed) {
  console.error(`\npost-build check FAILED (${failed}).`);
  process.exit(1);
}
console.log('post-build check passed.');
