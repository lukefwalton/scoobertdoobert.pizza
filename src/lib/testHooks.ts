// Test-entrance hooks. Several components/the engine expose internal state on
// `window.__sdp*` so the Playwright smokes can assert on real runtime state — but
// ONLY under the ?world / ?debug / ?room test entrances, so it's never part of the
// normal runtime surface. This centralizes that gate so each consumer doesn't
// re-spell the regex + the window cast.

/** True on the ?world / ?debug / ?room test entrances (where smoke globals are
 *  allowed). `?room=ID` is a deterministic smoke entry (WorldMount drops straight
 *  into that room) — a real visitor never lands on it, so its read-only state
 *  globals are fine to expose, the same as ?world. */
export function isTestEntrance(): boolean {
  return (
    typeof window !== 'undefined' && /[?&](world|debug|room)(=|&|$)/.test(window.location.search)
  );
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
