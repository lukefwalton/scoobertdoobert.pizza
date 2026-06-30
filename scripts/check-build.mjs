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
  const checks = {
    person: !!person,
    'scoobert->person': scoobert?.member?.['@id'] === PERSON_ID,
    'hub in sameAs': (person?.sameAs ?? []).includes(HUB_URL),
    disambiguation: (person?.disambiguatingDescription ?? '').includes(p.disambig),
  };
  if (p.inLanguage) {
    const aboutPage = nodes.find((n) => n['@type'] === 'AboutPage');
    checks[`inLanguage=${p.inLanguage}`] = aboutPage?.inLanguage === p.inLanguage;
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
    const aboutPage = nodes.find((n) => n['@type'] === 'AboutPage');
    console.error(
      `      actual: Person ${person ? 'present' : 'MISSING'}` +
        `, #scoobert.member=${JSON.stringify(scoobert?.member?.['@id'])}` +
        `, sameAs=${JSON.stringify(person?.sameAs)}` +
        `, disambiguatingDescription=${JSON.stringify(person?.disambiguatingDescription)}` +
        (p.inLanguage ? `, AboutPage.inLanguage=${JSON.stringify(aboutPage?.inLanguage)}` : ''),
    );
    failed++;
  }
}

if (failed) {
  console.error(`\npost-build check FAILED (${failed}).`);
  process.exit(1);
}
console.log('post-build check passed.');
