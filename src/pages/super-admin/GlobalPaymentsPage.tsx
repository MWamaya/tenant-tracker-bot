import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, DollarSign, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

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

  const { data: payments, isLoading } = useQuery({
    queryKey: ['all-payments'],
    queryFn: async (): Promise<Payment[]> => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .order('payment_date', { ascending: false })
        .limit(200);

      if (error) throw error;
      return data || [];
    },
  });

  const allPayments = payments || [];
  const unmatchedPayments = allPayments.filter(
    (p) => !p.tenant_id || !p.house_id
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
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-300">
                {format(new Date(payment.payment_date), 'MMM d, yyyy')}
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
        <div>
          <h1 className="text-2xl font-bold text-white">Global Payments</h1>
          <p className="text-slate-400">View all payments across all landlords</p>
        </div>

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
              Unmatched ({unmatchedPayments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">All Payments</CardTitle>
                <CardDescription className="text-slate-400">
                  Showing the last 200 payments across all landlords
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
                  <PaymentsList payments={filteredPayments(allPayments)} />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="unmatched">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Unmatched Payments</CardTitle>
                <CardDescription className="text-slate-400">
                  Payments that are not linked to a tenant or house
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
                  <PaymentsList payments={filteredPayments(unmatchedPayments)} />
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
