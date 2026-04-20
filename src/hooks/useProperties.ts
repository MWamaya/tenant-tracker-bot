import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveLandlordId } from '@/hooks/useImpersonation';
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
  const landlordId = useEffectiveLandlordId();
  const queryClient = useQueryClient();

  const propertiesQuery = useQuery({
    queryKey: ['properties', landlordId],
    queryFn: async () => {
      if (!landlordId) return [];

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', landlordId)
        .order('name', { ascending: true });

      if (error) throw error;
      return data as Property[];
    },
    enabled: !!landlordId,
  });

  const propertiesWithStatsQuery = useQuery({
    queryKey: ['properties-with-stats', landlordId],
    queryFn: async () => {
      if (!landlordId) return [];

      const { data: properties, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .eq('landlord_id', landlordId)
        .order('name', { ascending: true });

      if (propertiesError) throw propertiesError;

      const { data: houses, error: housesError } = await supabase
        .from('houses')
        .select('id, property_id, status')
        .eq('landlord_id', landlordId);

      if (housesError) throw housesError;

      const propertiesWithStats: PropertyWithStats[] = properties.map(property => {
        const propertyHouses = houses.filter(h => h.property_id === property.id);
        return {
          ...property,
          houses_count: propertyHouses.length,
          occupied_count: propertyHouses.filter(h => h.status === 'occupied').length,
          vacant_count: propertyHouses.filter(h => h.status === 'vacant').length,
        };
      });

      return propertiesWithStats;
    },
    enabled: !!landlordId,
  });

  const addProperty = useMutation({
    mutationFn: async (property: PropertyInsert) => {
      if (!landlordId) throw new Error('No landlord context');

      const { data, error } = await supabase
        .from('properties')
        .insert({
          landlord_id: landlordId,
          name: property.name,
          address: property.address || null,
          county: property.county || null,
          town: property.town || null,
          property_type: property.property_type || 'residential',
        })
        .select()
        .single();

      if (error) throw error;
      return data as Property;
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
      const { data: updated, error } = await supabase
        .from('properties')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return updated as Property;
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
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) throw error;
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
