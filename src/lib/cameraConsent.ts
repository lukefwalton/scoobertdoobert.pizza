// Session-scoped memory of the Pizza Cam™ opt-in, mirroring motionConsent:
// sessionStorage on purpose — camera consent is for THIS visit, and a fresh
// visit re-asks, which is the only sane default for a sensor. (The browser's
// own permission persistence layers underneath; this flag is the SITE's
// question, not the browser's.)
//
// Tri-state, and "armed" is NOT "camera on": arming just pre-answers the
// booth's consent gate (from the boot screen's PIZZA CAM line or the gate
// itself). getUserMedia only ever fires inside the booth, at the moment of
// use, with the CAMERA ON indicator on screen — see DESIGN.md "Webcam policy".
// All access try/guarded (Safari private mode / disabled storage throws).

const KEY = 'sdp:camera-choice';

export type CameraChoice = 'armed' | 'declined' | null;

export function getCameraChoice(): CameraChoice {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const v = sessionStorage.getItem(KEY);
    return v === 'armed' || v === 'declined' ? v : null;
  } catch {
    return null;
  }
}

export function armCamera(): void {
  try {
    sessionStorage?.setItem(KEY, 'armed');
  } catch {
    /* storage unavailable — the booth gate just asks again, which is safe */
  }
}

export function declineCamera(): void {
  try {
    sessionStorage?.setItem(KEY, 'declined');
  } catch {
    /* storage unavailable — the boot line may re-offer next visit; harmless */
  }
}
