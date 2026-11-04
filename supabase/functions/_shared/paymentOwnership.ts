import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

export interface PaymentOwner {
  kind: 'checkout' | 'c2b';
  landlordId: string;
  houseId?: string | null;
  tenantId?: string | null;
  expectedAmount?: number;
}

export async function resolvePaymentOwner(
  supabase: Pick<SupabaseClient, 'from'>,
  input: { shortcode?: string; checkoutId?: string },
): Promise<PaymentOwner | null> {
  if (input.checkoutId) {
    const { data, error } = await supabase.from('rent_mpesa_requests')
      .select('landlord_id, house_id, tenant_id, amount')
      .eq('checkout_request_id', input.checkoutId).maybeSingle();
    if (error || !data) return null;
    return {
      kind: 'checkout', landlordId: data.landlord_id, houseId: data.house_id, tenantId: data.tenant_id,
      expectedAmount: Number(data.amount),
    };
  }
  if (!input.shortcode || !/^\d{4,10}$/.test(input.shortcode)) return null;
  const { data, error } = await supabase.from('payment_sources')
    .select('landlord_id').eq('is_active', true)
    .or(`paybill_number.eq.${input.shortcode},till_number.eq.${input.shortcode}`).limit(2);
  if (error || !data || data.length !== 1) return null;
  return { kind: 'c2b', landlordId: data[0].landlord_id };
}
