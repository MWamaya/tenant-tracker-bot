import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { ROUTES } from '@/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Building2, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { ADMIN_CARD, ADMIN_SURFACE, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

interface PropertyRow {
  id: string;
  name: string;
  address: string | null;
  town: string | null;
  county: string | null;
  property_type: string | null;
  landlord_id: string;
  created_at: string;
  landlord_name: string;
  landlord_company: string | null;
  houses_count: number;
  occupied_count: number;
}

const useAllProperties = () => {
  return useQuery({
    queryKey: ['super-admin-properties'],
    queryFn: async (): Promise<PropertyRow[]> => {
      const [{ data: properties, error }, { data: profiles }, { data: houses }] = await Promise.all([
        supabase.from('properties').select('*').order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name, company_name'),
        supabase.from('houses').select('id, property_id, status'),
      ]);

      if (error) throw error;

      const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
      const housesByProperty = new Map<string, { total: number; occupied: number }>();
      (houses || []).forEach((h) => {
        if (!h.property_id) return;
        const cur = housesByProperty.get(h.property_id) || { total: 0, occupied: 0 };
        cur.total += 1;
        if (h.status === 'occupied') cur.occupied += 1;
        housesByProperty.set(h.property_id, cur);
      });

      return (properties || []).map((p) => {
        const profile = profileMap.get(p.landlord_id);
        const stats = housesByProperty.get(p.id) || { total: 0, occupied: 0 };
        return {
          id: p.id,
          name: p.name,
          address: p.address,
          town: p.town,
          county: p.county,
          property_type: p.property_type,
          landlord_id: p.landlord_id,
          created_at: p.created_at,
          landlord_name: profile?.full_name || 'Unknown',
          landlord_company: profile?.company_name || null,
          houses_count: stats.total,
          occupied_count: stats.occupied,
        };
      });
    },
  });
};

const PropertiesPage = () => {
  const navigate = useNavigate();
  const { data: properties, isLoading } = useAllProperties();
  const [searchQuery, setSearchQuery] = useState('');

  const viewOwner = (landlordId: string) => {
    navigate(`${ROUTES.SUPER_ADMIN_LANDLORD_DETAIL}?landlord=${landlordId}`);
  };

  const filtered = (properties || []).filter((p) => {
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.landlord_name.toLowerCase().includes(q) ||
      (p.landlord_company || '').toLowerCase().includes(q) ||
      (p.town || '').toLowerCase().includes(q) ||
      (p.county || '').toLowerCase().includes(q) ||
      (p.address || '').toLowerCase().includes(q)
    );
  });

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#0F172A]">All Properties</h1>
          <p className="text-[#64748B] mt-1 text-sm md:text-base">
            Complete list of properties registered across all landlords
          </p>
        </div>

        <Card className={ADMIN_CARD}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2 text-[#0F172A]">
                  <Building2 className="h-5 w-5" />
                  Properties ({filtered.length})
                </CardTitle>
                <CardDescription className="text-[#64748B]">
                  Search by property, landlord, or location
                </CardDescription>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#64748B]" />
                <Input
                  placeholder="Search properties..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 w-full bg-[#E2E8F0]" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-[#64748B]">No properties found</p>
              </div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {filtered.map((p) => (
                    <div
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => viewOwner(p.landlord_id)}
                      onKeyDown={(e) => e.key === 'Enter' && viewOwner(p.landlord_id)}
                      className={cn(ADMIN_SURFACE, ADMIN_SURFACE_HOVER, "p-4 space-y-2 cursor-pointer")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-[#0F172A]">{p.name}</div>
                          <div className="text-xs text-[#64748B] flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {[p.town, p.county].filter(Boolean).join(', ') || 'No location'}
                          </div>
                        </div>
                        <Badge variant="outline" className="border-[#E2E8F0] text-[#1E3A5F] capitalize">
                          {p.property_type || 'residential'}
                        </Badge>
                      </div>
                      <div className="text-sm">
                        <span className="text-[#64748B]">Landlord:</span>{' '}
                        <span className="font-medium text-[#0F172A]">
                          {p.landlord_company || p.landlord_name}
                        </span>
                      </div>
                      <div className="flex gap-4 text-xs text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                        <span>{p.houses_count} units</span>
                        <span className="text-success">{p.occupied_count} occupied</span>
                        <span>{p.houses_count - p.occupied_count} vacant</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-[#E2E8F0] hover:bg-transparent">
                        <TableHead className="text-[#64748B]">Property</TableHead>
                        <TableHead className="text-[#64748B]">Landlord</TableHead>
                        <TableHead className="text-[#64748B]">Location</TableHead>
                        <TableHead className="text-[#64748B]">Type</TableHead>
                        <TableHead className="text-center text-[#64748B]">Units</TableHead>
                        <TableHead className="text-center text-[#64748B]">Occupied</TableHead>
                        <TableHead className="text-center text-[#64748B]">Vacant</TableHead>
                        <TableHead className="text-[#64748B]">Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p) => (
                        <TableRow
                          key={p.id}
                          onClick={() => viewOwner(p.landlord_id)}
                          className={cn("border-[#E2E8F0] cursor-pointer", ADMIN_SURFACE_HOVER)}
                        >
                          <TableCell className="font-medium text-[#0F172A]">{p.name}</TableCell>
                          <TableCell>
                            <div className="text-sm text-[#0F172A]">
                              {p.landlord_company || p.landlord_name}
                            </div>
                            {p.landlord_company && (
                              <div className="text-xs text-[#64748B]">{p.landlord_name}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-[#64748B]">
                            {[p.town, p.county].filter(Boolean).join(', ') || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-[#E2E8F0] text-[#1E3A5F] capitalize">
                              {p.property_type || 'residential'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center font-medium text-[#0F172A]">
                            {p.houses_count}
                          </TableCell>
                          <TableCell className="text-center text-success font-medium">
                            {p.occupied_count}
                          </TableCell>
                          <TableCell className="text-center text-warning font-medium">
                            {p.houses_count - p.occupied_count}
                          </TableCell>
                          <TableCell className="text-sm text-[#64748B]">
                            {formatDate(p.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default PropertiesPage;
