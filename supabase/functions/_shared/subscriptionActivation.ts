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
    /** Billing cycles paid for in this one payment (1, 3, 6, or 12). */
    months?: number;
  },
) {
  const { landlordId, planId, paymentReference, amountPaid, months = 1 } = params;

  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (planError) throw planError;

  const durationDays = plan.duration_days * months;
  const smsTokens = plan.sms_tokens_included * months;

  // Prepaying the SAME plan while time is still left on it stacks onto the
  // existing end_date, so paying early never forfeits time already paid
  // for. Switching plans (or renewing after expiry) replaces it instead —
  // there's no partial-period carryover to reconcile across plans.
  const { data: existing, error: existingError } = await supabase
    .from('landlord_subscriptions')
    .select('*')
    .eq('landlord_id', landlordId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const now = new Date();
  const isStackableRenewal =
    existing && existing.plan_id === planId && new Date(existing.end_date) > now;

  let subscription: any;

  if (isStackableRenewal) {
    const newEndDate = new Date(existing.end_date);
    newEndDate.setDate(newEndDate.getDate() + durationDays);

    const { data: updated, error: updateError } = await supabase
      .from('landlord_subscriptions')
      .update({
        end_date: newEndDate.toISOString(),
        amount_paid: (existing.amount_paid || 0) + amountPaid,
        payment_reference: paymentReference,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) throw updateError;
    subscription = updated;
  } else {
    const { error: cancelError } = await supabase
      .from('landlord_subscriptions')
      .update({ status: 'cancelled' })
      .eq('landlord_id', landlordId)
      .eq('status', 'active');

    if (cancelError) throw cancelError;

    const endDate = new Date();
    endDate.setDate(endDate.getDate() + durationDays);

    const { data: inserted, error: subError } = await supabase
      .from('landlord_subscriptions')
      .insert({
        landlord_id: landlordId,
        plan_id: planId,
        status: 'active',
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        payment_reference: paymentReference,
        amount_paid: amountPaid,
      })
      .select()
      .single();

    if (subError) throw subError;
    subscription = inserted;
  }

  const { error: statusError } = await supabase
    .from('profiles')
    .update({ account_status: 'active' })
    .eq('id', landlordId);

  if (statusError) throw statusError;

  if (smsTokens > 0) {
    const { data: newBalance, error: incrementError } = await supabase.rpc('increment_sms_balance', {
      p_landlord_id: landlordId,
      p_amount: smsTokens,
    });

    if (incrementError) throw incrementError;

    const { error: smsTxError } = await supabase.from('sms_transactions').insert({
      landlord_id: landlordId,
      transaction_type: 'credit',
      amount: smsTokens,
      balance_after: newBalance,
      description:
        months > 1
          ? `SMS tokens from ${months}-month ${plan.name} prepayment (M-Pesa)`
          : `SMS tokens from ${plan.name} subscription (M-Pesa)`,
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
    new_values: {
      plan_name: plan.name,
      landlord_id: landlordId,
      payment_reference: paymentReference,
      months,
      stacked: !!isStackableRenewal,
    },
  });

  return { subscription, plan };
}
