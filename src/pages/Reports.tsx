import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { balances, payments, tenants, houses, getDashboardStats } from '@/lib/mockData';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, FileText, Users, TrendingUp, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

const Reports = () => {
  const [selectedMonth, setSelectedMonth] = useState('2025-01');
  const stats = getDashboardStats();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const unpaidTenants = balances
    .filter(b => b.status === 'unpaid' || b.status === 'partial')
    .map(b => {
      const tenant = tenants.find(t => t.houseId === b.houseId);
      return { ...b, tenant };
    });

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
            <p className="text-muted-foreground mt-1">
              Generate and export rent collection reports
            </p>
          </div>
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2025-01">January 2025</SelectItem>
              <SelectItem value="2024-12">December 2024</SelectItem>
              <SelectItem value="2024-11">November 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Collection Rate</p>
                <p className="text-xl font-bold">{stats.collectionRate}%</p>
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
                <p className="text-xl font-bold">{stats.unpaidHouses + stats.partialHouses}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Report Tabs */}
        <Tabs defaultValue="collection" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="collection">Monthly Collection</TabsTrigger>
            <TabsTrigger value="defaulters">Defaulters List</TabsTrigger>
            <TabsTrigger value="statements">Tenant Statements</TabsTrigger>
          </TabsList>

          <TabsContent value="collection" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">
                Collection Report - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
              </h2>
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
                <Button className="gap-2">
                  <Download className="h-4 w-4" />
                  Export PDF
                </Button>
              </div>
            </div>

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
                  {balances.map((balance) => (
                    <TableRow key={balance.houseId} className="hover:bg-muted/30">
                      <TableCell className="font-medium">{balance.houseNo}</TableCell>
                      <TableCell>{formatCurrency(balance.expectedRent)}</TableCell>
                      <TableCell className="text-success font-medium">
                        {formatCurrency(balance.paidAmount)}
                      </TableCell>
                      <TableCell className={balance.balance > 0 ? 'text-destructive font-medium' : ''}>
                        {formatCurrency(balance.balance)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={balance.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Summary */}
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
          </TabsContent>

          <TabsContent value="defaulters" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Defaulters List</h2>
              <Button variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export List
              </Button>
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
                        <TableCell className="font-medium">
                          {item.tenant?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{item.houseNo}</TableCell>
                        <TableCell>{item.tenant?.phone || '-'}</TableCell>
                        <TableCell>{formatCurrency(item.expectedRent)}</TableCell>
                        <TableCell className="text-success">
                          {formatCurrency(item.paidAmount)}
                        </TableCell>
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
                <h3 className="text-lg font-medium">No defaulters!</h3>
                <p className="text-muted-foreground">All tenants have fully paid</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="statements" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Tenant Statements</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tenants.map((tenant) => {
                const house = houses.find(h => h.id === tenant.houseId);
                const balance = balances.find(b => b.houseId === tenant.houseId);
                const tenantPayments = payments.filter(p => p.tenantId === tenant.id);

                return (
                  <div key={tenant.id} className="stat-card">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold">{tenant.name}</h3>
                        <p className="text-sm text-muted-foreground">{house?.houseNo}</p>
                      </div>
                      {balance && <StatusBadge status={balance.status} />}
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Expected Rent</span>
                        <span className="font-medium">{formatCurrency(house?.expectedRent || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Payments Made</span>
                        <span className="font-medium">{tenantPayments.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Balance</span>
                        <span className={`font-medium ${balance?.balance ? 'text-destructive' : 'text-success'}`}>
                          {formatCurrency(balance?.balance || 0)}
                        </span>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full mt-4 gap-2">
                      <FileText className="h-4 w-4" />
                      Generate Statement
                    </Button>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Reports;
