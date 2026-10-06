import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { useLandlords } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate } from '@/lib/dates';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { ROUTES } from '@/lib/routes';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

interface PlatformPayment {
  id: string;
  amount: number;
  landlord_id: string;
  subscription_id: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  status: string;
  notes: string | null;
  created_at: string;
}

const statusBadgeClass = (status: string) => {
  if (status === 'completed') return STATUS_BADGE_CLASSES.success;
  if (status === 'failed') return STATUS_BADGE_CLASSES.destructive;
  return STATUS_BADGE_CLASSES.warning;
};

const GlobalPaymentsPage = () => {
  const navigate = useNavigate();
  const view = useTableViewState('super-admin-platform-payments');
  const searchQuery = view.search;
  const setSearchQuery = view.setSearch;
  const { data: allLandlords } = useLandlords();

  const { data: landlords } = useQuery({
    queryKey: ['all-landlords-for-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, company_name')
        .order('full_name');
      if (error) throw error;
      return data || [];
    },
  });

  const PAGE_SIZE = 100;
  const {
    data: paymentPages,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['platform-revenue'],
    queryFn: async ({ pageParam }): Promise<PlatformPayment[]> => {
      const { data, error } = await supabase
        .from('platform_revenue')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) throw error;
      return data || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  });

  const payments = paymentPages?.pages.flat() || [];

  // Independent of the paginated list above (which may not include every
  // payment) — just the distinct landlord_ids that have ever paid, so
  // "comped" below is accurate even past page 1.
  const { data: paidLandlordIds } = useQuery({
    queryKey: ['platform-revenue-landlord-ids'],
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase.from('platform_revenue').select('landlord_id');
      if (error) throw error;
      return new Set((data || []).map((r) => r.landlord_id));
    },
  });

  const compedLandlords = (allLandlords || []).filter(
    (l) => l.subscription && l.subscription.plan_name !== 'Free Trial' && !paidLandlordIds?.has(l.id)
  );

  const landlordNameById = new Map(
    (landlords || []).map((l) => [l.id, l.full_name || l.company_name || 'Unknown landlord'])
  );

  const filteredPayments = payments.filter((payment) => {
    const landlordName = landlordNameById.get(payment.landlord_id) || '';
    const q = searchQuery.toLowerCase();
    return (
      payment.payment_reference?.toLowerCase().includes(q) ||
      landlordName.toLowerCase().includes(q)
    );
  });

  const columns = useMemo<ColumnDef<PlatformPayment>[]>(
    () => [
      {
        id: 'Amount',
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => `KES ${row.original.amount.toLocaleString()}`,
      },
      {
        id: 'Landlord',
        accessorFn: (row) => landlordNameById.get(row.landlord_id) || 'Unknown landlord',
        header: 'Landlord',
      },
      {
        id: 'Reference',
        accessorKey: 'payment_reference',
        header: 'Reference',
        cell: ({ row }) =>
          row.original.payment_reference ? (
            <Badge variant="outline" className="font-mono">
              {row.original.payment_reference}
            </Badge>
          ) : (
            <span className="text-[#64748B]">—</span>
          ),
      },
      {
        id: 'Method',
        accessorFn: (row) => row.payment_method || '',
        header: 'Method',
        cell: ({ row }) => (
          <span className="capitalize">{row.original.payment_method?.replace(/_/g, ' ') || '—'}</span>
        ),
      },
      {
        id: 'Status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
      },
      {
        id: 'Date',
        accessorKey: 'created_at',
        header: 'Date',
        cell: ({ row }) => (
          <div>
            <p>{formatDate(row.original.created_at)}</p>
            <p className="text-xs text-[#64748B]">{format(new Date(row.original.created_at), 'HH:mm')}</p>
          </div>
        ),
      },
    ],
    [landlordNameById]
  );

  const csvColumns: CsvColumn<PlatformPayment>[] = [
    { id: 'Amount', header: 'Amount', accessor: (p) => p.amount },
    { id: 'Landlord', header: 'Landlord', accessor: (p) => landlordNameById.get(p.landlord_id) ?? 'Unknown landlord' },
    { id: 'Reference', header: 'Reference', accessor: (p) => p.payment_reference ?? '' },
    { id: 'Method', header: 'Method', accessor: (p) => p.payment_method ?? '' },
    { id: 'Status', header: 'Status', accessor: (p) => p.status },
    { id: 'Date', header: 'Date', accessor: (p) => p.created_at },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Platform Payments</h1>
          <p className="text-[#64748B]">
            Subscription payments landlords have made to Kodipap — not their tenants' rent
          </p>
        </div>

        {/* Comped subscriptions */}
        {paidLandlordIds && compedLandlords.length > 0 && (
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-[#64748B] flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                {compedLandlords.length} active subscription{compedLandlords.length === 1 ? '' : 's'} with no payment on record
              </CardTitle>
              <CardDescription className="text-[#64748B]">
                Paid plans assigned without an amount entered — intentional comps, or ones worth double-checking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {compedLandlords.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => navigate(`${ROUTES.SUPER_ADMIN_LANDLORD_DETAIL}?landlord=${l.id}`)}
                  className={cn('w-full flex items-center justify-between p-3 text-left', ADMIN_SURFACE, ADMIN_SURFACE_HOVER)}
                >
                  <span className="text-sm text-[#0F172A]">{l.full_name || l.company_name || 'Unknown landlord'}</span>
                  <Badge variant="outline" className="border-warning/40 text-warning">
                    {l.subscription?.plan_name}
                  </Badge>
                </button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Search */}
        <Card className={ADMIN_CARD}>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
              <Input
                placeholder="Search by reference or landlord..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">
              Subscription Payments
            </CardTitle>
            <CardDescription className="text-[#64748B]">
              Across all landlords, newest first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable<PlatformPayment>
              columns={columns}
              data={filteredPayments}
              sorting={view.sorting}
              onSortingChange={view.setSorting}
              columnVisibility={view.columnVisibility}
              onColumnVisibilityChange={view.setColumnVisibility}
              csvColumns={csvColumns}
              csvFilename="kodipap-platform-payments.csv"
              isLoading={isLoading}
              emptyMessage="No subscription payments found"
              footer={
                hasNextPage ? (
                  <Button
                    variant="outline"
                    className={cn('w-full border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                ) : undefined
              }
            />
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default GlobalPaymentsPage;
