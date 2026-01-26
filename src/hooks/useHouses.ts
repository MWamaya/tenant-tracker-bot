import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface House {
  id: string;
  landlord_id: string;
  property_id: string | null;
  house_no: string;
  expected_rent: number;
  status: 'vacant' | 'occupied';
  occupancy_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface HouseWithProperty extends House {
  properties?: {
    id: string;
    name: string;
  } | null;
}

export interface HouseInsert {
  property_id?: string | null;
  house_no: string;
  expected_rent: number;
  status?: 'vacant' | 'occupied';
  occupancy_date?: string | null;
}

export interface HouseUpdate {
  property_id?: string | null;
  house_no?: string;
  expected_rent?: number;
  status?: 'vacant' | 'occupied';
  occupancy_date?: string | null;
}

export const useHouses = (propertyId?: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const housesQuery = useQuery({
    queryKey: ['houses', user?.id, propertyId],
    queryFn: async () => {
      if (!user?.id) return [];
      
      let query = supabase
        .from('houses')
        .select(`
          *,
          properties (
            id,
            name
          )
        `)
        .eq('landlord_id', user.id)
        .order('house_no', { ascending: true });

      // Filter by property if specified
      if (propertyId) {
        query = query.eq('property_id', propertyId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as HouseWithProperty[];
    },
    enabled: !!user?.id,
  });

  const addHouse = useMutation({
    mutationFn: async (house: HouseInsert) => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('houses')
        .insert({
          landlord_id: user.id,
          property_id: house.property_id || null,
          house_no: house.house_no,
          expected_rent: house.expected_rent,
          status: house.status || 'vacant',
          occupancy_date: house.occupancy_date || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as House;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-stats'] });
      toast.success('House added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add house: ${error.message}`);
    },
  });

  const updateHouse = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: HouseUpdate }) => {
      const { data: updated, error } = await supabase
        .from('houses')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as House;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-stats'] });
      toast.success('House updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update house: ${error.message}`);
    },
  });

  const deleteHouse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('houses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-stats'] });
      toast.success('House deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete house: ${error.message}`);
    },
  });

  return {
    houses: housesQuery.data || [],
    isLoading: housesQuery.isLoading,
    error: housesQuery.error,
    addHouse,
    updateHouse,
    deleteHouse,
    refetch: housesQuery.refetch,
  };
};
