import { audio } from '../audio/engine';
import { useAudioStore } from '../state/audioStore';
import { useMounted } from '../lib/useMounted';

// A small, period text toggle ("♪ music: on/off"). JavaScript-only — it never
// appears in the crawlable HTML, so no-JS visitors don't see a dead control.
export function MuteToggle() {
  const mounted = useMounted();
  const muted = useAudioStore((s) => s.muted);
  const ready = useAudioStore((s) => s.ready);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  if (!mounted) return null;

  // Disabled until the track is decoded, you can't enable music that isn't
  // loaded, and if it never loads the control never lights up.
  return (
    <button
      type="button"
      className="mute-toggle"
      aria-pressed={!muted}
      disabled={!ready}
      onClick={() => {
        audio.unlock();
        toggleMute();
      }}
    >
      ♪ music: {!ready ? 'loading…' : muted ? 'off' : 'on'}
    </button>
  );
}
