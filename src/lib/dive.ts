import { albumBySlug } from '../data/albums';
import { jukeboxTrackUrl } from '../data/jukebox';
import { audio } from '../audio/engine';
import { useSceneStore } from '../state/sceneStore';

// Dive into a painting portal: start the album's track (the reward is sound), then
// kick off the cover's ripple/swallow + the walk-through (sceneStore.enterPainting).
// Shared by the cover click (Doors) and the E-key (WorldHud); three-free so the HUD
// can import it without pulling the WebGL cover code into its bundle. Safe when the
// album has no public track — it just dives without changing the music.
export function diveInto(albumSlug: string | undefined, to: string, spawn: string): void {
  const album = albumSlug ? albumBySlug(albumSlug) : undefined;
  if (album?.track) {
    audio.unlock();
    void audio.playJukeboxTrack(jukeboxTrackUrl(album.track));
  }
  useSceneStore.getState().enterPainting(to, spawn);
}
