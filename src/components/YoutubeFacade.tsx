import { useState } from 'react';
import { TV_SPOTS } from '../data/videos';

// ───────────────────────────────────────────────────────────────────────────
// YoutubeFacade — a period CRT television wrapping a CLICK-TO-LOAD YouTube playlist.
// Nothing from YouTube is requested until you press play (privacy: no cookies until
// opt-in; perf: the dialog stays light). A real <a> to the playlist is always in the
// DOM as the JS-off / screen-reader fallback. The CRT bezel + scanlines are the joke:
// a modern embed behind 1996 chrome. (Scanlines are a static gradient — no flashing,
// WCAG 2.3.1 safe.)
// ───────────────────────────────────────────────────────────────────────────
export function YoutubeFacade() {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="tv">
      <div className="tv__bezel">
        <div className="tv__screen">
          {playing ? (
            <iframe
              className="tv__iframe"
              src={`${TV_SPOTS.embed}&autoplay=1`}
              title={TV_SPOTS.title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="tv__play"
              onClick={() => setPlaying(true)}
              aria-label={`Play — ${TV_SPOTS.title}`}
            >
              <span className="tv__scan" aria-hidden="true" />
              <span className="tv__tri" aria-hidden="true">
                ▶
              </span>
              <span className="tv__title">{TV_SPOTS.title}</span>
            </button>
          )}
        </div>
      </div>
      <p className="tv__caption">
        {TV_SPOTS.blurb}{' '}
        <a href={TV_SPOTS.watch} target="_blank" rel="noopener noreferrer">
          Watch on YouTube &raquo;
        </a>
      </p>
      {!playing && (
        <p className="tv__note">Loads nothing until you press play — no cookies until then.</p>
      )}
    </div>
  );
}
