import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

type Handler = (req: Request) => Response | Promise<Response>;
const handlers: Record<string, Handler> = {};
for (const name of ['admin-create-landlord', 'admin-create-superadmin', 'admin-delete-landlord', 'mpesa-c2b-register']) {
  const originalServe = Deno.serve;
  Deno.serve = ((handler: Handler) => {
    handlers[name] = handler;
    return {};
  }) as typeof Deno.serve;
  try {
    await import(`./${name}/index.ts`);
  } finally {
    Deno.serve = originalServe;
  }
}

for (const [name, handler] of Object.entries(handlers)) {
  Deno.test(`${name} denies a password-only session even when user has admin role`, async () => {
    Deno.env.set('SUPABASE_URL', 'https://local-security-test.invalid');
    Deno.env.set('SUPABASE_ANON_KEY', 'test-anon');
    Deno.env.set('SUPABASE_SERVICE_ROLE_KEY', 'test-service');
    const originalFetch = globalThis.fetch;
    globalThis.fetch = ((input: string | URL | Request) => {
      const url = String(input);
      if (url.includes('/auth/v1/user')) return Promise.resolve(Response.json({
        id: '00000000-0000-0000-0000-000000000001', email: 'admin@example.com',
      }));
      if (url.includes('/rpc/has_role')) return Promise.resolve(Response.json(false));
      if (url.includes('/user_roles')) return Promise.resolve(Response.json([{ role: 'SUPER_ADMIN' }]));
      throw new Error(`Unexpected privileged request: ${url}`);
    }) as typeof fetch;
    try {
      const response = await handler(new Request(`https://local-security-test.invalid/${name}`, {
        method: 'POST', headers: { Authorization: 'Bearer password-session' }, body: '{}',
      }));
      assertEquals(response.status, 403);
    } finally {
      globalThis.fetch = originalFetch;
      for (const key of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY']) Deno.env.delete(key);
    }
  });
}
