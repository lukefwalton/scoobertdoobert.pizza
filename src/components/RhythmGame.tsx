import { useEffect } from 'react';
import { useRhythmStore, type Dir } from '../state/rhythmStore';
import { rewardDance } from '../lib/danceAlong';
import { audio } from '../audio/engine';
import { noteToFreq } from '../lib/chimes';
import { exposeTestGlobal } from '../lib/testHooks';

// The dance rhythm minigame overlay (Commit C). Watches the rhythmStore state
// machine: in 'demo' it ticks the wanderer's move sequence (one lit beat at a
// time, with a soft chime), then hands you the input; in 'input' it shows your
// progress; on 'win' it pays out (rewardDance) and closes. Arrow-key input is
// captured in WorldHud (where movement is frozen). Gentle + WCAG-safe, no flash,
// a miss just resets with no penalty.

const ARROW: Record<Dir, string> = { up: '↑', down: '↓', left: '←', right: '→' };
const NOTE: Record<Dir, [string, number]> = {
  up: ['E', 5],
  down: ['C', 5],
  left: ['G', 4],
  right: ['A', 5],
};

export function RhythmGame() {
  const active = useRhythmStore((s) => s.active);
  const phase = useRhythmStore((s) => s.phase);
  const seq = useRhythmStore((s) => s.seq);
  const step = useRhythmStore((s) => s.step);
  const miss = useRhythmStore((s) => s.miss);
  const label = useRhythmStore((s) => s.label);
  const entityId = useRhythmStore((s) => s.entityId);

  // Expose the target sequence for the smoke (test entrances only) so it can play
  // the minigame deterministically instead of guessing the random beats.
  useEffect(() => {
    exposeTestGlobal('__sdpRhythmSeq', active ? seq : undefined);
    return () => exposeTestGlobal('__sdpRhythmSeq', undefined);
  }, [active, seq]);

  // DEMO: light each beat in turn (~650ms), chime it, then hand over to input.
  useEffect(() => {
    if (!active || phase !== 'demo') return;
    const st = useRhythmStore.getState();
    // chime the currently-lit beat
    if (seq[step]) {
      const [n, o] = NOTE[seq[step]];
      audio.playChime(noteToFreq(n, o), 0, 0.12, 0.6);
    }
    const t = window.setTimeout(() => {
      if (step + 1 < st.seq.length) useRhythmStore.getState().setStep(step + 1);
      else window.setTimeout(() => useRhythmStore.getState().beginInput(), 450);
    }, 650);
    return () => window.clearTimeout(t);
  }, [active, phase, step, seq]);

  // WIN: a bright flourish + the reward, then close.
  useEffect(() => {
    if (!active || phase !== 'win') return;
    audio.playChime(noteToFreq('C', 6), 0, 0.14, 1.2);
    audio.playChime(noteToFreq('G', 6), 0.15, 0.12, 1.4);
    if (entityId) rewardDance(entityId, label);
    const t = window.setTimeout(() => useRhythmStore.getState().close(), 1100);
    return () => window.clearTimeout(t);
  }, [active, phase, entityId, label]);

  if (!active) return null;

  return (
    <div className="hud-rhythm" role="dialog" aria-label="dance minigame">
      <div className="hud-rhythm__card window">
        <div className="title-bar">
          <div className="title-bar-text">💃 dance with {label}</div>
        </div>
        <div className="window-body">
          <p className="hud-rhythm__cue">
            {phase === 'demo'
              ? 'Watch the moves…'
              : phase === 'win'
                ? '✓ nice moves!'
                : 'Your turn, copy it (arrow keys)'}
          </p>
          <div className={`hud-rhythm__seq${miss ? ' is-miss' : ''}`} key={miss}>
            {seq.map((d, i) => {
              const lit = phase === 'demo' ? i === step : phase === 'win' ? true : i < step;
              const cur = phase === 'input' && i === step;
              return (
                <span
                  key={i}
                  className={'hud-rhythm__beat' + (lit ? ' is-lit' : '') + (cur ? ' is-cur' : '')}
                  aria-hidden="true"
                >
                  {ARROW[d]}
                </span>
              );
            })}
          </div>
          <p className="hud-rhythm__hint">Esc to step away</p>
        </div>
      </div>
    </div>
  );
}
