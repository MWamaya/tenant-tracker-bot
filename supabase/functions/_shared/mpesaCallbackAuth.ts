// Shared-secret auth for the public M-Pesa callback endpoint.
//
// mpesa-callback runs with verify_jwt = false, and the caller IP (taken from
// forwarded headers) can be spoofed, so the URL registered with Safaricom
// carries a secret token that only we and Safaricom know.

const TOKEN_PARAM = 'token';

/** Appends the callback secret to a URL we hand to Safaricom. No-op if unset. */
export function withCallbackToken(url: string): string {
  const secret = Deno.env.get('MPESA_CALLBACK_SECRET');
  if (!secret) return url;
  const parsed = new URL(url);
  parsed.searchParams.set(TOKEN_PARAM, secret);
  return parsed.toString();
}

function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const x = enc.encode(a);
  const y = enc.encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

export type CallbackAuthResult =
  | { ok: true; via: 'token' | 'sandbox-ip' }
  | { ok: false; reason: 'bad_token' | 'secret_not_configured' | 'ip_not_allowed' };

/**
 * With MPESA_CALLBACK_SECRET set the token is authoritative. Without it,
 * production fails closed; sandbox falls back to the (spoofable) IP check
 * so local development keeps working.
 */
export function authenticateCallback(
  req: Request,
  ipAllowed: boolean,
): CallbackAuthResult {
  const secret = Deno.env.get('MPESA_CALLBACK_SECRET');
  if (secret) {
    const provided = new URL(req.url).searchParams.get(TOKEN_PARAM) ?? '';
    return timingSafeEqual(provided, secret) ? { ok: true, via: 'token' } : { ok: false, reason: 'bad_token' };
  }
  if ((Deno.env.get('MPESA_ENVIRONMENT') || 'sandbox') !== 'sandbox') {
    return { ok: false, reason: 'secret_not_configured' };
  }
  return ipAllowed ? { ok: true, via: 'sandbox-ip' } : { ok: false, reason: 'ip_not_allowed' };
}
