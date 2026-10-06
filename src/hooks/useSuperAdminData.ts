import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subMonths, startOfMonth } from 'date-fns';

export interface OnboardingRequest {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  plan: string;
  status: string;
  created_at: string;
}

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
  inbound_email: string | null;
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

export interface MonthlyTrendPoint {
  month: string;
  label: string;
  landlordSignups: number;
  rentCollected: number;
  newProperties: number;
  newTenants: number;
  newOnboardingRequests: number;
}

export interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: unknown;
  new_values: unknown;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// A super admin's own profile row can exist without ever being a real
// landlord (e.g. kept around because audit_logs.admin_id references it and
// can't cascade-delete) — exclude those from every "landlord" listing/count.
const fetchSuperAdminIds = async (): Promise<Set<string>> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'SUPER_ADMIN');
  if (error) throw error;
  return new Set((data || []).map((r) => r.user_id));
};

// Hook to fetch platform statistics
export const usePlatformStats = () => {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async (): Promise<PlatformStats> => {
      const superAdminIds = await fetchSuperAdminIds();

      // Fetch landlord counts by status
      const { data: allProfiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, account_status, sms_token_balance');

      if (profilesError) throw profilesError;
      const profiles = allProfiles?.filter((p) => !superAdminIds.has(p.id));

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

// Hook to fetch landlord-growth and rent-collected trends for the last 6
// months, for the Platform Overview charts.
export const usePlatformTrends = () => {
  return useQuery({
    queryKey: ['platform-trends'],
    queryFn: async (): Promise<MonthlyTrendPoint[]> => {
      const superAdminIds = await fetchSuperAdminIds();
      const rangeStart = startOfMonth(subMonths(new Date(), 5));

      const [
        { data: profiles, error: profilesError },
        { data: payments, error: paymentsError },
        { data: houses, error: housesError },
        { data: tenants, error: tenantsError },
        { data: onboardingRequests, error: onboardingError },
      ] = await Promise.all([
        supabase.from('profiles').select('id, created_at').gte('created_at', rangeStart.toISOString()),
        supabase.from('payments').select('amount, payment_date').gte('payment_date', rangeStart.toISOString()),
        supabase.from('houses').select('created_at').gte('created_at', rangeStart.toISOString()),
        supabase.from('tenants').select('created_at').gte('created_at', rangeStart.toISOString()),
        supabase.from('onboarding_requests').select('created_at').gte('created_at', rangeStart.toISOString()),
      ]);

      if (profilesError) throw profilesError;
      if (paymentsError) throw paymentsError;
      if (housesError) throw housesError;
      if (tenantsError) throw tenantsError;
      if (onboardingError) throw onboardingError;

      const months = Array.from({ length: 6 }, (_, i) => startOfMonth(subMonths(new Date(), 5 - i)));
      const points = new Map<string, MonthlyTrendPoint>(
        months.map((m) => {
          const key = format(m, 'yyyy-MM');
          return [
            key,
            {
              month: key,
              label: format(m, 'MMM'),
              landlordSignups: 0,
              rentCollected: 0,
              newProperties: 0,
              newTenants: 0,
              newOnboardingRequests: 0,
            },
          ];
        })
      );

      for (const p of profiles ?? []) {
        if (superAdminIds.has(p.id)) continue;
        const key = format(new Date(p.created_at), 'yyyy-MM');
        const point = points.get(key);
        if (point) point.landlordSignups += 1;
      }

      for (const h of houses ?? []) {
        const key = format(new Date(h.created_at), 'yyyy-MM');
        const point = points.get(key);
        if (point) point.newProperties += 1;
      }

      for (const t of tenants ?? []) {
        const key = format(new Date(t.created_at), 'yyyy-MM');
        const point = points.get(key);
        if (point) point.newTenants += 1;
      }

      for (const o of onboardingRequests ?? []) {
        const key = format(new Date(o.created_at), 'yyyy-MM');
        const point = points.get(key);
        if (point) point.newOnboardingRequests += 1;
      }

      for (const p of payments ?? []) {
        const key = format(new Date(p.payment_date), 'yyyy-MM');
        const point = points.get(key);
        if (point) point.rentCollected += Number(p.amount);
      }

      return Array.from(points.values());
    },
  });
};

// Hook to fetch all landlords
export const useLandlords = () => {
  return useQuery({
    queryKey: ['landlords'],
    queryFn: async (): Promise<LandlordProfile[]> => {
      const superAdminIds = await fetchSuperAdminIds();

      const { data: allProfiles, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const profiles = allProfiles?.filter((p) => !superAdminIds.has(p.id));

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

// Hook to fetch, per landlord, how many of their rent payments are
// unmatched (no tenant/house link). This is the landlord's own reconciling
// job (they have a Reconciliation page for it) — admin just needs enough
// visibility to tell who has a backlog, surfaced on the Landlords table
// rather than as a platform-wide "needs attention" queue.
export const useUnmatchedPaymentCountsByLandlord = () => {
  return useQuery({
    queryKey: ['unmatched-payment-counts-by-landlord'],
    queryFn: async (): Promise<Map<string, number>> => {
      const { data, error } = await supabase
        .from('payments')
        .select('landlord_id')
        .or('tenant_id.is.null,house_id.is.null');

      if (error) throw error;

      const counts = new Map<string, number>();
      for (const p of data ?? []) {
        counts.set(p.landlord_id, (counts.get(p.landlord_id) || 0) + 1);
      }
      return counts;
    },
  });
};

// --- Landlord detail page data --------------------------------------------
// Everything below is scoped to a single landlord_id for the admin's
// per-landlord detail view. Tenant rows are deliberately never fetched here
// beyond a bare count — their names/phones are the landlord's own data, not
// something admin needs to see to manage the account.

export interface LandlordProperty {
  id: string;
  name: string;
  address: string | null;
  county: string | null;
  town: string | null;
  property_type: string | null;
  total_units: number | null;
  created_at: string;
}

export const useLandlordProperties = (landlordId: string | null) =>
  useQuery({
    queryKey: ['landlord-properties', landlordId],
    queryFn: async (): Promise<LandlordProperty[]> => {
      const { data, error } = await supabase
        .from('properties')
        .select('id, name, address, county, town, property_type, total_units, created_at')
        .eq('landlord_id', landlordId as string)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!landlordId,
  });

export interface LandlordHouse {
  id: string;
  house_no: string;
  status: string;
  expected_rent: number;
  property_id: string | null;
  property_name: string | null;
}

export const useLandlordHouses = (landlordId: string | null) =>
  useQuery({
    queryKey: ['landlord-houses', landlordId],
    queryFn: async (): Promise<LandlordHouse[]> => {
      const [{ data: houses, error: housesError }, { data: properties, error: propertiesError }] =
        await Promise.all([
          supabase
            .from('houses')
            .select('id, house_no, status, expected_rent, property_id')
            .eq('landlord_id', landlordId as string)
            .order('house_no'),
          supabase.from('properties').select('id, name').eq('landlord_id', landlordId as string),
        ]);
      if (housesError) throw housesError;
      if (propertiesError) throw propertiesError;

      const propertyNameById = new Map((properties ?? []).map((p) => [p.id, p.name]));
      return (houses ?? []).map((h) => ({
        ...h,
        property_name: h.property_id ? propertyNameById.get(h.property_id) ?? null : null,
      }));
    },
    enabled: !!landlordId,
  });

// Bare count only — no tenant names/phones. Those stay the landlord's own
// data; admin just needs to know how many.
export const useLandlordTenantCount = (landlordId: string | null) =>
  useQuery({
    queryKey: ['landlord-tenant-count', landlordId],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('landlord_id', landlordId as string);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!landlordId,
  });

export interface LandlordRentSummary {
  totalCollected: number;
  paymentCount: number;
}

export const useLandlordRentSummary = (landlordId: string | null) =>
  useQuery({
    queryKey: ['landlord-rent-summary', landlordId],
    queryFn: async (): Promise<LandlordRentSummary> => {
      const { data, error } = await supabase
        .from('payments')
        .select('amount')
        .eq('landlord_id', landlordId as string);
      if (error) throw error;
      const rows = data ?? [];
      return {
        totalCollected: rows.reduce((sum, p) => sum + Number(p.amount), 0),
        paymentCount: rows.length,
      };
    },
    enabled: !!landlordId,
  });

export interface LandlordPlatformPayment {
  id: string;
  amount: number;
  payment_reference: string | null;
  payment_method: string | null;
  status: string;
  created_at: string;
}

export const useLandlordPlatformPayments = (landlordId: string | null) =>
  useQuery({
    queryKey: ['landlord-platform-payments', landlordId],
    queryFn: async (): Promise<LandlordPlatformPayment[]> => {
      const { data, error } = await supabase
        .from('platform_revenue')
        .select('id, amount, payment_reference, payment_method, status, created_at')
        .eq('landlord_id', landlordId as string)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!landlordId,
  });

export const useLandlordAuditLog = (landlordId: string | null) =>
  useQuery({
    queryKey: ['landlord-audit-log', landlordId],
    queryFn: async (): Promise<AuditLog[]> => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_id', landlordId as string)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;

      const adminIds = [...new Set((data || []).map((l) => l.admin_id).filter(Boolean))];
      const { data: admins } = adminIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', adminIds)
        : { data: [] as { id: string; full_name: string | null }[] };
      const adminNameById = new Map((admins || []).map((a) => [a.id, a.full_name || 'Unknown admin']));

      return (data || []).map((log) => ({
        ...log,
        admin_name: adminNameById.get(log.admin_id) || 'Unknown admin',
      }));
    },
    enabled: !!landlordId,
  });

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

      const adminIds = [...new Set((data || []).map((l) => l.admin_id).filter(Boolean))];
      const { data: admins } = adminIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', adminIds)
        : { data: [] as { id: string; full_name: string | null }[] };

      const adminNameById = new Map((admins || []).map((a) => [a.id, a.full_name || 'Unknown admin']));

      return (data || []).map((log) => ({
        ...log,
        admin_name: adminNameById.get(log.admin_id) || 'Unknown admin',
      }));
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

// Mutation to update a landlord's inbound (kodipap) email
export const useUpdateInboundEmail = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ landlordId, inboundEmail }: { landlordId: string; inboundEmail: string }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ inbound_email: inboundEmail })
        .eq('id', landlordId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: 'UPDATE_INBOUND_EMAIL',
        entity_type: 'profile',
        entity_id: landlordId,
        new_values: { inbound_email: inboundEmail },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlords'] });
      toast.success('Inbound email updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update inbound email: ${error.message}`);
    },
  });
};

// Mutation to allocate SMS tokens
export const useAllocateSmsTokens = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ landlordId, amount, description }: { landlordId: string; amount: number; description?: string }) => {
      // Atomic increment — avoids the read-then-write race of fetching the
      // balance in JS and writing back old+amount.
      const { data: newBalance, error: incrementError } = await supabase.rpc('increment_sms_balance', {
        p_landlord_id: landlordId,
        p_amount: amount,
      });

      if (incrementError) throw incrementError;

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

      // A landlord should only ever have one active subscription — cancel
      // any existing one first, otherwise two "active" rows can coexist and
      // which plan shows up (e.g. in useLandlords' subscriptionMap) becomes
      // whichever row the query happens to return last.
      const { error: cancelError } = await supabase
        .from('landlord_subscriptions')
        .update({ status: 'cancelled' })
        .eq('landlord_id', landlordId)
        .eq('status', 'active');

      if (cancelError) throw cancelError;

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
      const { error: statusError } = await supabase
        .from('profiles')
        .update({ account_status: 'active' })
        .eq('id', landlordId);

      if (statusError) throw statusError;

      // Add SMS tokens if included in plan
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
          description: `SMS tokens from ${plan.name} subscription`,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

        if (smsTxError) throw smsTxError;
      }

      // Record platform revenue
      if (amountPaid && amountPaid > 0) {
        const { error: revenueError } = await supabase.from('platform_revenue').insert({
          landlord_id: landlordId,
          subscription_id: subscription.id,
          amount: amountPaid,
          payment_method: 'manual',
          payment_reference: paymentReference,
          status: 'completed',
        });

        if (revenueError) throw revenueError;
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

// Hook to fetch onboarding requests from the public "Get started" lead form
export const useOnboardingRequests = () => {
  return useQuery({
    queryKey: ['onboarding-requests'],
    queryFn: async (): Promise<OnboardingRequest[]> => {
      const { data, error } = await supabase
        .from('onboarding_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
};

// Hook to fetch the count of untriaged ("new") onboarding requests, for the
// dashboard stat card — cheap exact count rather than fetching full rows.
export const useNewOnboardingRequestsCount = () => {
  return useQuery({
    queryKey: ['onboarding-requests-new-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('onboarding_requests')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'new');

      if (error) throw error;
      return count || 0;
    },
  });
};

// Hook to fetch the platform-wide count of bank-email parses that failed
// (email_logs.status === 'failed'), for the dashboard's Needs Attention
// widget. Independent useQuery (not folded into a combined hook) so one
// signal failing doesn't blank the others on the dashboard.
export const useFailedEmailLogsCount = () => {
  return useQuery({
    queryKey: ['needs-attention-failed-email-logs-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('email_logs')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed');

      if (error) throw error;
      return count || 0;
    },
  });
};

// Hook to fetch the platform-wide count of webhook deliveries that never
// finished processing (webhooks_log.processed === false), for the
// dashboard's Needs Attention widget.
export const useUnprocessedWebhooksCount = () => {
  return useQuery({
    queryKey: ['needs-attention-unprocessed-webhooks-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('webhooks_log')
        .select('*', { count: 'exact', head: true })
        .eq('processed', false);

      if (error) throw error;
      return count || 0;
    },
  });
};

// Mutation to update an onboarding request's triage status
export const useUpdateOnboardingStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { error } = await supabase
        .from('onboarding_requests')
        .update({ status })
        .eq('id', requestId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: 'UPDATE_ONBOARDING_REQUEST_STATUS',
        entity_type: 'onboarding_request',
        entity_id: requestId,
        new_values: { status },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-requests'] });
      toast.success('Request updated');
    },
    onError: (error) => {
      toast.error(`Failed to update request: ${error.message}`);
    },
  });
};

// Mutation to create a landlord account from the admin UI (blank "Add
// Landlord" form, or "Create account" on an onboarding request). Goes
// through the admin-create-landlord edge function since creating an auth
// user requires the Admin API (service role), not something the client
// SDK can do directly.
export const useCreateLandlordAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      fullName: string;
      email: string;
      phone?: string;
      companyName?: string;
      onboardingRequestId?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('admin-create-landlord', {
        body: params,
      });

      if (error) throw error;
      if (data && 'error' in data) throw new Error(data.error);
      return data as { ok: true; landlordId: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['landlords'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-requests'] });
      queryClient.invalidateQueries({ queryKey: ['onboarding-requests-new-count'] });
      toast.success('Landlord account created — they’ve been emailed an invite to set a password.');
    },
    onError: (error: Error) => {
      toast.error(`Failed to create landlord: ${error.message}`);
    },
  });
};

// Mutation to edit a subscription plan's price/features/limits. Name is
// deliberately not editable here — the public site (Landing, GetStarted,
// ChoosePlan) matches plans by exact name, so renaming one in place would
// silently break that match rather than updating it.
export const useUpdateSubscriptionPlan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      planId,
      price,
      description,
      maxProperties,
      maxTenants,
      smsTokensIncluded,
      features,
      isActive,
    }: {
      planId: string;
      price: number;
      description: string;
      maxProperties: number | null;
      maxTenants: number | null;
      smsTokensIncluded: number;
      features: string[];
      isActive: boolean;
    }) => {
      const { error } = await supabase
        .from('subscription_plans')
        .update({
          price,
          description,
          max_properties: maxProperties,
          max_tenants: maxTenants,
          sms_tokens_included: smsTokensIncluded,
          features,
          is_active: isActive,
        })
        .eq('id', planId);

      if (error) throw error;

      await supabase.from('audit_logs').insert({
        admin_id: (await supabase.auth.getUser()).data.user?.id || '',
        action: 'UPDATE_SUBSCRIPTION_PLAN',
        entity_type: 'subscription_plan',
        entity_id: planId,
        new_values: { price, is_active: isActive },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription-plans'] });
      // Also read by the public site (Landing, GetStarted, ChoosePlan).
      queryClient.invalidateQueries({ queryKey: ['public-subscription-plans'] });
      toast.success('Plan updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update plan: ${error.message}`);
    },
  });
};
