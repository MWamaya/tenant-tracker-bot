import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

let handler: (req: Request) => Response | Promise<Response>;
const originalServe = Deno.serve;
Deno.serve = ((callback: typeof handler) => { handler = callback; return {}; }) as typeof Deno.serve;
try { await import('./index.ts'); } finally { Deno.serve = originalServe; }

const stkPayload = {
  Body: { stkCallback: {
    CheckoutRequestID: 'checkout-unknown', MerchantRequestID: 'merchant', ResultCode: 0, ResultDesc: 'Success',
    CallbackMetadata: { Item: [
      { Name: 'PhoneNumber', Value: '254712345678' }, { Name: 'MpesaReceiptNumber', Value: 'ABC123DEF4' }, { Name: 'Amount', Value: 10000 },
    ] },
  } },
};

for (const scenario of ['unknown-shortcode', 'unknown-checkout', 'completed-subscription', 'mapped-checkout', 'amount-mismatch', 'deleted-target', 'mapped-target']) {
  Deno.test(`callback ${scenario} uses only recorded ownership`, async () => {
    const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
    const previous = keys.map((key) => Deno.env.get(key));
    Deno.env.set(keys[0], 'https://local-payment-test.invalid');
    Deno.env.set(keys[1], 'test-service');
    const originalFetch = globalThis.fetch;
    const financialWrites: string[] = [];
    globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(String(input));
      const table = url.pathname.split('/').pop();
      const method = init?.method ?? 'GET';
      if (method === 'POST' && ['mpesa_transactions', 'payments'].includes(table ?? '')) financialWrites.push(table!);
      if (table === 'webhooks_log') return Promise.resolve(Response.json(method === 'POST' ? { id: 'log-1' } : null));
      if (table === 'subscription_mpesa_requests') return Promise.resolve(Response.json(
        scenario === 'completed-subscription' && !url.searchParams.has('status')
          ? { id: 'sub-1', landlord_id: 'landlord-1', status: 'completed' } : null,
      ));
      if (table === 'rent_mpesa_requests') return Promise.resolve(Response.json(
        ['mapped-checkout', 'amount-mismatch', 'deleted-target', 'mapped-target'].includes(scenario) ? { landlord_id: 'landlord-1', house_id: scenario === 'mapped-target' ? 'target-house' : null, tenant_id: scenario === 'mapped-target' ? 'target-tenant' : null, amount: scenario === 'amount-mismatch' ? 1 : 10000 } : null,
      ));
      if (table === 'houses' && scenario === 'mapped-target') return Promise.resolve(Response.json({ id: 'target-house', expected_rent: 10000 }));
      if (table === 'tenants' && scenario === 'mapped-target') return Promise.resolve(Response.json({ id: 'target-tenant', phone: '254700000000' }));
      if (table === 'payments' && method === 'POST' && scenario === 'mapped-target') {
        const row = JSON.parse(String(init?.body));
        assertEquals([row.landlord_id, row.house_id, row.tenant_id], ['landlord-1', 'target-house', 'target-tenant']);
      }
      if (table === 'tenants' && scenario === 'deleted-target') return Promise.resolve(Response.json({ id: 'replacement-tenant', house_id: 'replacement-house', phone: '0712345678' }));
      if (table === 'houses' && scenario === 'deleted-target') return Promise.resolve(Response.json({ id: 'replacement-house', expected_rent: 10000 }));
      if (table === 'profiles') return Promise.resolve(Response.json({ id: 'first-active-landlord' }));
      if (table === 'mpesa_transactions' && method === 'POST') return Promise.resolve(Response.json({ ...JSON.parse(String(init?.body)), id: 'tx-1' }));
      return Promise.resolve(Response.json(null));
    }) as typeof fetch;
    try {
      const payload = scenario === 'unknown-shortcode' ? {
        TransID: 'ABC123DEF4', TransAmount: '10000', BusinessShortCode: '999999',
        BillRefNumber: 'A1', MSISDN: '254712345678', TransTime: '20261103100000',
      } : stkPayload;
      const response = await handler(new Request('http://localhost', {
        method: 'POST', headers: { 'x-forwarded-for': '196.201.214.10' }, body: JSON.stringify(payload),
      }));
      assertEquals(response.status, 200);
      assertEquals(financialWrites, scenario === 'mapped-target' ? ['mpesa_transactions', 'payments'] : ['mapped-checkout', 'deleted-target'].includes(scenario) ? ['mpesa_transactions'] : []);
    } finally {
      globalThis.fetch = originalFetch;
      keys.forEach((key, index) => previous[index] === undefined ? Deno.env.delete(key) : Deno.env.set(key, previous[index]!));
    }
  });
}
