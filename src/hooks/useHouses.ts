import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
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
      const path = propertyId
        ? `/api/houses?property_id=${propertyId}`
        : '/api/houses';
      return apiClient.get<HouseWithProperty[]>(path);
    },
    enabled: !!user?.id,
  });

  const addHouse = useMutation({
    mutationFn: async (house: HouseInsert) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiClient.post<House>('/api/houses', house);
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
      return apiClient.put<House>(`/api/houses/${id}`, data);
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
      return apiClient.delete(`/api/houses/${id}`);
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
