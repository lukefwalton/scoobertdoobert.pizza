// Test-entrance hooks. Several components/the engine expose internal state on
// `window.__sdp*` so the Playwright smokes can assert on real runtime state — but
// ONLY under the ?world / ?debug test entrances, so it's never part of the normal
// runtime surface. This centralizes that gate so each consumer doesn't re-spell
// the regex + the window cast.

/** True on the ?world / ?debug test entrances (where smoke globals are allowed). */
export function isTestEntrance(): boolean {
  return typeof window !== 'undefined' && /[?&](world|debug)(=|&|$)/.test(window.location.search);
}

/** Set `window[name] = value`, but only on a test entrance (a no-op otherwise).
 *  Pass `undefined` to actually REMOVE the property (so presence checks work too). */
export function exposeTestGlobal(name: string, value: unknown): void {
  if (!isTestEntrance()) return;
  const w = window as unknown as Record<string, unknown>;
  if (value === undefined) delete w[name];
  else w[name] = value;
}
