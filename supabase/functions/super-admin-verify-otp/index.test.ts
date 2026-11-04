import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

let handler: (req: Request) => Response | Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((callback: typeof handler) => { handler = callback; return {}; }) as typeof Deno.serve;
try { await import('./index.ts'); } finally { Deno.serve = originalServe; }

Deno.test('OTP verification requires an authenticated session, not an email address', async () => {
  const response = await handler(new Request('http://localhost', {
    method: 'POST', body: JSON.stringify({ email: 'admin@example.com', code: '123456' }),
  }));
  assertEquals(response.status, 401);
});

Deno.test('OTP grant uses verified identity and current session, ignoring supplied email', async () => {
  const userId = '00000000-0000-0000-0000-000000000001';
  const sessionId = '10000000-0000-0000-0000-000000000001';
  const env = {
    SUPABASE_URL: 'https://local-security-test.invalid', SUPABASE_ANON_KEY: 'test-anon',
    SUPABASE_SERVICE_ROLE_KEY: 'test-service',
  };
  const previousEnv = Object.fromEntries(Object.keys(env).map((key) => [key, Deno.env.get(key)]));
  for (const [key, value] of Object.entries(env)) Deno.env.set(key, value);
  const originalFetch = globalThis.fetch;
  const grants: Record<string, string>[] = [];
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    if (String(input).includes('/auth/v1/user')) return Promise.resolve(Response.json({ id: userId }));
    if (String(input).includes('/rpc/verify_super_admin_otp')) {
      grants.push(JSON.parse(String(init?.body)));
      return Promise.resolve(Response.json(true));
    }
    throw new Error(`Unexpected request: ${input}`);
  }) as typeof fetch;
  try {
    const claims = btoa(JSON.stringify({ sub: userId, session_id: sessionId }));
    const response = await handler(new Request('http://localhost', {
      method: 'POST', headers: { Authorization: `Bearer header.${claims}.signature` },
      body: JSON.stringify({ email: 'other-admin@example.com', code: '123456' }),
    }));
    assertEquals(response.status, 200);
    assertEquals(grants[0]?.p_user_id, userId);
    assertEquals(grants[0]?.p_session_id, sessionId);
    assertEquals(grants[0]?.p_code_hash, '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92');
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) Deno.env.delete(key); else Deno.env.set(key, value);
    }
  }
});
