import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { Search, Building2, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { ROUTES } from '@/lib/routes';
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
  const {
    search: searchQuery,
    setSearch: setSearchQuery,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
  } = useTableViewState('super-admin-properties');

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

  const columns = useMemo<ColumnDef<PropertyRow>[]>(
    () => [
      {
        id: 'Property',
        accessorKey: 'name',
        header: 'Property',
        cell: ({ row }) => <span className="font-medium text-[#0F172A]">{row.original.name}</span>,
      },
      {
        id: 'Landlord',
        accessorFn: (row) => row.landlord_company || row.landlord_name,
        header: 'Landlord',
        cell: ({ row }) => (
          <div>
            <div className="text-sm text-[#0F172A]">{row.original.landlord_company || row.original.landlord_name}</div>
            {row.original.landlord_company && (
              <div className="text-xs text-[#64748B]">{row.original.landlord_name}</div>
            )}
          </div>
        ),
      },
      {
        id: 'Location',
        accessorFn: (row) => [row.town, row.county].filter(Boolean).join(', '),
        header: 'Location',
        cell: ({ row }) => (
          <span className="text-sm text-[#64748B]">
            {[row.original.town, row.original.county].filter(Boolean).join(', ') || '—'}
          </span>
        ),
      },
      {
        id: 'Type',
        accessorFn: (row) => row.property_type || 'residential',
        header: 'Type',
        cell: ({ row }) => (
          <Badge variant="outline" className="border-[#E2E8F0] text-[#1E3A5F] capitalize">
            {row.original.property_type || 'residential'}
          </Badge>
        ),
      },
      {
        id: 'Units',
        accessorKey: 'houses_count',
        header: 'Units',
        cell: ({ row }) => <span className="font-medium text-[#0F172A]">{row.original.houses_count}</span>,
      },
      {
        id: 'Occupied',
        accessorKey: 'occupied_count',
        header: 'Occupied',
        cell: ({ row }) => <span className="text-success font-medium">{row.original.occupied_count}</span>,
      },
      {
        id: 'Vacant',
        accessorFn: (row) => row.houses_count - row.occupied_count,
        header: 'Vacant',
        cell: ({ row }) => (
          <span className="text-warning font-medium">{row.original.houses_count - row.original.occupied_count}</span>
        ),
      },
      {
        id: 'Added',
        accessorKey: 'created_at',
        header: 'Added',
        cell: ({ row }) => <span className="text-sm text-[#64748B]">{formatDate(row.original.created_at)}</span>,
      },
    ],
    []
  );

  const csvColumns: CsvColumn<PropertyRow>[] = [
    { id: 'Property', header: 'Property', accessor: (p) => p.name },
    { header: 'Landlord Company', accessor: (p) => p.landlord_company ?? '' },
    { id: 'Landlord', header: 'Landlord', accessor: (p) => p.landlord_name },
    { id: 'Location', header: 'Location', accessor: (p) => [p.town, p.county].filter(Boolean).join(', ') },
    { id: 'Type', header: 'Type', accessor: (p) => p.property_type ?? 'residential' },
    { id: 'Units', header: 'Units', accessor: (p) => p.houses_count },
    { id: 'Occupied', header: 'Occupied', accessor: (p) => p.occupied_count },
    { id: 'Vacant', header: 'Vacant', accessor: (p) => p.houses_count - p.occupied_count },
    { id: 'Added', header: 'Added', accessor: (p) => p.created_at },
  ];

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
            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {isLoading ? (
                <p className="text-center py-8 text-[#64748B]">Loading…</p>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12">
                  <Building2 className="h-12 w-12 text-[#CBD5E1] mx-auto mb-3" />
                  <p className="text-[#64748B]">No properties found</p>
                </div>
              ) : (
                filtered.map((p) => (
                  <div
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => viewOwner(p.landlord_id)}
                    onKeyDown={(e) => e.key === 'Enter' && viewOwner(p.landlord_id)}
                    className={cn(ADMIN_SURFACE, ADMIN_SURFACE_HOVER, 'p-4 space-y-2 cursor-pointer')}
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
                      <span className="font-medium text-[#0F172A]">{p.landlord_company || p.landlord_name}</span>
                    </div>
                    <div className="flex gap-4 text-xs text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                      <span>{p.houses_count} units</span>
                      <span className="text-success">{p.occupied_count} occupied</span>
                      <span>{p.houses_count - p.occupied_count} vacant</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Desktop table */}
            <div className="hidden md:block">
              <DataTable<PropertyRow>
                columns={columns}
                data={filtered}
                sorting={sorting}
                onSortingChange={setSorting}
                columnVisibility={columnVisibility}
                onColumnVisibilityChange={setColumnVisibility}
                csvColumns={csvColumns}
                csvFilename="kodipap-properties.csv"
                isLoading={isLoading}
                emptyMessage="No properties found"
                onRowClick={(row) => viewOwner(row.landlord_id)}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default PropertiesPage;
