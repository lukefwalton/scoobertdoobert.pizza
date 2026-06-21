import { put } from '@vercel/blob';
import type { IncomingMessage, ServerResponse } from 'node:http';

// Local stand-ins for @vercel/node's request/response types. We dropped the
// @vercel/node devDependency: it was used here for types ONLY, yet pulled in a
// pile of dev/build-time CVEs (undici, path-to-regexp, minimatch, ajv, …).
// Vercel still provides the real runtime for this function at deploy; these
// types just describe the handful of fields/methods this handler touches.
type VercelRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[]>;
  cookies?: Record<string, string>;
};
type VercelResponse = ServerResponse & {
  status: (statusCode: number) => VercelResponse;
  json: (jsonBody: unknown) => VercelResponse;
  send: (body: unknown) => VercelResponse;
};

// Email opt-in capture -> Vercel Blob. The order form is theatrical, but if the
// visitor types an email AND ticks the opt-in box, we store it. Only then.
//
// SETUP: needs a Blob store connected to the Vercel project (it injects
// BLOB_READ_WRITE_TOKEN). Each subscriber is one small JSON blob written with
// access:'private' — it is NOT reachable by URL, only via an authenticated
// read with the store token. (Earlier this used access:'public', which would
// have made subscriber emails publicly addressable; private is the correct
// home for PII.)
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

  // Honeypot: a hidden field no human ever fills. Form-spam bots fill every
  // input, so a non-empty value means a bot — drop it silently (a 200 that
  // looks identical to success, so the bot learns nothing). Not a substitute
  // for real rate limiting (which needs durable infra like Vercel KV/Upstash),
  // but it turns away the cheap automated stuff with zero infrastructure.
  if (String(body.website ?? '').trim() !== '') {
    res.status(200).json({ ok: true, stored: false });
    return;
  }

  const email = String(body.email ?? '')
    .trim()
    .slice(0, 254);
  const cheese = String(body.cheese ?? '')
    .trim()
    .slice(0, 40);
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
      { access: 'private', addRandomSuffix: false, contentType: 'application/json' },
    );
    res.status(200).json({ ok: true, stored: true });
  } catch (err) {
    // Storage failures must never break the front door / descent — but DO log
    // server-side (Vercel captures function logs) so a broken/absent Blob store
    // is detectable instead of silently dropping every signup.
    console.error('[api/order] blob write failed:', err);
    res.status(200).json({ ok: false, stored: false, error: 'store_failed' });
  }
}
