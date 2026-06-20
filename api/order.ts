import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

// Email opt-in capture -> Vercel Blob. The order form is theatrical, but if the
// visitor types an email AND ticks the opt-in box, we store it. Only then.
//
// SETUP: needs a Blob store connected to the Vercel project (it injects
// BLOB_READ_WRITE_TOKEN). Each subscriber is one small JSON blob under a random,
// non-enumerable path. Blob objects are public-access, so for a real mailing
// list Vercel KV / a database is the safer home; this is a deliberately simple
// "just collect the emails" capture and is easy to swap.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false, error: 'method_not_allowed' });
    return;
  }

  let body: Record<string, unknown> = {};
  if (req.body && typeof req.body === 'object') {
    body = req.body as Record<string, unknown>;
  } else if (typeof req.body === 'string') {
    try {
      body = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      body = {};
    }
  }

  const email = String(body.email ?? '').trim().slice(0, 254);
  const cheese = String(body.cheese ?? '').trim().slice(0, 40);
  const optin = body.optin === true || body.optin === 'on' || body.optin === 'true';
  const validEmail = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);

  // No email or no consent -> store nothing, but don't error the UX.
  if (!validEmail || !optin) {
    res.status(200).json({ ok: true, stored: false });
    return;
  }

  try {
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await put(
      `subscribers/${id}.json`,
      JSON.stringify({ email, cheese, optin: true, ts: new Date().toISOString() }),
      { access: 'public', addRandomSuffix: false, contentType: 'application/json' },
    );
    res.status(200).json({ ok: true, stored: true });
  } catch {
    // Storage failures must never break the front door / descent.
    res.status(200).json({ ok: false, stored: false, error: 'store_failed' });
  }
}
