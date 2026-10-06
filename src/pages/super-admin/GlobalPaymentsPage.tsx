import { useMemo, useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, AlertTriangle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate } from '@/lib/dates';
import { PaymentStatementUploadDialog } from '@/components/payments/PaymentStatementUploadDialog';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD } from '@/lib/adminStatusColors';

interface Payment {
  id: string;
  amount: number;
  mpesa_ref: string;
  payment_date: string;
  sender_name: string | null;
  sender_phone: string | null;
  tenant_id: string | null;
  house_id: string | null;
  landlord_id: string;
  created_at: string;
}

const GlobalPaymentsPage = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'unmatched' ? 'unmatched' : 'all';
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState<string>('');
  const allView = useTableViewState('super-admin-payments-all');
  const unmatchedView = useTableViewState('super-admin-payments-unmatched');

  const { data: landlords } = useQuery({
    queryKey: ['all-landlords-for-upload'],
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
    queryKey: ['all-payments'],
    queryFn: async ({ pageParam }): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1);

      if (error) throw error;
      return data || [];
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === PAGE_SIZE ? allPages.length * PAGE_SIZE : undefined,
  });

  const payments = paymentPages?.pages.flat();

  // The list above is capped at the most recent 200 payments, so deriving
  // the "Unmatched" count from it undercounts once a landlord has more than
  // that — and disagrees with the dashboard's exact platform-wide count.
  // This mirrors usePlatformStats' query so the two numbers always match.
  const { data: unmatchedTotal } = useQuery({
    queryKey: ['all-payments-unmatched-count'],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .or('tenant_id.is.null,house_id.is.null');

      if (error) throw error;
      return count || 0;
    },
  });

  const allPayments = payments || [];
  const unmatchedPayments = allPayments.filter(
    (p) => !p.tenant_id || !p.house_id
  );

  // This page's whole point is cross-landlord visibility, so every row
  // needs to say whose payment it is — reuses the upload dropdown's query
  // rather than firing a second landlords fetch.
  const landlordNameById = new Map(
    (landlords || []).map((l) => [l.id, l.full_name || l.company_name || 'Unknown landlord'])
  );

  const filteredPayments = (list: Payment[]) =>
    list.filter(
      (payment) =>
        payment.mpesa_ref?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.sender_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.sender_phone?.includes(searchQuery)
    );

  const columns = useMemo<ColumnDef<Payment>[]>(
    () => [
      {
        id: 'Amount',
        accessorKey: 'amount',
        header: 'Amount',
        cell: ({ row }) => `KES ${row.original.amount.toLocaleString()}`,
      },
      {
        id: 'Ref',
        accessorKey: 'mpesa_ref',
        header: 'M-Pesa Ref',
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono">
            {row.original.mpesa_ref}
          </Badge>
        ),
      },
      {
        id: 'Sender',
        accessorFn: (row) => row.sender_name || '',
        header: 'Sender',
        cell: ({ row }) => (
          <div>
            <p className="text-[#0F172A]">{row.original.sender_name || 'Unknown'}</p>
            <p className="text-xs text-[#64748B]">{row.original.sender_phone || 'No phone'}</p>
          </div>
        ),
      },
      {
        id: 'Landlord',
        accessorFn: (row) => landlordNameById.get(row.landlord_id) || 'Unknown landlord',
        header: 'Landlord',
      },
      {
        id: 'Date',
        accessorKey: 'payment_date',
        header: 'Date',
        cell: ({ row }) => (
          <div>
            <p>{formatDate(row.original.payment_date)}</p>
            <p className="text-xs text-[#64748B]">
              {format(new Date(row.original.payment_date), 'HH:mm')}
            </p>
          </div>
        ),
      },
      {
        id: 'Status',
        header: 'Status',
        enableSorting: false,
        cell: ({ row }) =>
          !row.original.tenant_id || !row.original.house_id ? (
            <Badge variant="outline" className={STATUS_BADGE_CLASSES.warning}>
              Unmatched
            </Badge>
          ) : (
            <Badge variant="outline" className={STATUS_BADGE_CLASSES.success}>
              Matched
            </Badge>
          ),
      },
    ],
    [landlordNameById]
  );

  const csvColumns: CsvColumn<Payment>[] = [
    { header: 'Amount', accessor: (p) => p.amount },
    { header: 'M-Pesa Ref', accessor: (p) => p.mpesa_ref },
    { header: 'Sender Name', accessor: (p) => p.sender_name ?? '' },
    { header: 'Sender Phone', accessor: (p) => p.sender_phone ?? '' },
    { header: 'Landlord', accessor: (p) => landlordNameById.get(p.landlord_id) ?? 'Unknown landlord' },
    { header: 'Date', accessor: (p) => p.payment_date },
    {
      header: 'Status',
      accessor: (p) => (!p.tenant_id || !p.house_id ? 'Unmatched' : 'Matched'),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Global Payments</h1>
            <p className="text-[#64748B]">View all payments across all landlords</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={selectedLandlord} onValueChange={setSelectedLandlord}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select landlord for upload" />
              </SelectTrigger>
              <SelectContent>
                {(landlords || []).map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.full_name || l.company_name || l.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => setUploadOpen(true)}
              disabled={!selectedLandlord}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import Statement
            </Button>
          </div>
        </div>

        <PaymentStatementUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          landlordId={selectedLandlord || null}
          scopeLabel={
            landlords?.find((l) => l.id === selectedLandlord)?.full_name ||
            landlords?.find((l) => l.id === selectedLandlord)?.company_name ||
            undefined
          }
        />

        {/* Search */}
        <Card className={ADMIN_CARD}>
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
              <Input
                placeholder="Search by M-Pesa ref, sender name, or phone..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payments Tabs */}
        <Tabs defaultValue={initialTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="all" className="data-[state=active]:bg-[#F1F5F9]">
              All Payments ({allPayments.length})
            </TabsTrigger>
            <TabsTrigger value="unmatched" className="data-[state=active]:bg-[#F1F5F9]">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Unmatched ({unmatchedTotal ?? unmatchedPayments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className={ADMIN_CARD}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">All Payments</CardTitle>
                <CardDescription className="text-[#64748B]">
                  Across all landlords, newest first
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable<Payment>
                  columns={columns}
                  data={filteredPayments(allPayments)}
                  sorting={allView.sorting}
                  onSortingChange={allView.setSorting}
                  columnVisibility={allView.columnVisibility}
                  onColumnVisibilityChange={allView.setColumnVisibility}
                  csvColumns={csvColumns}
                  csvFilename="kodipap-payments-all.csv"
                  isLoading={isLoading}
                  emptyMessage="No payments found"
                  footer={
                    hasNextPage ? (
                      <Button
                        variant="outline"
                        className="w-full border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#F1F5F9]"
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
          </TabsContent>

          <TabsContent value="unmatched">
            <Card className={ADMIN_CARD}>
              <CardHeader>
                <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Unmatched Payments</CardTitle>
                <CardDescription className="text-[#64748B]">
                  Payments that are not linked to a tenant or house, among those loaded
                  below — the tab count above is the real platform-wide total
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DataTable<Payment>
                  columns={columns}
                  data={filteredPayments(unmatchedPayments)}
                  sorting={unmatchedView.sorting}
                  onSortingChange={unmatchedView.setSorting}
                  columnVisibility={unmatchedView.columnVisibility}
                  onColumnVisibilityChange={unmatchedView.setColumnVisibility}
                  csvColumns={csvColumns}
                  csvFilename="kodipap-payments-unmatched.csv"
                  isLoading={isLoading}
                  emptyMessage="No payments found"
                  footer={
                    hasNextPage ? (
                      <Button
                        variant="outline"
                        className="w-full border-[#E2E8F0] text-[#1E3A5F] hover:bg-[#F1F5F9]"
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
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default GlobalPaymentsPage;
