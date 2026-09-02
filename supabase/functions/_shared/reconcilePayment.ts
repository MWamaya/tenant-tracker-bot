// supabase/functions/_shared/reconcilePayment.ts
import { updateHouseBalance } from './paymentMatching.ts';

export class ReconcileError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export interface ReconcileRequest {
  type: 'payment' | 'email_log';
  id: string;
  houseId: string;
}

// Manually attaches an unmatched/partially-matched payment (or a fully
// unmatched email_log that never got a payment created for it at all) to a
// house the landlord picks themselves. The house's current tenant (if any)
// is attached alongside it — reconciling "to a house" implies reconciling
// to whoever lives there now, not to a tenant chosen independently.
export async function reconcilePayment(
  // deno-lint-ignore no-explicit-any
  supabase: any,
  landlordId: string,
  request: ReconcileRequest,
): Promise<{ payment: Record<string, unknown> }> {
  const { type, id, houseId } = request;

  if (type !== 'payment' && type !== 'email_log') {
    throw new ReconcileError(400, 'type must be "payment" or "email_log"');
  }
  if (!id || !houseId) {
    throw new ReconcileError(400, 'id and houseId are required');
  }

  const { data: house } = await supabase
    .from('houses')
    .select('id, expected_rent')
    .eq('id', houseId)
    .eq('landlord_id', landlordId)
    .maybeSingle();

  if (!house) {
    throw new ReconcileError(404, 'House not found');
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id')
    .eq('house_id', houseId)
    .maybeSingle();
  const tenantId: string | null = tenant?.id ?? null;

  if (type === 'payment') {
    const { data: payment } = await supabase
      .from('payments')
      .select('id, amount')
      .eq('id', id)
      .eq('landlord_id', landlordId)
      .maybeSingle();

    if (!payment) {
      throw new ReconcileError(404, 'Payment not found');
    }

    const { data: updated, error } = await supabase
      .from('payments')
      .update({ house_id: houseId, tenant_id: tenantId })
      .eq('id', id)
      .select()
      .single();

    if (error || !updated) {
      throw new ReconcileError(500, error?.message ?? 'Failed to update payment');
    }

    await updateHouseBalance(supabase, landlordId, houseId, payment.amount);
    return { payment: updated };
  }

  // type === 'email_log'
  const { data: emailLog } = await supabase
    .from('email_logs')
    .select('id, parsed_amount, parsed_mpesa_ref, parsed_date, parsed_tenant_name')
    .eq('id', id)
    .eq('landlord_id', landlordId)
    .is('payment_id', null)
    .maybeSingle();

  if (!emailLog) {
    throw new ReconcileError(404, 'Email log not found or already reconciled');
  }
  if (!emailLog.parsed_amount || !emailLog.parsed_mpesa_ref) {
    throw new ReconcileError(400, 'Email log is missing amount or reference and cannot be reconciled');
  }

  const { data: payment, error: insertError } = await supabase
    .from('payments')
    .insert({
      landlord_id: landlordId,
      house_id: houseId,
      tenant_id: tenantId,
      amount: emailLog.parsed_amount,
      mpesa_ref: emailLog.parsed_mpesa_ref,
      payment_date: emailLog.parsed_date || new Date().toISOString(),
      sender_name: emailLog.parsed_tenant_name,
      payment_source: 'email',
    })
    .select()
    .single();

  if (insertError || !payment) {
    throw new ReconcileError(500, insertError?.message ?? 'Failed to create payment');
  }

  const { error: updateError } = await supabase
    .from('email_logs')
    .update({ status: 'processed', payment_id: payment.id })
    .eq('id', id);

  if (updateError) {
    throw new ReconcileError(500, updateError.message);
  }

  await updateHouseBalance(supabase, landlordId, houseId, emailLog.parsed_amount);
  return { payment };
}
