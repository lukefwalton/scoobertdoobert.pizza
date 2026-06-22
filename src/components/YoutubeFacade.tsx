import { useState } from 'react';
import { TV_SPOTS, type TvVideo } from '../data/videos';

// ───────────────────────────────────────────────────────────────────────────
// YoutubeFacade — a period CRT television wrapping a CLICK-TO-LOAD YouTube video.
// Nothing from YouTube is requested until you press play (privacy: no cookies until
// opt-in; perf: the panel stays light). A real <a> to the video is always in the DOM
// as the JS-off / screen-reader fallback. The CRT bezel + scanlines are the joke: a
// modern embed behind 1996 chrome. (Scanlines are a static gradient — no flashing,
// WCAG 2.3.1 safe.) Defaults to the channel's TV spots; an album-room CRT passes its
// own `video` (the far side of that painting — the record's music videos).
// ───────────────────────────────────────────────────────────────────────────
export function YoutubeFacade({
  video = TV_SPOTS,
  caption = TV_SPOTS.blurb,
}: {
  video?: TvVideo;
  caption?: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="tv">
      <div className="tv__bezel">
        <div className="tv__screen">
          {playing ? (
            <iframe
              className="tv__iframe"
              src={`${video.embed}&autoplay=1`}
              title={video.title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="tv__play"
              onClick={() => setPlaying(true)}
              aria-label={`Play — ${video.title}`}
            >
              <span className="tv__scan" aria-hidden="true" />
              <span className="tv__tri" aria-hidden="true">
                ▶
              </span>
              <span className="tv__title">{video.title}</span>
            </button>
          )}
        </div>
      </div>
      <p className="tv__caption">
        {caption}{' '}
        <a href={video.watch} target="_blank" rel="noopener noreferrer">
          Watch on YouTube &raquo;
        </a>
      </p>
      {!playing && (
        <p className="tv__note">Loads nothing until you press play — no cookies until then.</p>
      )}
    </div>
  );
}
