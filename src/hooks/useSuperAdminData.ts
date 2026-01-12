import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Types for Super Admin data
export interface LandlordProfile {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  account_status: string;
  sms_token_balance: number;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  email?: string;
  subscription?: {
    id: string;
    plan_name: string;
    status: string;
    end_date: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  max_properties: number | null;
  max_tenants: number | null;
  sms_tokens_included: number;
  features: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PlatformStats {
  totalLandlords: number;
  activeLandlords: number;
  suspendedLandlords: number;
  expiredLandlords: number;
  totalProperties: number;
  totalTenants: number;
  totalRentCollected: number;
  smsTokensIssued: number;
  smsTokensUsed: number;
  expiringSubscriptions: number;
  unmatchedPayments: number;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// Hook to fetch platform statistics
export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async (): Promise<PlatformStats> => {
      // Fetch landlord counts by status
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, account_status, sms_token_balance');

      if (profilesError) throw profilesError;

      // Fetch total properties
      const { count: propertiesCount, error: propertiesError } = await supabase
        .from('houses')
        .select('*', { count: 'exact', head: true });

      if (propertiesError) throw propertiesError;

      // Fetch total tenants
      const { count: tenantsCount, error: tenantsError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true });

      if (tenantsError) throw tenantsError;

      // Fetch total rent collected
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('amount');

      if (paymentsError) throw paymentsError;

      const totalRentCollected = payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;

      // Fetch unmatched payments (payments without tenant_id or house_id)
      const { count: unmatchedCount, error: unmatchedError } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .or('tenant_id.is.null,house_id.is.null');

      if (unmatchedError) throw unmatchedError;

      // Fetch SMS transactions for tokens issued
      const { data: smsCredits, error: smsCreditsError } = await supabase
        .from('sms_transactions')
        .select('amount')
        .eq('transaction_type', 'credit');

      if (smsCreditsError) throw smsCreditsError;

      const smsTokensIssued = smsCredits?.reduce((sum, t) => sum + t.amount, 0) || 0;

      // Fetch SMS transactions for tokens used
      const { data: smsDebits, error: smsDebitsError } = await supabase
        .from('sms_transactions')
        .select('amount')
        .eq('transaction_type', 'debit');

      if (smsDebitsError) throw smsDebitsError;

      const smsTokensUsed = smsDebits?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;

      // Calculate expiring subscriptions (within 7 days)
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const { count: expiringCount, error: expiringError } = await supabase
        .from('landlord_subscriptions')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .lte('end_date', sevenDaysFromNow.toISOString());

      if (expiringError) throw expiringError;

      const statusCounts = profiles?.reduce(
        (acc, p) => {
          acc[p.account_status] = (acc[p.account_status] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      ) || {};

      return {
        totalLandlords: profiles?.length || 0,
        activeLandlords: statusCounts['active'] || 0,
        suspendedLandlords: statusCounts['suspended'] || 0,
        expiredLandlords: statusCounts['expired'] || 0,
        totalProperties: propertiesCount || 0,
        totalTenants: tenantsCount || 0,
        totalRentCollected,
        smsTokensIssued,
        smsTokensUsed,
        expiringSubscriptions: expiringCount || 0,
        unmatchedPayments: unmatchedCount || 0,
      };
    },
  });
};

// Hook to fetch all landlords
export const useLandlords = () => {
  return useQuery({
    queryKey: ['landlords'],
    queryFn: async (): Promise<LandlordProfile[]> => {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch subscriptions for each landlord
      const { data: subscriptions } = await supabase
        .from('landlord_subscriptions')
        .select(`
          id,
          landlord_id,
          status,
          end_date,
          subscription_plans (name)
        `)
        .eq('status', 'active');

      const subscriptionMap = new Map();
      subscriptions?.forEach((sub) => {
        subscriptionMap.set(sub.landlord_id, {
          id: sub.id,
          plan_name: (sub.subscription_plans as { name: string })?.name || 'Unknown',
          status: sub.status,
          end_date: sub.end_date,
        });
      });

      return profiles?.map((p) => ({
        ...p,
        subscription: subscriptionMap.get(p.id),
      })) || [];
    },
  });
};

// Hook to fetch subscription plans
export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .order('price', { ascending: true });

