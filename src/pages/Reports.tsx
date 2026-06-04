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
import { FileText, Users, TrendingUp, AlertTriangle, Loader2, Printer, Phone, Home, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import {
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  ResponsiveContainer,
} from 'recharts';

const Reports = () => {
  const { payments } = usePayments();
  const { properties } = useProperties();
  const currentMonth = format(new Date(), 'yyyy-MM');
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const { data, isLoading } = useDashboardStats(selectedMonth);

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
      <MainLayout seo={{ title: "Reports \u2014 KODI PAP", description: "Collection rate, defaulters and monthly rent reports.", path: "/reports" }}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  const hasData = houseBalances.length > 0;

  return (
    <MainLayout seo={{ title: "Reports \u2014 KODI PAP", description: "Collection rate, defaulters and monthly rent reports.", path: "/reports" }}>
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

        {hasData && (
          <>
            {/* Graphic Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Collection Rate Gauge */}
              <div className="stat-card relative overflow-hidden lg:col-span-1 bg-gradient-to-br from-primary/5 via-card to-card">
                <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-muted-foreground">Collection Rate</h3>
                    <TrendingUp className="h-4 w-4 text-primary" />
                  </div>
                  <div className="relative h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart
                        innerRadius="75%"
                        outerRadius="100%"
                        data={[{ name: 'rate', value: collectionRate, fill: 'hsl(var(--primary))' }]}
                        startAngle={90}
                        endAngle={-270}
                      >
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar background={{ fill: 'hsl(var(--muted))' }} dataKey="value" cornerRadius={20} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-5xl font-bold text-primary tabular-nums">{collectionRate}%</p>
                      <p className="text-xs text-muted-foreground mt-1">of expected rent</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-center">
                    <div className="p-2 rounded-lg bg-success/10">
                      <p className="text-xs text-muted-foreground">Collected</p>
                      <p className="text-sm font-semibold text-success">{formatCurrency(stats.totalCollected)}</p>
                    </div>
                    <div className="p-2 rounded-lg bg-warning/10">
                      <p className="text-xs text-muted-foreground">Outstanding</p>
                      <p className="text-sm font-semibold text-warning">{formatCurrency(stats.totalOutstanding)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* House Status Donut */}
              <div className="stat-card lg:col-span-1">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-muted-foreground">Houses Breakdown</h3>
                  <Home className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Paid', value: stats.paidHouses, color: 'hsl(var(--success))' },
                          { name: 'Partial', value: stats.partialHouses, color: 'hsl(var(--warning))' },
                          { name: 'Unpaid', value: stats.unpaidHouses, color: 'hsl(var(--destructive))' },
                        ].filter(d => d.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={2}
                        strokeWidth={0}
                      >
                        {[
                          'hsl(var(--success))',
                          'hsl(var(--warning))',
                          'hsl(var(--destructive))',
                        ].map((c, i) => (
                          <Cell key={i} fill={c} />
                        ))}
                      </Pie>
                      <RTooltip
                        contentStyle={{
                          background: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-1 text-center">
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-success" />
                      <p className="text-xs text-muted-foreground">Paid</p>
                    </div>
                    <p className="text-lg font-bold text-success">{stats.paidHouses}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-warning" />
                      <p className="text-xs text-muted-foreground">Partial</p>
                    </div>
                    <p className="text-lg font-bold text-warning">{stats.partialHouses}</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-destructive" />
                      <p className="text-xs text-muted-foreground">Unpaid</p>
                    </div>
                    <p className="text-lg font-bold text-destructive">{stats.unpaidHouses}</p>
                  </div>
                </div>
              </div>

              {/* Top Defaulters */}
              <div className="stat-card lg:col-span-1">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-muted-foreground">Top Defaulters</h3>
                  <TrendingDown className="h-4 w-4 text-destructive" />
                </div>
                {unpaidTenants.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={unpaidTenants
                          .slice()
                          .sort((a, b) => b.balance - a.balance)
                          .slice(0, 5)
                          .map(t => ({
                            name: t.tenantName ? t.tenantName.split(' ')[0] : `H${t.houseNo}`,
                            balance: t.balance,
                          }))}
                        layout="vertical"
                        margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
                      >
                        <XAxis type="number" hide />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={70}
                          tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <RTooltip
                          cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                          contentStyle={{
                            background: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: 8,
                            fontSize: 12,
                          }}
                          formatter={(v: number) => formatCurrency(v)}
                        />
                        <Bar dataKey="balance" fill="hsl(var(--destructive))" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-full bg-success/10 flex items-center justify-center mb-2">
                      <Users className="h-6 w-6 text-success" />
                    </div>
                    <p className="text-sm font-medium">All clear</p>
                    <p className="text-xs text-muted-foreground">No defaulters this month</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

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
              {unpaidTenants.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const win = window.open('', '_blank', 'width=900,height=700');
                    if (!win) return;
                    const rows = unpaidTenants.map(item => `
                      <tr>
                        <td>${item.tenantName || 'Unassigned'}</td>
                        <td>${item.houseNo}</td>
                        ${selectedProperty === 'all' ? `<td>${item.propertyName || '-'}</td>` : ''}
                        <td>${item.tenantPhone || '-'}</td>
                        <td>${formatCurrency(item.expectedRent)}</td>
                        <td>${formatCurrency(item.paidAmount)}</td>
                        <td style="color:#dc2626;font-weight:600">${formatCurrency(item.balance)}</td>
                        <td>${item.status}</td>
                      </tr>
                    `).join('');
                    win.document.write(`
                      <html><head><title>Defaulters List - ${selectedPropertyName}</title>
                      <style>
                        body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}
                        h1{font-size:20px;margin:0 0 4px}
                        p{margin:0 0 16px;color:#64748b;font-size:13px}
                        table{width:100%;border-collapse:collapse;font-size:13px}
                        th,td{border:1px solid #e2e8f0;padding:8px 10px;text-align:left}
                        th{background:#f1f5f9;font-weight:600}
                      </style></head><body>
                      <h1>KODI PAP — Defaulters List</h1>
                      <p>${selectedPropertyName} — Printed ${format(new Date(), 'dd/MM/yyyy')}</p>
                      <table>
                        <thead><tr>
                          <th>Tenant</th><th>House No.</th>
                          ${selectedProperty === 'all' ? '<th>Property</th>' : ''}
                          <th>Phone</th><th>Expected</th><th>Paid</th><th>Outstanding</th><th>Status</th>
                        </tr></thead>
                        <tbody>${rows}</tbody>
                      </table>
                      </body></html>
                    `);
                    win.document.close();
                    win.focus();
                    setTimeout(() => win.print(), 300);
                  }}
                >
                  <Printer className="h-4 w-4" /> Print
                </Button>
              )}
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
