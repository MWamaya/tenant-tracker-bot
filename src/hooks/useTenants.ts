import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveLandlordId } from '@/hooks/useImpersonation';
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
  const landlordId = useEffectiveLandlordId();
  const queryClient = useQueryClient();

  const tenantsQuery = useQuery({
    queryKey: ['tenants', landlordId],
    queryFn: async () => {
      if (!landlordId) return [];

      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          houses (
            id,
            house_no,
            expected_rent,
            status
          )
        `)
        .eq('landlord_id', landlordId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as TenantWithHouse[];
    },
    enabled: !!landlordId,
  });

  const addTenant = useMutation({
    mutationFn: async (tenant: TenantInsert) => {
      if (!landlordId) throw new Error('No landlord context');

      const { data, error } = await supabase
        .from('tenants')
        .insert({
          landlord_id: landlordId,
          house_id: tenant.house_id || null,
          name: tenant.name,
          phone: tenant.phone,
          secondary_phone: tenant.secondary_phone || null,
          move_in_date: tenant.move_in_date || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (tenant.house_id) {
        await supabase
          .from('houses')
          .update({ status: 'occupied', occupancy_date: tenant.move_in_date || new Date().toISOString().split('T')[0] })
          .eq('id', tenant.house_id);
      }

      return data as Tenant;
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
      const { data: updated, error } = await supabase
        .from('tenants')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      if (previousHouseId && previousHouseId !== data.house_id) {
        await supabase
          .from('houses')
          .update({ status: 'vacant', occupancy_date: null })
          .eq('id', previousHouseId);
      }

      if (data.house_id && data.house_id !== previousHouseId) {
        await supabase
          .from('houses')
          .update({ status: 'occupied', occupancy_date: data.move_in_date || new Date().toISOString().split('T')[0] })
          .eq('id', data.house_id);
      }

      return updated as Tenant;
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
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', id);

      if (error) throw error;

      if (houseId) {
        await supabase
          .from('houses')
          .update({ status: 'vacant', occupancy_date: null })
          .eq('id', houseId);
      }
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
