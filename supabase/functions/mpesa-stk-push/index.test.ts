import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

let handler: (req: Request) => Response | Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((callback: typeof handler) => { handler = callback; return {}; }) as typeof Deno.serve;
try { await import('./index.ts'); } finally { Deno.serve = originalServe; }

for (const scenario of ['foreign-house', 'owned-house', 'invalid-amount']) {
  Deno.test(`rent checkout ${scenario} validates ownership and records callback identity`, async () => {
    const env: Record<string, string> = {
      SUPABASE_URL: 'https://local-payment-test.invalid', SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'service',
      MPESA_CONSUMER_KEY: 'test', MPESA_CONSUMER_SECRET: 'test', MPESA_SHORTCODE: '123456', MPESA_PASSKEY: 'test',
      MPESA_ENVIRONMENT: 'sandbox',
    };
    const oldEnv = Object.fromEntries(Object.keys(env).map((key) => [key, Deno.env.get(key)]));
    Object.entries(env).forEach(([key, value]) => Deno.env.set(key, value));
    const originalFetch = globalThis.fetch;
    const stored: Record<string, unknown>[] = [];
    let pushes = 0;
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return Promise.resolve(Response.json({ id: 'landlord-1' }));
      if (url.includes('/oauth/')) return Promise.resolve(Response.json({ access_token: 'test-token' }));
      if (url.includes('/processrequest')) {
        pushes++;
        return Promise.resolve(Response.json({ CheckoutRequestID: 'checkout-1', ResponseCode: '0' }));
      }
      if (url.includes('/houses')) return Promise.resolve(Response.json(scenario === 'foreign-house' ? null : { id: 'house-1', house_no: 'A1' }));
      if (url.includes('/tenants')) return Promise.resolve(Response.json(null));
      if (url.includes('/rent_mpesa_requests')) stored.push(JSON.parse(String(init?.body)));
      return Promise.resolve(Response.json(null));
    }) as typeof fetch;
    try {
      const response = await handler(new Request('http://localhost', {
        method: 'POST', headers: { Authorization: 'Bearer landlord-session' },
        body: JSON.stringify({ phone_number: '0712345678', amount: scenario === 'invalid-amount' ? -1 : 10000, account_reference: 'A1', house_id: 'house-1' }),
      }));
      assertEquals(response.status, scenario === 'foreign-house' ? 404 : scenario === 'invalid-amount' ? 400 : 200);
      assertEquals(pushes, scenario === 'owned-house' ? 1 : 0);
      assertEquals(stored, scenario === 'owned-house' ? [{
        landlord_id: 'landlord-1', house_id: 'house-1', tenant_id: null,
        checkout_request_id: 'checkout-1', account_reference: 'A1', amount: 10000,
      }] : []);
    } finally {
      globalThis.fetch = originalFetch;
      Object.entries(oldEnv).forEach(([key, value]) => value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value));
    }
  });
}
