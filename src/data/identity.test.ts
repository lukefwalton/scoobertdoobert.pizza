import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { personNode, PERSON_ID } from './identity';

// identity.ts is the single source of truth for the shared Person node, imported
// by /about and /about/jp. But index.html is static HTML and can't import TS, so
// it carries a HAND-MAINTAINED MIRROR of that node. The whole point of this graph
// is that scoobertdoobert.pizza and lukefwalton.com resolve to ONE person via the
// canonical @id — and the homepage (/) is the highest-crawl page. If the mirror
// drifts from identity.ts, the unification silently regresses exactly where it
// matters most. This test reads the real index.html, pulls its inline JSON-LD,
// and asserts the homepage Person node is byte-for-byte the shared personNode('en').

function indexGraph(): Record<string, unknown>[] {
  const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  expect(match, 'index.html must contain an application/ld+json block').toBeTruthy();
  const json = JSON.parse(match![1]) as { '@graph': Record<string, unknown>[] };
  expect(Array.isArray(json['@graph']), 'index.html JSON-LD must use an @graph').toBe(true);
  return json['@graph'];
}

describe('identity — homepage Person node mirrors the shared source of truth', () => {
  it('index.html Person node equals personNode("en") exactly (no drift)', () => {
    const person = indexGraph().find((n) => n['@type'] === 'Person');
    expect(person, 'index.html @graph must contain a Person node').toBeDefined();
    // Deep-equal the whole node: @id, name, alternateName, disambiguatingDescription,
    // url, identifier, sameAs. Any divergence from identity.ts fails here.
    expect(person).toEqual(personNode('en'));
  });

  it('the #scoobert MusicGroup ties back to the shared #person identity', () => {
    // Pages set about/mainEntity to #scoobert (the music project); the unification
    // only holds because #scoobert.member points at the shared Person @id. Guard it.
    const scoobert = indexGraph().find((n) => n['@type'] === 'MusicGroup');
    expect(scoobert, 'index.html @graph must contain the #scoobert MusicGroup').toBeDefined();
    expect((scoobert!.member as { '@id'?: string })?.['@id']).toBe(PERSON_ID);
  });
});
