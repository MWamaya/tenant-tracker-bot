// Mirrors the super-admin "assign subscription" flow (src/hooks/useSuperAdminData.ts
// useAssignSubscription) so a landlord's own M-Pesa payment activates their
// account the same way an admin manually assigning a plan does.

export async function activateLandlordSubscription(
  supabase: any,
  params: {
    landlordId: string;
    planId: string;
    paymentReference: string;
    amountPaid: number;
  },
) {
  const { landlordId, planId, paymentReference, amountPaid } = params;

  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + plan.duration_days);

  // A landlord should only ever have one active subscription.
  const { error: cancelError } = await supabase
    .from('landlord_subscriptions')
    .update({ status: 'cancelled' })
    .eq('landlord_id', landlordId)
    .eq('status', 'active');

  if (cancelError) throw cancelError;

  const { data: subscription, error: subError } = await supabase
    .from('landlord_subscriptions')
    .insert({
      landlord_id: landlordId,
      plan_id: planId,
      status: 'active',
      start_date: startDate.toISOString(),
      end_date: endDate.toISOString(),
      payment_reference: paymentReference,
      amount_paid: amountPaid,
    })
    .select()
    .single();

  if (subError) throw subError;

  const { error: statusError } = await supabase
    .from('profiles')
    .update({ account_status: 'active' })
    .eq('id', landlordId);

  if (statusError) throw statusError;

  if (plan.sms_tokens_included > 0) {
    const { data: newBalance, error: incrementError } = await supabase.rpc('increment_sms_balance', {
      p_landlord_id: landlordId,
      p_amount: plan.sms_tokens_included,
    });

    if (incrementError) throw incrementError;

    const { error: smsTxError } = await supabase.from('sms_transactions').insert({
      landlord_id: landlordId,
      transaction_type: 'credit',
      amount: plan.sms_tokens_included,
      balance_after: newBalance,
      description: `SMS tokens from ${plan.name} subscription (M-Pesa)`,
      created_by: landlordId,
    });

    if (smsTxError) throw smsTxError;
  }

  if (amountPaid > 0) {
    const { error: revenueError } = await supabase.from('platform_revenue').insert({
      landlord_id: landlordId,
      subscription_id: subscription.id,
      amount: amountPaid,
      payment_method: 'mpesa',
      payment_reference: paymentReference,
      status: 'completed',
    });

    if (revenueError) throw revenueError;
  }

  await supabase.from('audit_logs').insert({
    admin_id: landlordId,
    action: 'SUBSCRIPTION_ACTIVATED_MPESA',
    entity_type: 'subscription',
    entity_id: subscription.id,
    new_values: { plan_name: plan.name, landlord_id: landlordId, payment_reference: paymentReference },
  });

  return { subscription, plan };
}
