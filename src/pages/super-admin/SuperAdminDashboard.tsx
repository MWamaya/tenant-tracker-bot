import { usePlatformStats, useLandlords } from '@/hooks/useSuperAdminData';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Building,
  UserCheck,
  DollarSign,
  MessageSquare,
  AlertTriangle,
  Clock,
  Ban,
} from 'lucide-react';
import { format } from 'date-fns';

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  trend,
  loading,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}) => (
  <Card className="bg-slate-800/50 border-slate-700">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-slate-300">{title}</CardTitle>
      <div className="p-2 rounded-lg bg-slate-700/50">
        <Icon className="h-4 w-4 text-primary" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-24 bg-slate-700" />
      ) : (
        <>
          <div className="text-2xl font-bold text-white">{value}</div>
          {description && (
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

const SuperAdminDashboard = () => {
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: landlords, isLoading: landlordsLoading } = useLandlords();

  const recentLandlords = landlords?.slice(0, 5) || [];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Platform Overview</h1>
          <p className="text-slate-400">Welcome to the Super Admin Dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Landlords"
            value={stats?.totalLandlords || 0}
            description={`${stats?.activeLandlords || 0} active`}
            icon={Users}
            loading={statsLoading}
          />
          <StatCard
            title="Total Properties"
            value={stats?.totalProperties || 0}
            icon={Building}
            loading={statsLoading}
          />
          <StatCard
            title="Total Tenants"
            value={stats?.totalTenants || 0}
            icon={UserCheck}
            loading={statsLoading}
          />
          <StatCard
            title="Rent Collected"
            value={`KES ${(stats?.totalRentCollected || 0).toLocaleString()}`}
            icon={DollarSign}
            loading={statsLoading}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Suspended Landlords"
            value={stats?.suspendedLandlords || 0}
            icon={Ban}
            loading={statsLoading}
          />
          <StatCard
            title="Expiring Soon"
            value={stats?.expiringSubscriptions || 0}
            description="Within 7 days"
            icon={Clock}
            loading={statsLoading}
          />
          <StatCard
            title="SMS Tokens"
            value={`${(stats?.smsTokensIssued || 0) - (stats?.smsTokensUsed || 0)}`}
            description={`${stats?.smsTokensUsed || 0} used`}
            icon={MessageSquare}
            loading={statsLoading}
          />
          <StatCard
            title="Unmatched Payments"
            value={stats?.unmatchedPayments || 0}
            icon={AlertTriangle}
            loading={statsLoading}
          />
        </div>

        {/* Recent Landlords */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Recent Landlords</CardTitle>
            <CardDescription className="text-slate-400">
              Recently registered landlords on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {landlordsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full bg-slate-700" />
                ))}
              </div>
            ) : recentLandlords.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No landlords registered yet</p>
            ) : (
              <div className="space-y-3">
                {recentLandlords.map((landlord) => (
                  <div
                    key={landlord.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-medium">
                          {landlord.full_name?.[0] || 'L'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {landlord.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-slate-400">
                          {landlord.company_name || 'No company'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant="outline"
                        className={
                          landlord.account_status === 'active'
                            ? 'border-green-500 text-green-400'
                            : landlord.account_status === 'suspended'
                            ? 'border-red-500 text-red-400'
                            : 'border-yellow-500 text-yellow-400'
                        }
                      >
                        {landlord.account_status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(landlord.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminLayout>
  );
};

export default SuperAdminDashboard;
