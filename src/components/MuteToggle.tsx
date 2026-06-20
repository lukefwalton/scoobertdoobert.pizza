import { audio } from '../audio/engine';
import { useAudioStore } from '../state/audioStore';
import { useMounted } from '../lib/useMounted';

// A small, period text toggle ("♪ music: on/off"). JavaScript-only — it never
// appears in the crawlable HTML, so no-JS visitors don't see a dead control.
export function MuteToggle() {
  const mounted = useMounted();
  const muted = useAudioStore((s) => s.muted);
  const toggleMute = useAudioStore((s) => s.toggleMute);

  if (!mounted) return null;

  return (
    <button
      type="button"
      className="mute-toggle"
      aria-pressed={!muted}
      onClick={() => {
        audio.unlock();
        toggleMute();
      }}
    >
      ♪ music: {muted ? 'off' : 'on'}
    </button>
  );
}
