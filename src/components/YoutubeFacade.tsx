import { useEffect, useRef, useState } from 'react';
import { TV_SPOTS, type TvVideo } from '../data/videos';
import { exposeTestGlobal } from '../lib/testHooks';
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
// toggles are forwarded via the YT iframe API (enablejsapi=1 + postMessage). A
// toggle can land while the player is still initializing and be dropped, so the
// iframe's load event re-asserts the CURRENT desired state on two delayed retries
// (idempotent commands — a repeat of the current state is a no-op). The player's
// own volume control still works after an unmute.
// ───────────────────────────────────────────────────────────────────────────
// Post-load retry delays (ms): the YT player's JS API comes up a beat AFTER the
// iframe's load event; the second retry covers a slow init.
const MUTE_RETRY_MS = [300, 1400];

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
  const retryTimers = useRef<number[]>([]);
  const sentCount = useRef(0);

  const sendMuteCmd = (m: boolean) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      // Target origin is DERIVED from the embed url (not hard-coded), so if the
      // embed host ever changes, mute forwarding can't silently start missing —
      // the postMessage target moves with the data layer.
      win.postMessage(
        JSON.stringify({ event: 'command', func: m ? 'mute' : 'unMute', args: [] }),
        new URL(video.embed).origin,
      );
      // Instrumentation for the tv smoke (test entrances only): proves a post-load
      // store toggle actually reaches the iframe, not just the click-time URL param.
      exposeTestGlobal('__sdpTvMuteSent', ++sentCount.current);
    } catch {
      /* cross-origin hiccup — a later toggle/retry re-sends */
    }
  };

  useEffect(() => {
    // Forward mute CHANGES only (not the initial value — the URL param covers it).
    if (muted === prevMuted.current) return;
    prevMuted.current = muted;
    if (!playing) return;
    sendMuteCmd(muted);
  }, [muted, playing]);

  // If a toggle raced the player's init, the fire-and-forget command above was
  // dropped. Once the iframe has LOADED, re-assert the current desired state on a
  // couple of delayed retries — only when it differs from what the URL encoded
  // (otherwise the param already did the job and there's nothing to fix).
  const onIframeLoad = () => {
    retryTimers.current.forEach((t) => window.clearTimeout(t));
    retryTimers.current = MUTE_RETRY_MS.map((ms) =>
      window.setTimeout(() => {
        const want = useAudioStore.getState().muted;
        if (want !== mutedAtClick.current) sendMuteCmd(want);
      }, ms),
    );
  };
  useEffect(() => () => retryTimers.current.forEach((t) => window.clearTimeout(t)), []);

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
              onLoad={onIframeLoad}
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
