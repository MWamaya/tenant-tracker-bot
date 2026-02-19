import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export interface Property {
  id: string;
  landlord_id: string;
  name: string;
  address: string | null;
  county: string | null;
  town: string | null;
  property_type: string | null;
  total_units: number | null;
  created_at: string;
  updated_at: string;
}

export interface PropertyWithStats extends Property {
  houses_count: number;
  occupied_count: number;
  vacant_count: number;
}

export interface PropertyInsert {
  name: string;
  address?: string | null;
  county?: string | null;
  town?: string | null;
  property_type?: string | null;
}

export interface PropertyUpdate {
  name?: string;
  address?: string | null;
  county?: string | null;
  town?: string | null;
  property_type?: string | null;
}

export const useProperties = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const propertiesQuery = useQuery({
    queryKey: ['properties', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return apiClient.get<Property[]>('/api/properties');
    },
    enabled: !!user?.id,
  });

  // Get properties with stats (house counts)
  const propertiesWithStatsQuery = useQuery({
    queryKey: ['properties-with-stats', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      return apiClient.get<PropertyWithStats[]>('/api/properties?with_stats=1');
    },
    enabled: !!user?.id,
  });

  const addProperty = useMutation({
    mutationFn: async (property: PropertyInsert) => {
      if (!user?.id) throw new Error('User not authenticated');
      return apiClient.post<Property>('/api/properties', property);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-stats'] });
      toast.success('Property added successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to add property: ${error.message}`);
    },
  });

  const updateProperty = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: PropertyUpdate }) => {
      return apiClient.put<Property>(`/api/properties/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-stats'] });
      toast.success('Property updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update property: ${error.message}`);
    },
  });

  const deleteProperty = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/api/properties/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      queryClient.invalidateQueries({ queryKey: ['properties-with-stats'] });
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      toast.success('Property deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete property: ${error.message}`);
    },
  });

  return {
    properties: propertiesQuery.data || [],
    propertiesWithStats: propertiesWithStatsQuery.data || [],
    isLoading: propertiesQuery.isLoading || propertiesWithStatsQuery.isLoading,
    error: propertiesQuery.error,
    addProperty,
    updateProperty,
    deleteProperty,
    refetch: propertiesQuery.refetch,
  };
};
