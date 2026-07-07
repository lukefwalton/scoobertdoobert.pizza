import { useEffect, useRef, useState } from 'react';
import { TV_SPOTS, type TvVideo } from '../data/videos';
import { useAudioStore } from '../state/audioStore';

// ───────────────────────────────────────────────────────────────────────────
// YoutubeFacade — a period CRT television wrapping a CLICK-TO-LOAD YouTube video.
// Nothing from YouTube is requested until you press play (privacy: no cookies until
// opt-in; perf: the panel stays light). A real <a> to the video is always in the DOM
// as the JS-off / screen-reader fallback. The CRT bezel + scanlines are the joke: a
// modern embed behind 1996 chrome. (Scanlines are a static gradient — no flashing,
// WCAG 2.3.1 safe.) Defaults to the channel's TV spots; an album-room CRT passes its
// own `video` (the far side of that painting — the record's music videos).
//
// The iframe honors the site's GLOBAL MUTE: it starts muted when the site is muted
// at click time (URL param — no postMessage race with player init), and later mute
// toggles are forwarded via the YT iframe API (enablejsapi=1 + postMessage). The
// player's own volume control still works after an unmute.
// ───────────────────────────────────────────────────────────────────────────
const YT_ORIGIN = 'https://www.youtube-nocookie.com';

export function YoutubeFacade({
  video = TV_SPOTS,
  caption,
}: {
  video?: TvVideo;
  caption?: string;
}) {
  const [playing, setPlaying] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  // Captured once at click time so the src (and its mute=1) never changes under
  // a mounted player — later toggles go over postMessage instead.
  const mutedAtClick = useRef(false);
  const muted = useAudioStore((s) => s.muted);
  const prevMuted = useRef(muted);

  useEffect(() => {
    // Forward mute CHANGES only (not the initial value — the URL param covers it).
    if (muted === prevMuted.current) return;
    prevMuted.current = muted;
    if (!playing) return;
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({ event: 'command', func: muted ? 'mute' : 'unMute', args: [] }),
        YT_ORIGIN,
      );
    } catch {
      /* cross-origin hiccup — the next toggle retries */
    }
  }, [muted, playing]);

  // The clip's own caption (a song/album line) wins; fall back to the channel blurb.
  const cap = caption ?? video.blurb ?? TV_SPOTS.blurb;
  return (
    <div className="tv">
      <div className="tv__bezel">
        <div className="tv__screen">
          {playing ? (
            <iframe
              ref={iframeRef}
              className="tv__iframe"
              src={`${video.embed}&autoplay=1&enablejsapi=1${mutedAtClick.current ? '&mute=1' : ''}`}
              title={video.title}
              allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="tv__play"
              onClick={() => {
                mutedAtClick.current = useAudioStore.getState().muted;
                setPlaying(true);
              }}
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
        {cap}{' '}
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
