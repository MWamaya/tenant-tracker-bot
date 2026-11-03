import { assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { resolvePaymentOwner } from './paymentOwnership.ts';

function client(rows: unknown) {
  return createClient('https://local-payment-test.invalid', 'test-key', {
    global: { fetch: () => Promise.resolve(Response.json(rows)) },
  });
}

Deno.test('C2B ownership requires exactly one configured active source', async () => {
  assertEquals(await resolvePaymentOwner(client([]), { shortcode: '999999' }), null);
  assertEquals(await resolvePaymentOwner(client([{ landlord_id: 'l1' }, { landlord_id: 'l2' }]), { shortcode: '123456' }), null);
  assertEquals(await resolvePaymentOwner(client([{ landlord_id: 'l1' }]), { shortcode: '123456' }), { landlordId: 'l1' });
  assertEquals(await resolvePaymentOwner(client([{ landlord_id: 'l1' }]), {}), null);
});

Deno.test('STK ownership comes from stored checkout identity', async () => {
  assertEquals(await resolvePaymentOwner(client(null), { checkoutId: 'unknown' }), null);
  assertEquals(await resolvePaymentOwner(client({ landlord_id: 'l2', house_id: 'h2', tenant_id: 't2', amount: 10000 }), {
    checkoutId: 'known',
  }), { landlordId: 'l2', houseId: 'h2', tenantId: 't2', expectedAmount: 10000 });
});
