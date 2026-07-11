import { useMemo } from 'react';
import { ROOMS, ROOM_MAP, roomById } from '../data/rooms';

// A "you are here" map of the room graph for the pause menu (DOM/SVG — it lives
// in the overlay, not the 3D scene). FOG OF WAR by design: it only ever draws
// rooms you've VISITED plus the immediate frontier you can SEE a way to (the
// targets of non-hidden doors off visited rooms, as "?" stubs). Hidden/secret
// rooms stay invisible until you actually reach them, so the map answers "where
// am I / where can I go" without spoiling the discovery or the dread below.
//
// Pillar: Feedback & Clarity, the direct antidote to the "wrong side of the map"
// disorientation. Stable frame (viewBox from ALL coords) so it doesn't reflow as
// you explore. No motion/flash (WCAG-safe).

export function WorldMap({ visited, current }: { visited: string[]; current: string }) {
  const { nodes, edges, vb } = useMemo(() => {
    const visitedSet = new Set([...visited, current]);

    // Frontier: targets of NON-hidden doors off visited rooms you haven't reached.
    // A requiresKey (locked) door is visible in-world, so its target is a fair
    // "locked ?" stub; a hidden door reveals nothing until you're through it.
    const frontier = new Map<string, { locked: boolean }>();
    for (const r of ROOMS) {
      if (!visitedSet.has(r.id)) continue;
      for (const d of r.doors) {
        if (d.hidden || visitedSet.has(d.to)) continue;
        const prev = frontier.get(d.to);
        frontier.set(d.to, { locked: (prev?.locked ?? true) && !!d.requiresKey });
      }
    }

    const rendered = new Set<string>([...visitedSet, ...frontier.keys()]);

    // Edges between rendered rooms (dedup pairs). A hidden-door edge only shows
    // once BOTH ends are visited (i.e. you've traversed it), never as a frontier.
    const seen = new Set<string>();
    const edges: { a: string; b: string; locked: boolean }[] = [];
    for (const r of ROOMS) {
      if (!rendered.has(r.id)) continue;
      for (const d of r.doors) {
        if (!rendered.has(d.to)) continue;
        if (d.hidden && !(visitedSet.has(r.id) && visitedSet.has(d.to))) continue;
        const key = [r.id, d.to].sort().join('|');
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push({ a: r.id, b: d.to, locked: !!d.requiresKey });
      }
    }

    const nodes = [...rendered].map((id) => {
      const c = ROOM_MAP[id];
      const isVisited = visitedSet.has(id);
      return {
        id,
        x: c.x,
        y: c.y,
        visited: isVisited,
        current: id === current,
        locked: !isVisited && (frontier.get(id)?.locked ?? false),
        title: isVisited ? roomById(id).title : 'Somewhere you haven’t been',
      };
    });

    // Stable viewBox from ALL room coords (so the frame never jumps as you explore).
    const xs = Object.values(ROOM_MAP).map((c) => c.x);
    const ys = Object.values(ROOM_MAP).map((c) => c.y);
    const minX = Math.min(...xs) - 0.8;
    const minY = Math.min(...ys) - 0.6;
    const w = Math.max(...xs) + 0.8 - minX;
    const h = Math.max(...ys) + 0.6 - minY;
    return { nodes, edges, vb: { minX, minY, w, h } };
  }, [visited, current]);

  const at = (id: string) => ROOM_MAP[id];

  return (
    <div className="hud-pause__map">
      <p className="hud-pause__invtitle">Map</p>
      <svg
        viewBox={`${vb.minX} ${vb.minY} ${vb.w} ${vb.h}`}
        className="hud-pause__mapsvg"
        role="img"
        aria-label={`Map, you are in ${roomById(current).title}`}
      >
        {edges.map((e) => {
          const a = at(e.a);
          const b = at(e.b);
          return (
            <line
              key={`${e.a}|${e.b}`}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              className={`hud-map__edge${e.locked ? ' is-locked' : ''}`}
            />
          );
        })}
        {nodes.map((n) => (
          <g key={n.id}>
            <circle
              cx={n.x}
              cy={n.y}
              r={n.current ? 0.28 : 0.2}
              className={
                'hud-map__node' +
                (n.current ? ' is-current' : n.visited ? ' is-visited' : ' is-frontier')
              }
            >
              <title>{n.title}</title>
            </circle>
            {!n.visited && (
              <text x={n.x} y={n.y + 0.13} className="hud-map__q">
                ?
              </text>
            )}
            {n.locked && (
              <text x={n.x + 0.26} y={n.y - 0.18} className="hud-map__lock">
                🔒
              </text>
            )}
          </g>
        ))}
      </svg>
      <p className="hud-pause__maplegend">
        <span className="hud-map__dot is-current" /> here ·{' '}
        <span className="hud-map__dot is-visited" /> seen · <span className="hud-map__dot" />?
        unexplored
      </p>
    </div>
  );
}
