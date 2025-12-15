import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { CollectionProgress } from '@/components/dashboard/CollectionProgress';
import { RecentPayments } from '@/components/dashboard/RecentPayments';
import { HouseStatusChart } from '@/components/dashboard/HouseStatusChart';
import { getDashboardStats } from '@/lib/mockData';
import { Home, CheckCircle, AlertCircle, XCircle, Banknote } from 'lucide-react';

const Dashboard = () => {
  const stats = getDashboardStats();
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
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
          <StatCard
            title="Partially Paid"
            value={stats.partialHouses}
            subtitle="Pending balance"
            icon={AlertCircle}
            variant="warning"
          />
          <StatCard
            title="Unpaid"
            value={stats.unpaidHouses}
            subtitle="No payments received"
            icon={XCircle}
            variant="danger"
          />
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
