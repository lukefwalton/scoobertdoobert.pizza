import { describe, it, expect } from 'vitest';
import { MAZE, MAZE_ENTRY_SLUG, mazeNodeBySlug } from './maze';
import { destById } from './links';
import { LORE } from './lore';
import { ROOM_WHISPERS } from './whispers';
import { ROOMS } from './rooms';

// The back-of-house link maze (ADDENDUM #8). These pin the maze's contracts:
// a connected graph of real pages, real lore (never invented), a sell on every
// node, and game exits that point at rooms which actually exist.
describe('maze — the back-of-house link maze', () => {
  it('has unique slugs, titles, and descriptions (each page is its own SEO surface)', () => {
    for (const key of ['slug', 'title', 'description'] as const) {
      const values = MAZE.map((n) => n[key]);
      expect(new Set(values).size, `duplicate ${key}`).toBe(values.length);
    }
  });

  it('every onward door resolves to a real maze node', () => {
    for (const node of MAZE) {
      for (const door of node.onward) {
        expect(mazeNodeBySlug(door.slug), `${node.slug} → ${door.slug}`).toBeDefined();
        expect(door.slug, `${node.slug} links to itself`).not.toBe(node.slug);
      }
    }
  });

  it('the whole maze is reachable from the entry (no orphan pages)', () => {
    const seen = new Set<string>([MAZE_ENTRY_SLUG]);
    const queue = [MAZE_ENTRY_SLUG];
    while (queue.length) {
      const node = mazeNodeBySlug(queue.pop()!)!;
      for (const { slug } of node.onward) {
        if (!seen.has(slug)) {
          seen.add(slug);
          queue.push(slug);
        }
      }
    }
    for (const node of MAZE) expect(seen.has(node.slug), `${node.slug} unreachable`).toBe(true);
  });

  it('every node has at least one onward door and one music/hire pitch', () => {
    for (const node of MAZE) {
      expect(node.onward.length, `${node.slug} onward`).toBeGreaterThan(0);
      expect(node.pitch.length, `${node.slug} pitch`).toBeGreaterThan(0);
      for (const { destId } of node.pitch) {
        expect(destById(destId), `${node.slug} pitch dest '${destId}'`).toBeDefined();
      }
    }
  });

  it('lore is quoted VERBATIM from lore.ts / whispers.ts — never invented', () => {
    const canon = new Set<string>([...LORE, ...Object.values(ROOM_WHISPERS)]);
    for (const node of MAZE) {
      expect(node.lore.length, `${node.slug} lore`).toBeGreaterThan(0);
      for (const line of node.lore) {
        expect(canon.has(line), `${node.slug} lore line is not canon: "${line}"`).toBe(true);
      }
    }
  });

  it('game exits use the sanctioned deep links and target rooms that exist', () => {
    const roomIds = new Set(ROOMS.map((r) => r.id));
    let exits = 0;
    for (const node of MAZE) {
      if (!node.exit) continue;
      exits += 1;
      expect(node.exit.href, `${node.slug} exit href`).toMatch(/^\/\?(world$|room=)/);
      const room = /[?&]room=([a-z-]+)/.exec(node.exit.href)?.[1];
      if (room) expect(roomIds.has(room), `${node.slug} exit room '${room}'`).toBe(true);
    }
    // The maze's whole job includes funneling into the game — keep at least one
    // of each exit shape alive.
    expect(exits).toBeGreaterThanOrEqual(2);
    expect(MAZE.some((n) => n.exit?.href === '/?world')).toBe(true);
  });

  it('the sell leads with the funnel: reel and contact each appear somewhere', () => {
    const pitched = new Set(MAZE.flatMap((n) => n.pitch.map((p) => p.destId)));
    expect(pitched.has('reel')).toBe(true);
    expect(pitched.has('contact')).toBe(true);
    expect(pitched.has('listen')).toBe(true);
  });
});
