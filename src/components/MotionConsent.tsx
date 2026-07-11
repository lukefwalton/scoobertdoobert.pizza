import { useRef } from 'react';
import { useModalFocus } from '../lib/useModalFocus';
import { TEXT_ONLY_PATH } from '../data/links';
import '../styles/motion-consent.css';

// The reduced-motion opt-in. Small screens now run the 3D world outright, but a
// `prefers-reduced-motion` user is never AUTO-dropped into it — the world is full
// of camera motion. Instead an entry point (OrderForm / MachineRoomFloor) pauses
// here to ASK, with the flat /text list as the safe default. Opting in is
// remembered for the session (see lib/motionConsent) so it asks once. Motion is
// still softened INSIDE the world (the REDUCED caps in Controls/WorldHud/dread),
// so "enter anyway" means "let me in," not "unleash full motion."
//
// A standard, WCAG-friendly pattern: consent, not surprise. Rendered with 98.css
// window chrome to stay in period.
export function MotionConsent({
  open,
  onEnter,
  onClose,
}: {
  open: boolean;
  onEnter: () => void;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useModalFocus(ref, open, onClose);
  if (!open) return null;

  return (
    <div className="mcons-backdrop" onClick={onClose}>
      <div
        className="mcons window"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mcons-title"
        aria-describedby="mcons-body"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="title-bar">
          <div className="title-bar-text" id="mcons-title">
            &#9888; Motion ahead
          </div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={onClose} />
          </div>
        </div>
        <div className="window-body" id="mcons-body">
          <p>
            The 3D world has <b>camera motion</b> and, in its depths, occasional <b>flickering</b>.
            Your device asked for reduced motion, so we stopped here first.
          </p>
          <p className="mcons-soft">
            Motion is kept gentler for you inside, but if you&rsquo;d rather not, the flat text
            menu has every link, no motion at all.
          </p>
          <div className="mcons-actions">
            <button type="button" className="mcons-go" onClick={onEnter}>
              Enter the world anyway &#9654;
            </button>
            <a className="mcons-text" href={TEXT_ONLY_PATH}>
              Use the text menu &rarr;
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
