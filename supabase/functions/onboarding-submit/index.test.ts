import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
let handler: (req: Request) => Response | Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((callback: typeof handler) => { handler = callback; return {}; }) as typeof Deno.serve;
try { await import('./index.ts'); } finally { Deno.serve = originalServe; }
for (const billing of ['annual', 'monthly', undefined, 'weekly', null]) {
  Deno.test(`onboarding stores validated billing intent: ${billing}`, async () => {
    const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY'];
    const previous = keys.map(key => Deno.env.get(key));
    Deno.env.set(keys[0], 'https://local-onboarding-test.invalid'); Deno.env.set(keys[1], 'service'); Deno.env.delete(keys[2]);
    const originalFetch = globalThis.fetch;
    const rows: Record<string, unknown>[] = [];
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      assertEquals(new URL(String(input)).pathname, '/rest/v1/onboarding_requests');
      rows.push(JSON.parse(String(init?.body)));
      return Promise.resolve(Response.json(null));
    }) as typeof fetch;
    try {
      const response = await handler(new Request('http://localhost', { method: 'POST', body: JSON.stringify({
        fullName: 'Jane Wanjiru', phone: '0712345678', email: 'jane@example.com', plan: 'Starter',
        ...(billing === undefined ? {} : { billingPeriod: billing }),
      }) }));
      const valid = billing === undefined || billing === 'monthly' || billing === 'annual';
      assertEquals(response.status, valid ? 200 : 400);
      assertEquals(rows, valid ? [{ full_name: 'Jane Wanjiru', phone: '0712345678', email: 'jane@example.com', plan: 'Starter', billing_period: billing ?? 'monthly' }] : []);
    } finally {
      globalThis.fetch = originalFetch;
      keys.forEach((key, i) => previous[i] === undefined ? Deno.env.delete(key) : Deno.env.set(key, previous[i]!));
    }
  });
}
