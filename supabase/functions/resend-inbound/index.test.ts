import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

let handler: (req: Request) => Response | Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((callback: typeof handler) => { handler = callback; return {}; }) as typeof Deno.serve;
try { await import('./index.ts'); } finally { Deno.serve = originalServe; }

for (const scenario of ['forwarded-bank', 'forged-branding', 'invalid-signature', 'storage-failure']) {
  Deno.test(`inbound email ${scenario} never posts money automatically`, async () => {
    const env = {
      SUPABASE_URL: 'https://local-email-test.invalid', SUPABASE_SERVICE_ROLE_KEY: 'service',
      RESEND_API_KEY: 'test', RESEND_WEBHOOK_SECRET: `whsec_${btoa('test-webhook-secret')}`,
    };
    const previous = Object.fromEntries(Object.keys(env).map((key) => [key, Deno.env.get(key)]));
    Object.entries(env).forEach(([key, value]) => Deno.env.set(key, value));
    const originalFetch = globalThis.fetch;
    const evidence: Record<string, unknown>[] = [];
    const writes: string[] = [];
    let emailFetches = 0;
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop();
      const method = init?.method ?? 'GET';
      if (url.hostname === 'api.resend.com') {
        emailFetches++;
        return Promise.resolve(Response.json({ text: `From: ${scenario === 'forged-branding' ? 'attacker@evil.com' : 'alerts@ncbagroup.com'}\nNCBA\nYou have received KES 5,000 from JANE DOE for 212245 A12 on 20/07/2026 09:14 AM. M-Pesa Ref: QAB1CD2EF3` }));
      }
      if (['POST', 'PATCH'].includes(method) && ['payments', 'houses', 'tenants'].includes(table ?? '')) writes.push(table!);
      if (table === 'webhooks_log') return Promise.resolve(Response.json(method === 'POST' ? { id: 'webhook-1' } : null));
      if (table === 'profiles') return Promise.resolve(Response.json({ id: 'landlord-1' }));
      if (table === 'email_logs' && method === 'POST') {
        evidence.push(JSON.parse(String(init?.body)));
        if (scenario === 'storage-failure') return Promise.resolve(Response.json({ message: 'Database unavailable', code: 'XX000' }, { status: 500 }));
        return Promise.resolve(Response.json({ id: 'email-1' }));
      }
      if (table === 'houses' && method === 'GET') return Promise.resolve(Response.json({ id: 'house-1', expected_rent: 5000 }));
      if (table === 'payments' && method === 'POST') return Promise.resolve(Response.json({ id: 'payment-1' }));
      return Promise.resolve(Response.json(null));
    }) as typeof fetch;
    try {
      const body = JSON.stringify({ type: 'email.received', data: { email_id: 'email-1', from: 'forwarder@example.com', to: ['landlord@kodipap.com'], subject: 'Bank receipt' } });
      const id = 'msg_1';
      const timestamp = String(Math.floor(Date.now() / 1000));
      const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('test-webhook-secret'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${body}`)));
      const signature = btoa(String.fromCharCode(...bytes));
      const response = await handler(new Request('http://localhost', {
        method: 'POST', headers: { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${scenario === 'invalid-signature' ? 'invalid' : signature}` }, body,
      }));
      assertEquals(response.status, scenario === 'invalid-signature' ? 401 : scenario === 'storage-failure' ? 503 : 200);
      assertEquals(writes, []);
      assertEquals(emailFetches, scenario === 'invalid-signature' ? 0 : 1);
      if (scenario !== 'invalid-signature') {
        assertEquals(evidence.length, 1);
        assertEquals(evidence[0].status, 'pending');
        assertEquals(evidence[0].parsed_amount, 5000);
      }
    } finally {
      globalThis.fetch = originalFetch;
      Object.entries(previous).forEach(([key, value]) => value === undefined ? Deno.env.delete(key) : Deno.env.set(key, value));
    }
  });
}