      if (error) throw error;
      return data?.map(p => ({
        ...p,
        features: Array.isArray(p.features) ? p.features as string[] : []
      })) || [];
    },
  });
};

// Hook to fetch audit logs
export const useAuditLogs = (limit = 50) => {
  return useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data || [];
    },
  });
};

// Mutation to update landlord status
export const useUpdateLandlordStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ landlordId, status }: { landlordId: string; status: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ account_status: status })
        .eq('id', landlordId);

      if (error) throw error;

      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: 'UPDATE_LANDLORD_STATUS',
        entity_type: 'profile',
        entity_id: landlordId,
        new_values: { account_status: status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlords'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('Landlord status updated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });
};

// Mutation to allocate SMS tokens
export const useAllocateSmsTokens = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ landlordId, amount, description }: { landlordId: string; amount: number; description?: string }) => {
      // Get current balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('sms_token_balance')
        .eq('id', landlordId)
        .single();

      if (profileError) throw profileError;

      const newBalance = (profile?.sms_token_balance || 0) + amount;

      // Update balance
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ sms_token_balance: newBalance })
        .eq('id', landlordId);

      if (updateError) throw updateError;

      // Record transaction
      const { error: transactionError } = await supabase
        .from('sms_transactions')
        .insert({
          landlord_id: landlordId,
          transaction_type: amount > 0 ? 'credit' : 'debit',
          amount: Math.abs(amount),
          balance_after: newBalance,
          description: description || `SMS tokens ${amount > 0 ? 'added' : 'deducted'}`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (transactionError) throw transactionError;

      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: 'ALLOCATE_SMS_TOKENS',
        entity_type: 'sms_tokens',
        entity_id: landlordId,
        new_values: { amount, new_balance: newBalance },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlords'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('SMS tokens allocated successfully');
    },
    onError: (error) => {
      toast.error(`Failed to allocate tokens: ${error.message}`);
    },
  });
};

// Mutation to assign subscription to landlord
export const useAssignSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ landlordId, planId, paymentReference, amountPaid }: { 
      landlordId: string; 
      planId: string; 
      paymentReference?: string;
      amountPaid?: number;
    }) => {
      // Get plan details
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError) throw planError;

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      // Create subscription
      const { data: subscription, error: subError } = await supabase
        .from('landlord_subscriptions')
        .insert({
          landlord_id: landlordId,
          plan_id: planId,
          status: 'active',
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          payment_reference: paymentReference,
          amount_paid: amountPaid || plan.price,
        })
        .select()
        .single();

      if (subError) throw subError;

      // Update landlord status to active
      await supabase
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('id', landlordId);

      // Add SMS tokens if included in plan
      if (plan.sms_tokens_included > 0) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('sms_token_balance')
          .eq('id', landlordId)
          .single();

        const newBalance = (profile?.sms_token_balance || 0) + plan.sms_tokens_included;

        await supabase
          .from('profiles')
          .update({ sms_token_balance: newBalance })
          .eq('id', landlordId);

        await supabase.from('sms_transactions').insert({
          landlord_id: landlordId,
          transaction_type: 'credit',
          amount: plan.sms_tokens_included,
          balance_after: newBalance,
          description: `SMS tokens from ${plan.name} subscription`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });
      }

      // Record platform revenue
      if (amountPaid && amountPaid > 0) {
        await supabase.from('platform_revenue').insert({
          landlord_id: landlordId,
          subscription_id: subscription.id,
          amount: amountPaid,
          payment_method: 'manual',
          payment_reference: paymentReference,
          status: 'completed',
        });
      }

      // Log the action
      await supabase.from('audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: 'ASSIGN_SUBSCRIPTION',
        entity_type: 'subscription',
        entity_id: subscription.id,
        new_values: { plan_name: plan.name, landlord_id: landlordId },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlords'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('Subscription assigned successfully');
    },
    onError: (error) => {
      toast.error(`Failed to assign subscription: ${error.message}`);
    },
  });
};
