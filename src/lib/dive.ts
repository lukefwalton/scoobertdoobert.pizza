import { albumBySlug } from '../data/albums';
import { playbackUrlFor } from './trackSource';
import { audio } from '../audio/engine';
import { useSceneStore } from '../state/sceneStore';

// Dive into a painting portal: start the album's track (the reward is sound), then
// kick off the cover's ripple/swallow + the walk-through (sceneStore.enterPainting).
// Shared by the cover click (Doors) and the E-key (WorldHud); three-free so the HUD
// can import it without pulling the WebGL cover code into its bundle. Safe when the
// album has no public track — it just dives without changing the music.
export function diveInto(albumSlug: string | undefined, to: string, spawn: string): void {
  // A dive is a one-shot transition. Bail if one is already in flight (divingTo) or
  // a wipe / menu is up — so double-clicking a cover or mashing E during the ripple
  // can't restart the album track or queue a second delayed room change. enterPainting
  // re-checks the same guards, but starting the track lives here, so the guard must too.
  const s = useSceneStore.getState();
  if (s.divingTo || s.transitioning || s.paused || s.openHotspot) return;
  const album = albumSlug ? albumBySlug(albumSlug) : undefined;
  if (album?.track) {
    audio.unlock();
    void audio.playJukeboxTrack(playbackUrlFor(album.track));
  }
  s.enterPainting(to, spawn);
}
