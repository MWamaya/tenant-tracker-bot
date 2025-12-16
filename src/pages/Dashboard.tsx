import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { CollectionProgress } from '@/components/dashboard/CollectionProgress';
import { RecentPayments } from '@/components/dashboard/RecentPayments';
import { HouseStatusChart } from '@/components/dashboard/HouseStatusChart';
import { getDashboardStats, balances, tenants } from '@/lib/mockData';
import { Home, CheckCircle, AlertCircle, XCircle, Banknote, Phone, User, MessageCircle, MessageSquare } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('unpaid');
  const tabsRef = useRef<HTMLDivElement>(null);

  const scrollToTabs = (tab: string) => {
    setActiveTab(tab);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const stats = getDashboardStats();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const unpaidHouses = balances.filter(b => b.status === 'unpaid');
  const partialHouses = balances.filter(b => b.status === 'partial');
  const paidHouses = balances.filter(b => b.status === 'paid');

  const getTenant = (houseId: string) => {
    return tenants.find(t => t.houseId === houseId);
  };

  const getTenantName = (houseId: string) => {
    const tenant = getTenant(houseId);
    return tenant?.name || 'Vacant';
  };

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            January 2025 rent collection overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Houses"
            value={stats.totalHouses}
            subtitle="Active properties"
            icon={Home}
            variant="default"
          />
          <StatCard
            title="Fully Paid"
            value={stats.paidHouses}
            subtitle={`${Math.round((stats.paidHouses / stats.totalHouses) * 100)}% of total`}
            icon={CheckCircle}
            variant="success"
          />
          <div onClick={() => scrollToTabs('partial')} className="cursor-pointer">
            <StatCard
              title="Partially Paid"
              value={stats.partialHouses}
              subtitle="Pending balance"
              icon={AlertCircle}
              variant="warning"
            />
          </div>
          <div onClick={() => scrollToTabs('unpaid')} className="cursor-pointer">
            <StatCard
              title="Unpaid"
              value={stats.unpaidHouses}
              subtitle="No payments received"
              icon={XCircle}
              variant="danger"
            />
          </div>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Expected"
            value={formatCurrency(stats.totalExpected)}
            icon={Banknote}
            variant="default"
          />
          <StatCard
            title="Total Collected"
            value={formatCurrency(stats.totalCollected)}
            icon={Banknote}
            variant="success"
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Outstanding Balance"
            value={formatCurrency(stats.totalOutstanding)}
            icon={Banknote}
            variant="danger"
          />
        </div>

        <div className="stat-card animate-slide-up" ref={tabsRef}>
          <h3 className="text-lg font-semibold mb-4">House Payment Status</h3>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="unpaid" className="flex gap-2">
                <XCircle className="h-4 w-4" />
                Unpaid ({unpaidHouses.length})
              </TabsTrigger>
              <TabsTrigger value="partial" className="flex gap-2">
                <AlertCircle className="h-4 w-4" />
                Partial ({partialHouses.length})
              </TabsTrigger>
              <TabsTrigger value="paid" className="flex gap-2">
                <CheckCircle className="h-4 w-4" />
                Paid ({paidHouses.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="unpaid" className="mt-4">
              {unpaidHouses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No unpaid houses</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>House</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unpaidHouses.map((house) => {
                      const tenant = getTenant(house.houseId);
                      return (
                        <TableRow key={house.houseId}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <XCircle className="h-4 w-4 text-destructive" />
                              {house.houseNo}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {tenant?.name || 'Vacant'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tenant ? (
                              <div className="flex items-center gap-3">
                                <a href={`tel:${tenant.phone}`} className="text-primary hover:underline" title="Call">
                                  <Phone className="h-4 w-4" />
                                </a>
                                <a href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700" title="WhatsApp">
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                                <a href={`sms:${tenant.phone}`} className="text-blue-600 hover:text-blue-700" title="SMS">
                                  <MessageSquare className="h-4 w-4" />
                                </a>
                                <span className="text-sm">{tenant.phone}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-destructive font-medium">
                            {formatCurrency(house.balance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="partial" className="mt-4">
              {partialHouses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No partially paid houses</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>House</TableHead>
                      <TableHead>Tenant</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partialHouses.map((house) => {
                      const tenant = getTenant(house.houseId);
                      return (
                        <TableRow key={house.houseId}>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-yellow-600" />
                              {house.houseNo}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground" />
                              {tenant?.name || 'Vacant'}
                            </div>
                          </TableCell>
                          <TableCell>
                            {tenant ? (
                              <div className="flex items-center gap-3">
                                <a href={`tel:${tenant.phone}`} className="text-primary hover:underline" title="Call">
                                  <Phone className="h-4 w-4" />
                                </a>
                                <a href={`https://wa.me/${tenant.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:text-green-700" title="WhatsApp">
                                  <MessageCircle className="h-4 w-4" />
                                </a>
                                <a href={`sms:${tenant.phone}`} className="text-blue-600 hover:text-blue-700" title="SMS">
                                  <MessageSquare className="h-4 w-4" />
                                </a>
                                <span className="text-sm">{tenant.phone}</span>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-green-600">
                            {formatCurrency(house.paidAmount)}
                          </TableCell>
                          <TableCell className="text-right text-yellow-600 font-medium">
                            {formatCurrency(house.balance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
            
            <TabsContent value="paid" className="mt-4">
              <div className="flex flex-wrap gap-3">
                {paidHouses.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No fully paid houses</p>
                ) : (
                  paidHouses.map((house) => (
                    <div key={house.houseId} className="flex items-center gap-2 p-3 rounded-lg border border-green-500/30 bg-green-500/5">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <div>
                        <p className="font-medium text-sm">{house.houseNo}</p>
                        <p className="text-xs text-muted-foreground">{getTenantName(house.houseId)}</p>
                        <p className="text-xs text-green-600 font-medium">{formatCurrency(house.paidAmount)} paid</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CollectionProgress
            collected={stats.totalCollected}
            expected={stats.totalExpected}
            percentage={stats.collectionRate}
          />
          <HouseStatusChart
            paid={stats.paidHouses}
            partial={stats.partialHouses}
            unpaid={stats.unpaidHouses}
          />
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentPayments />
          <div className="stat-card animate-slide-up">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <button className="w-full p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                <p className="font-medium">Add Manual Payment</p>
                <p className="text-sm text-muted-foreground">Record a payment manually</p>
              </button>
              <button className="w-full p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                <p className="font-medium">Send Payment Reminders</p>
                <p className="text-sm text-muted-foreground">Notify tenants with pending balances</p>
              </button>
              <button className="w-full p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors text-left">
                <p className="font-medium">Generate Monthly Report</p>
                <p className="text-sm text-muted-foreground">Export collection summary as PDF</p>
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
