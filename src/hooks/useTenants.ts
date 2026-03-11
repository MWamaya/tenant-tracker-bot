import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Tenant {
  id: string;
  landlord_id: string;
  house_id: string | null;
  name: string;
  phone: string;
  secondary_phone: string | null;
  move_in_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TenantWithHouse extends Tenant {
  houses?: {
    id: string;
    house_no: string;
    expected_rent: number;
    status: string;
  } | null;
}

export interface TenantInsert {
  house_id?: string | null;
  name: string;
  phone: string;
  secondary_phone?: string | null;
  move_in_date?: string | null;
}

export interface TenantUpdate {
  house_id?: string | null;
  name?: string;
  phone?: string;
  secondary_phone?: string | null;
  move_in_date?: string | null;
}

export const useTenants = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['tenants', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return apiClient.get<TenantWithHouse[]>('/api/tenants');
    },
    enabled: !!user?.id,
  });

  const addTenant = useMutation({
    mutationFn: async (tenant: TenantInsert) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiClient.post<Tenant>('/api/tenants', tenant);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      toast.success('Tenant added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add tenant: ${error.message}`);
    },
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, data, previousHouseId }: { id: string; data: TenantUpdate; previousHouseId?: string | null }) => {
      return apiClient.put<Tenant>(`/api/tenants/${id}`, { ...data, previous_house_id: previousHouseId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      toast.success('Tenant updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update tenant: ${error.message}`);
    },
  });

  const deleteTenant = useMutation({
    mutationFn: async ({ id, houseId }: { id: string; houseId?: string | null }) => {
      return apiClient.delete(`/api/tenants/${id}${houseId ? `?house_id=${houseId}` : ''}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      toast.success('Tenant deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete tenant: ${error.message}`);
    },
  });

  return {
    tenants: tenantsQuery.data || [],
    isLoading: tenantsQuery.isLoading,
    error: tenantsQuery.error,
    addTenant,
    updateTenant,
    deleteTenant,
    refetch: tenantsQuery.refetch,
  };
};
