import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { usePayments } from '@/hooks/usePayments';
import { useProperties } from '@/hooks/useProperties';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
import { FileText, Users, TrendingUp, AlertTriangle, Loader2, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

const Reports = () => {
  const { data, isLoading } = useDashboardStats();
  const { payments } = usePayments();
  const { properties } = useProperties();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);

  const allHouseBalances = data?.houseBalances || [];

  const houseBalances = useMemo(() => {
    if (selectedProperty === 'all') return allHouseBalances;
    if (selectedProperty === 'none') return allHouseBalances.filter(b => !b.propertyId);
    return allHouseBalances.filter(b => b.propertyId === selectedProperty);
  }, [allHouseBalances, selectedProperty]);

  const stats = useMemo(() => {
    const totalExpected = houseBalances.reduce((s, b) => s + b.expectedRent, 0);
    const totalCollected = houseBalances.reduce((s, b) => s + b.paidAmount, 0);
    const totalOutstanding = houseBalances.reduce((s, b) => s + b.balance, 0);
    return {
      totalHouses: houseBalances.length,
      totalExpected,
      totalCollected,
      totalOutstanding,
      paidHouses: houseBalances.filter(b => b.status === 'paid').length,
      partialHouses: houseBalances.filter(b => b.status === 'partial').length,
      unpaidHouses: houseBalances.filter(b => b.status === 'unpaid').length,
    };
  }, [houseBalances]);

  const unpaidTenants = useMemo(
    () => houseBalances.filter(b => b.status === 'unpaid' || b.status === 'partial'),
    [houseBalances]
  );

  const collectionRate = stats.totalExpected > 0
    ? Math.round((stats.totalCollected / stats.totalExpected) * 100)
    : 0;

  const monthOptions = useMemo(() => {
    const set = new Set<string>([currentMonth]);
    for (const p of payments) set.add(format(new Date(p.payment_date), 'yyyy-MM'));
    return Array.from(set)
      .sort((a, b) => b.localeCompare(a))
      .map((value) => ({ value, label: format(new Date(value + '-01'), 'MMMM yyyy') }));
  }, [payments, currentMonth]);

  const selectedPropertyName =
    selectedProperty === 'all'
      ? 'All Properties'
      : selectedProperty === 'none'
      ? 'Unassigned Houses'
      : properties.find(p => p.id === selectedProperty)?.name || 'Property';

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
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <Select value={selectedProperty} onValueChange={setSelectedProperty}>
              <SelectTrigger className="w-full sm:w-56">
                <SelectValue placeholder="Select property" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
                <SelectItem value="none">Unassigned Houses</SelectItem>
              </SelectContent>
            </Select>
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
        </div>

        <p className="text-sm text-muted-foreground">
          Showing: <span className="font-medium text-foreground">{selectedPropertyName}</span>
        </p>

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
                <p className="text-xl font-bold">{formatCurrency(stats.totalCollected)}</p>
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
                <p className="text-xl font-bold">{formatCurrency(stats.totalOutstanding)}</p>
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
                  {stats.unpaidHouses + stats.partialHouses}
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
                      {selectedProperty === 'all' && <TableHead>Property</TableHead>}
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
                        {selectedProperty === 'all' && (
                          <TableCell className="text-muted-foreground">
                            {b.propertyName || '-'}
                          </TableCell>
                        )}
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
                    <p className="text-2xl font-bold">{stats.totalHouses}</p>
                    <p className="text-sm text-muted-foreground">Total Houses</p>
                  </div>
                  <div className="p-4 rounded-lg bg-success/10">
                    <p className="text-2xl font-bold text-success">{stats.paidHouses}</p>
                    <p className="text-sm text-muted-foreground">Fully Paid</p>
                  </div>
                  <div className="p-4 rounded-lg bg-warning/10">
                    <p className="text-2xl font-bold text-warning">{stats.partialHouses}</p>
                    <p className="text-sm text-muted-foreground">Partial</p>
                  </div>
                  <div className="p-4 rounded-lg bg-destructive/10">
                    <p className="text-2xl font-bold text-destructive">{stats.unpaidHouses}</p>
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
                      {selectedProperty === 'all' && <TableHead>Property</TableHead>}
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
                        {selectedProperty === 'all' && (
                          <TableCell className="text-muted-foreground">
                            {item.propertyName || '-'}
                          </TableCell>
                        )}
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
