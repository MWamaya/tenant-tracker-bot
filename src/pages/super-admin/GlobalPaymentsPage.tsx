import { useState } from 'react';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, DollarSign, AlertTriangle, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { formatDate } from '@/lib/dates';
import { PaymentStatementUploadDialog } from '@/components/payments/PaymentStatementUploadDialog';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedLandlord, setSelectedLandlord] = useState<string>('');

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

  const PaymentsList = ({ payments }: { payments: Payment[] }) => (
    <div className="space-y-3">
      {payments.length === 0 ? (
        <div className="text-center py-12">
          <DollarSign className="h-12 w-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">No payments found</p>
        </div>
      ) : (
        payments.map((payment) => (
          <div
            key={payment.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-lg bg-slate-900/50"
          >
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-white">
                  KES {payment.amount.toLocaleString()}
                </span>
                <Badge variant="outline" className="border-slate-600 text-slate-400 font-mono">
                  {payment.mpesa_ref}
                </Badge>
                {(!payment.tenant_id || !payment.house_id) && (
                  <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                    Unmatched
                  </Badge>
                )}
              </div>
              <p className="text-sm text-slate-400 mt-1">
                {payment.sender_name || 'Unknown'} • {payment.sender_phone || 'No phone'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {landlordNameById.get(payment.landlord_id) || 'Unknown landlord'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">
                {formatDate(payment.payment_date)}
              </p>
              <p className="text-xs text-slate-500">
                {format(new Date(payment.payment_date), 'HH:mm')}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Global Payments</h1>
            <p className="text-slate-400">View all payments across all landlords</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Select value={selectedLandlord} onValueChange={setSelectedLandlord}>
              <SelectTrigger className="w-full sm:w-64 bg-slate-900/50 border-slate-600 text-white">
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
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by M-Pesa ref, sender name, or phone..."
                className="pl-10 bg-slate-900/50 border-slate-600 text-white"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Payments Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList className="bg-slate-800 border-slate-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-700">
              All Payments ({allPayments.length})
            </TabsTrigger>
            <TabsTrigger value="unmatched" className="data-[state=active]:bg-slate-700">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Unmatched ({unmatchedTotal ?? unmatchedPayments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">All Payments</CardTitle>
                <CardDescription className="text-slate-400">
                  Across all landlords, newest first
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Skeleton key={i} className="h-16 w-full bg-slate-700" />
                    ))}
                  </div>
                ) : (
                  <>
                    <PaymentsList payments={filteredPayments(allPayments)} />
                    {hasNextPage && (
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-slate-600 text-slate-200 hover:bg-slate-800"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? 'Loading…' : 'Load more'}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unmatched">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Unmatched Payments</CardTitle>
                <CardDescription className="text-slate-400">
                  Payments that are not linked to a tenant or house, among those loaded
                  below — the tab count above is the real platform-wide total
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full bg-slate-700" />
                    ))}
                  </div>
                ) : (
                  <>
                    <PaymentsList payments={filteredPayments(unmatchedPayments)} />
                    {hasNextPage && (
                      <Button
                        variant="outline"
                        className="w-full mt-4 border-slate-600 text-slate-200 hover:bg-slate-800"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                      >
                        {isFetchingNextPage ? 'Loading…' : 'Load more'}
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminLayout>
  );
};

export default GlobalPaymentsPage;
