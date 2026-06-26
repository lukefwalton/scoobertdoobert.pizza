// Test-entrance hooks. Several components/the engine expose internal state on
// `window.__sdp*` so the Playwright smokes can assert on real runtime state — but
// ONLY under the ?world / ?debug test entrances, so it's never part of the normal
// runtime surface. This centralizes that gate so each consumer doesn't re-spell
// the regex + the window cast.
//
// NOTE: ?room=ID (WorldMount's deterministic room entry) is intentionally NOT a test
// entrance — it works in production builds, so exposing __sdp* hooks under it would
// be real prod surface. Smokes that need the hooks while in a specific room pass
// &debug=1 alongside ?room (e.g. ?room=jukebox&debug=1).

/** True on the ?world / ?debug test entrances (where smoke globals are allowed). */
export function isTestEntrance(): boolean {
  return typeof window !== 'undefined' && /[?&](world|debug)(=|&|$)/.test(window.location.search);
}

/** True only on the ?debug entrance — the NARROWER gate. Read-only state globals
 *  ride isTestEntrance (?world too); ACTION hooks that can teleport or advance
 *  progression (`__sdpGoToRoom`, `__sdpLoopMobius`) gate on this instead, so a
 *  curious visitor on the guessable `?world=1` can't console-call a room-jump /
 *  progression-bypass API. Smokes that need them pass `&debug=1` explicitly. */
export function isDebugEntrance(): boolean {
  return typeof window !== 'undefined' && /[?&]debug(=|&|$)/.test(window.location.search);
}

/** Set `window[name] = value`, but only on a test entrance (a no-op otherwise).
 *  Pass `undefined` to actually REMOVE the property (so presence checks work too). */
export function exposeTestGlobal(name: string, value: unknown): void {
  if (!isTestEntrance()) return;
  const w = window as unknown as Record<string, unknown>;
  if (value === undefined) delete w[name];
  else w[name] = value;
}
