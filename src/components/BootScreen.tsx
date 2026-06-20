import { useEffect, useState } from 'react';
import { audio } from '../audio/engine';
import { useAudioStore } from '../state/audioStore';
import '../styles/boot.css';

// A brief, plain PIZZA-DOS boot card. Period-accurate (a fake POST log on a
// black screen), NOT SGI chrome. Pure client-side enhancement: it renders null
// on the server and on the first client render, so it never appears in the
// crawlable HTML and is skipped entirely with JS off. It also self-skips under
// prefers-reduced-motion and only shows once per browser session.
//
// "CALZONE PLAYER ... NOT FOUND" foreshadows the descent gag.
const LINES = [
  'PIZZA-DOS 6.2    (C) 1997 Scoobert Doobert, Inc.',
  '',
  '640K BASE MEMORY ............. OK',
  'DETECTING TOPPINGS ........... OK',
  'MOUNTING /dev/oven ........... OK',
  'CALZONE PLAYER ............... NOT FOUND',
  '',
  'Loading Electronic Pizza Storefront . . .',
];

export function BootScreen() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem('sdp_booted') === '1';
    } catch {
      /* ignore */
    }
    if (seen || reduced) return;
    try {
      sessionStorage.setItem('sdp_booted', '1');
    } catch {
      /* ignore */
    }

    // Prime the audio graph and sync the persisted mute preference. Sound can't
    // start until a user gesture (autoplay policy), so the boot loop begins on
    // the first pointer/key event — which the boot card invites with a click.
    audio.muted = useAudioStore.getState().muted;
    audio.ensure();
    const unlock = () => {
      audio.unlock();
      if (!useAudioStore.getState().muted) audio.startBootLoop();
    };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });

    setShow(true);
    const timer = window.setTimeout(() => setShow(false), 2000);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  if (!show) return null;

  return (
    <div className="boot" role="status" aria-label="Booting" onClick={() => setShow(false)}>
      <pre className="boot__log">
        {LINES.join('\n')}
        <span className="boot__cursor"> _</span>
      </pre>
      <p className="boot__skip">[ click to skip ]</p>
    </div>
  );
}
