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

async function withStubbedFetch(
  responder: (table: string, method: string, url: URL, init?: RequestInit) => unknown,
  run: (calls: { table: string; method: string; body?: unknown }[]) => Promise<void>,
  env: Record<string, string> = {},
) {
  const keys = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', ...Object.keys(env)];
  const previous = keys.map((key) => Deno.env.get(key));
  Deno.env.set('SUPABASE_URL', 'https://local-payment-test.invalid');
  Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service');
  Object.entries(env).forEach(([k, v]) => Deno.env.set(k, v));
  const originalFetch = globalThis.fetch;
  const calls: { table: string; method: string; body?: unknown }[] = [];
  globalThis.fetch = ((input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const table = url.pathname.split('/').pop() ?? '';
    const method = init?.method ?? 'GET';
    calls.push({ table, method, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    return Promise.resolve(Response.json(responder(table, method, url, init)));
  }) as typeof fetch;
  try { await run(calls); } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, i) => previous[i] === undefined ? Deno.env.delete(key) : Deno.env.set(key, previous[i]!));
  }
}

const subscriptionCallback = (amount: number) => ({
  Body: { stkCallback: {
    CheckoutRequestID: 'checkout-sub', MerchantRequestID: 'merchant', ResultCode: 0, ResultDesc: 'Success',
    CallbackMetadata: { Item: [
      { Name: 'MpesaReceiptNumber', Value: 'SUB123DEF4' }, { Name: 'Amount', Value: amount },
    ] },
  } },
});

const pendingSubscription = { id: 'sub-1', landlord_id: 'landlord-1', plan_id: 'plan-1', months: 1, amount: 5000, status: 'pending' };

Deno.test('subscription callback with wrong amount does not activate and stays in operator queue', async () => {
  await withStubbedFetch(
    (table, method) => table === 'webhooks_log' ? (method === 'POST' ? { id: 'log-1' } : null)
      : table === 'subscription_mpesa_requests' ? pendingSubscription : null,
    async (calls) => {
      const response = await handler(new Request('http://localhost', {
        method: 'POST', headers: { 'x-forwarded-for': '196.201.214.10' }, body: JSON.stringify(subscriptionCallback(1)),
      }));
      assertEquals(response.status, 200);
      assertEquals(calls.some((c) => ['landlord_subscriptions', 'subscription_plans'].includes(c.table)), false);
      const logUpdate = calls.find((c) => c.table === 'webhooks_log' && c.method === 'PATCH');
      assertEquals((logUpdate?.body as { processed: boolean }).processed, false);
    },
  );
});

Deno.test('subscription callback that pays correctly but fails activation stays unprocessed', async () => {
  await withStubbedFetch(
    (table, method) => table === 'webhooks_log' ? (method === 'POST' ? { id: 'log-1' } : null)
      : table === 'subscription_mpesa_requests' ? pendingSubscription : null,
    async (calls) => {
      // subscription_plans lookup returns null -> .single() errors -> activation throws
      await handler(new Request('http://localhost', {
        method: 'POST', headers: { 'x-forwarded-for': '196.201.214.10' }, body: JSON.stringify(subscriptionCallback(5000)),
      }));
      const logUpdate = calls.filter((c) => c.table === 'webhooks_log' && c.method === 'PATCH').pop();
      assertEquals((logUpdate?.body as { processed: boolean }).processed, false);
    },
  );
});

Deno.test('with callback secret set, spoofed allowlisted IP without token is rejected before any processing', async () => {
  await withStubbedFetch(
    (table) => table === 'webhooks_log' ? { id: 'log-1' } : null,
    async (calls) => {
      const response = await handler(new Request('http://localhost/mpesa-callback', {
        method: 'POST', headers: { 'x-forwarded-for': '196.201.214.10' }, body: JSON.stringify(subscriptionCallback(5000)),
      }));
      assertEquals(response.status, 403);
      assertEquals(calls.every((c) => c.table === 'webhooks_log' && c.method === 'POST'), true);
      const logged = JSON.stringify(calls[0].body);
      assertEquals(logged.includes('x-forwarded-for'), false);
    },
    { MPESA_CALLBACK_SECRET: 's3cret' },
  );
});

Deno.test('with callback secret set, correct token is accepted regardless of IP', async () => {
  await withStubbedFetch(
    (table, method) => table === 'webhooks_log' ? (method === 'POST' ? { id: 'log-1' } : null) : null,
    async () => {
      const response = await handler(new Request('http://localhost/mpesa-callback?token=s3cret', {
        method: 'POST', body: JSON.stringify({ Unknown: true }),
      }));
      assertEquals(response.status, 200);
    },
    { MPESA_CALLBACK_SECRET: 's3cret' },
  );
});
