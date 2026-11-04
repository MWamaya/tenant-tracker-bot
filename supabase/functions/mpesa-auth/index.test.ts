import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

let handler: (req: Request) => Response | Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((callback: typeof handler) => {
  handler = callback;
  return {};
}) as typeof Deno.serve;
try {
  await import('./index.ts');
} finally {
  Deno.serve = originalServe;
}

for (const method of ['GET', 'POST']) {
  Deno.test(`retired OAuth endpoint refuses ${method} without contacting Safaricom`, async () => {
    const originalFetch = globalThis.fetch;
    let outboundRequests = 0;
    globalThis.fetch = (() => {
      outboundRequests++;
      return Promise.resolve(Response.json({ access_token: 'must-never-escape', expires_in: '3600' }));
    }) as typeof fetch;
    try {
      const response = await handler(new Request('http://localhost/mpesa-auth', {
        method,
        headers: { apikey: 'public-key' },
      }));
      assertEquals(response.status, 410);
      assertEquals(await response.json(), { error: 'This endpoint has been retired.' });
      assertEquals(outboundRequests, 0);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
}
