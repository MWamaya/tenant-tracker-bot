import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
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
      return apiClient.get<PlatformStats>('/api/super-admin/stats');
    },
  });
};

// Hook to fetch all landlords
export const useLandlords = () => {
  return useQuery({
    queryKey: ['landlords'],
    queryFn: async (): Promise<LandlordProfile[]> => {
      return apiClient.get<LandlordProfile[]>('/api/super-admin/landlords');
    },
  });
};

// Hook to fetch subscription plans
export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      return apiClient.get<SubscriptionPlan[]>('/api/super-admin/subscription-plans');
    },
  });
};

// Hook to fetch audit logs
export const useAuditLogs = (limit = 50) => {
  return useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: async (): Promise<AuditLog[]> => {
      return apiClient.get<AuditLog[]>(`/api/super-admin/audit-logs?limit=${limit}`);
    },
  });
};

// Mutation to update landlord status
export const useUpdateLandlordStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ landlordId, status }: { landlordId: string; status: string }) => {
      return apiClient.patch(`/api/super-admin/landlords/${landlordId}/status`, { status });
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
      return apiClient.post(`/api/super-admin/landlords/${landlordId}/sms-tokens`, { amount, description });
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
      return apiClient.post(`/api/super-admin/landlords/${landlordId}/subscriptions`, {
        plan_id: planId,
        payment_reference: paymentReference,
        amount_paid: amountPaid,
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
