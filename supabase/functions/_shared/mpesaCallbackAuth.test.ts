import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { authenticateCallback, withCallbackToken } from './mpesaCallbackAuth.ts';

function withEnv(env: Record<string, string | undefined>, fn: () => void) {
  const keys = Object.keys(env);
  const previous = keys.map((k) => Deno.env.get(k));
  keys.forEach((k) => env[k] === undefined ? Deno.env.delete(k) : Deno.env.set(k, env[k]!));
  try { fn(); } finally {
    keys.forEach((k, i) => previous[i] === undefined ? Deno.env.delete(k) : Deno.env.set(k, previous[i]!));
  }
}

const req = (qs = '') => new Request(`https://x.test/functions/v1/mpesa-callback${qs}`, { method: 'POST' });

Deno.test('secret set: valid token passes even when IP is not allowlisted', () => {
  withEnv({ MPESA_CALLBACK_SECRET: 's3cret', MPESA_ENVIRONMENT: 'production' }, () => {
    assertEquals(authenticateCallback(req('?token=s3cret'), false), { ok: true, via: 'token' });
  });
});

Deno.test('secret set: missing or wrong token fails even from an allowlisted IP', () => {
  withEnv({ MPESA_CALLBACK_SECRET: 's3cret', MPESA_ENVIRONMENT: 'production' }, () => {
    assertEquals(authenticateCallback(req(), true), { ok: false, reason: 'bad_token' });
    assertEquals(authenticateCallback(req('?token=s3cre'), true), { ok: false, reason: 'bad_token' });
    assertEquals(authenticateCallback(req('?token=s3cretx'), true), { ok: false, reason: 'bad_token' });
  });
});

Deno.test('no secret: production fails closed, sandbox falls back to IP', () => {
  withEnv({ MPESA_CALLBACK_SECRET: undefined, MPESA_ENVIRONMENT: 'production' }, () => {
    assertEquals(authenticateCallback(req(), true), { ok: false, reason: 'secret_not_configured' });
  });
  withEnv({ MPESA_CALLBACK_SECRET: undefined, MPESA_ENVIRONMENT: 'sandbox' }, () => {
    assertEquals(authenticateCallback(req(), true), { ok: true, via: 'sandbox-ip' });
    assertEquals(authenticateCallback(req(), false), { ok: false, reason: 'ip_not_allowed' });
  });
});

Deno.test('withCallbackToken appends the secret, preserving existing query', () => {
  withEnv({ MPESA_CALLBACK_SECRET: 's3cret' }, () => {
    assertEquals(withCallbackToken('https://x.test/cb'), 'https://x.test/cb?token=s3cret');
    assertEquals(withCallbackToken('https://x.test/cb?a=1'), 'https://x.test/cb?a=1&token=s3cret');
  });
  withEnv({ MPESA_CALLBACK_SECRET: undefined }, () => {
    assertEquals(withCallbackToken('https://x.test/cb'), 'https://x.test/cb');
  });
});
