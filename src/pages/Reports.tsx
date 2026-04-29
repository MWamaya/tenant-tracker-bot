import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePayments } from '@/hooks/usePayments';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Users, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const Reports = () => {
  const { data, isLoading } = useDashboardStats();
  const { payments } = usePayments();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);

  const stats = data?.stats;
  const houseBalances = data?.houseBalances || [];
  const unpaidTenants = [...(data?.unpaidHouses || []), ...(data?.partialHouses || [])];

  const collectionRate = stats && stats.totalExpected > 0
    ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
    : 0;

  const monthOptions = useMemo(() => {
    const set = new Set<string>([currentMonth]);
    for (const p of payments) set.add(format(new Date(p.payment_date), 'yyyy-MM'));
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((value) => ({ value, label: format(new Date(value + '-01'), 'MMMM yyyy') }));
  }, [payments, currentMonth]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const hasData = houseBalances.length > 0;

  return (
    <MainLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Generate and export rent collection reports
            </p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collection Rate</p>
                <p className="text-xl font-bold">{collectionRate}%</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Collected</p>
                <p className="text-xl font-bold">{formatCurrency(stats?.totalCollected || 0)}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <AlertTriangle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Outstanding</p>
                <p className="text-xl font-bold">{formatCurrency(stats?.totalOutstanding || 0)}</p>
              </div>
            </div>
          </div>
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <Users className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Defaulters</p>
                <p className="text-xl font-bold">
                  {(stats?.unpaidHouses || 0) + (stats?.partialHouses || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="collection" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="collection">Monthly Collection</TabsTrigger>
            <TabsTrigger value="defaulters">Defaulters List</TabsTrigger>
          </TabsList>

          <TabsContent value="collection" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
              <h2 className="text-lg md:text-xl font-semibold">
                Collection Report — {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
              </h2>
            </div>

            {hasData ? (
              <div className="stat-card p-0 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>House No.</TableHead>
                      <TableHead>Expected Rent</TableHead>
                      <TableHead>Paid Amount</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {houseBalances.map((b) => (
                      <TableRow key={b.houseId} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{b.houseNo}</TableCell>
                        <TableCell>{formatCurrency(b.expectedRent)}</TableCell>
                        <TableCell className="text-success font-medium">
                          {formatCurrency(b.paidAmount)}
                        </TableCell>
                        <TableCell className={b.balance > 0 ? 'text-destructive font-medium' : ''}>
                          {formatCurrency(b.balance)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={b.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="stat-card text-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">No data yet</h3>
                <p className="text-muted-foreground">
                  Add houses and import payments to see the report
                </p>
              </div>
            )}

            {hasData && (
              <div className="stat-card">
                <h3 className="font-semibold mb-4">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                  <div className="p-4 rounded-lg bg-muted/50">
                    <p className="text-2xl font-bold">{stats?.totalHouses || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Houses</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10">
                    <p className="text-2xl font-bold text-success">{stats?.paidHouses || 0}</p>
                    <p className="text-sm text-muted-foreground">Fully Paid</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10">
                    <p className="text-2xl font-bold text-warning">{stats?.partialHouses || 0}</p>
                    <p className="text-sm text-muted-foreground">Partial</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10">
                    <p className="text-2xl font-bold text-destructive">{stats?.unpaidHouses || 0}</p>
                    <p className="text-sm text-muted-foreground">Unpaid</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="defaulters" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg md:text-xl font-semibold">Defaulters List</h2>
            </div>

            {unpaidTenants.length > 0 ? (
              <div className="stat-card p-0 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="table-header">
                      <TableHead>Tenant Name</TableHead>
                      <TableHead>House No.</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidTenants.map((item) => (
                      <TableRow key={item.houseId} className="hover:bg-muted/30">
                        <TableCell className="font-medium">{item.tenantName || 'Unassigned'}</TableCell>
                        <TableCell>{item.houseNo}</TableCell>
                        <TableCell>{item.tenantPhone || '-'}</TableCell>
                        <TableCell>{formatCurrency(item.expectedRent)}</TableCell>
                        <TableCell className="text-success">{formatCurrency(item.paidAmount)}</TableCell>
                        <TableCell className="text-destructive font-medium">
                          {formatCurrency(item.balance)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={item.status} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="stat-card text-center py-12">
                <Users className="h-12 w-12 text-success mx-auto mb-4" />
                <h3 className="text-lg font-medium">No defaulters</h3>
                <p className="text-muted-foreground">All tenants are up to date</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;
