import { usePlatformStats, useLandlords, useNewOnboardingRequestsCount } from '@/hooks/useSuperAdminData';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useNavigate } from 'react-router-dom';
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
  UserPlus,
  CircleAlert,
} from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { ROUTES } from '@/lib/routes';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const TINTS = {
  violet: 'from-violet-500/20 to-violet-500/5 border-violet-500/20 text-violet-400',
  blue: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
  emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
  amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
  rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/20 text-rose-400',
} as const;

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  tint = 'blue',
  loading,
  error,
  onClick,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  tint?: keyof typeof TINTS;
  loading?: boolean;
  /** When true, shows a distinct error state instead of falling back to a
   * misleading "0" that's indistinguishable from a real zero count. */
  error?: boolean;
  onClick?: () => void;
}) => (
  <Card
    onClick={onClick}
    className={cn(
      ADMIN_CARD,
      onClick && 'cursor-pointer hover:border-primary/40 hover:from-white/[0.07] transition-all duration-150'
    )}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
      <div className={cn('p-2 rounded-lg bg-gradient-to-br border', TINTS[tint])}>
        <Icon className="h-4 w-4" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-24 bg-white/[0.06]" />
      ) : error ? (
        <div className="flex items-center gap-1.5 text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Failed to load</span>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold tracking-tight text-white">{value}</div>
          {description && (
            <p className="text-xs text-slate-500 mt-1.5">{description}</p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

const SuperAdminDashboard = () => {
  const { data: stats, isLoading: statsLoading, isError: statsError } = usePlatformStats();
  const { data: landlords, isLoading: landlordsLoading, isError: landlordsError } = useLandlords();
  const {
    data: newRequestsCount,
    isLoading: newRequestsLoading,
    isError: newRequestsError,
  } = useNewOnboardingRequestsCount();
  const navigate = useNavigate();

  const recentLandlords = landlords?.slice(0, 5) || [];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Platform Overview</h1>
          <p className="text-slate-400">Welcome to the Super Admin Dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Onboarding Requests"
            value={newRequestsCount || 0}
            description="Awaiting triage"
            icon={UserPlus}
            tint="violet"
            loading={newRequestsLoading}
            error={newRequestsError}
            onClick={() => navigate(ROUTES.SUPER_ADMIN_ONBOARDING_REQUESTS)}
          />
          <StatCard
            title="Total Landlords"
            value={stats?.totalLandlords || 0}
            description={`${stats?.activeLandlords || 0} active · View all`}
            icon={Users}
            tint="blue"
            loading={statsLoading}
            error={statsError}
            onClick={() => navigate(ROUTES.SUPER_ADMIN_LANDLORDS)}
          />
          <StatCard
            title="Total Properties"
            value={stats?.totalProperties || 0}
            icon={Building}
            tint="blue"
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Total Tenants"
            value={stats?.totalTenants || 0}
            icon={UserCheck}
            tint="blue"
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Rent Collected"
            value={`KES ${(stats?.totalRentCollected || 0).toLocaleString()}`}
            icon={DollarSign}
            tint="emerald"
            loading={statsLoading}
            error={statsError}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Suspended Landlords"
            value={stats?.suspendedLandlords || 0}
            icon={Ban}
            tint="rose"
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Expiring Soon"
            value={stats?.expiringSubscriptions || 0}
            description="Within 7 days"
            icon={Clock}
            tint="amber"
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="SMS Tokens"
            value={`${(stats?.smsTokensIssued || 0) - (stats?.smsTokensUsed || 0)}`}
            description={`${stats?.smsTokensUsed || 0} used`}
            icon={MessageSquare}
            tint="violet"
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Unmatched Payments"
            value={stats?.unmatchedPayments || 0}
            icon={AlertTriangle}
            tint="amber"
            loading={statsLoading}
            error={statsError}
          />
        </div>

        {/* Recent Landlords */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-white">Recent Landlords</CardTitle>
            <CardDescription className="text-slate-400">
              Recently registered landlords on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {landlordsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full bg-white/[0.06]" />
                ))}
              </div>
            ) : landlordsError ? (
              <div className="flex items-center justify-center gap-1.5 text-destructive py-8">
                <CircleAlert className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Failed to load landlords</span>
              </div>
            ) : recentLandlords.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No landlords registered yet</p>
            ) : (
              <div className="space-y-2.5">
                {recentLandlords.map((landlord) => (
                  <div
                    key={landlord.id}
                    className={cn('flex items-center justify-between p-3', ADMIN_SURFACE, 'hover:bg-white/[0.06] transition-colors duration-150')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <span className="text-primary font-semibold">
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
                            ? STATUS_BADGE_CLASSES.success
                            : landlord.account_status === 'suspended'
                            ? STATUS_BADGE_CLASSES.destructive
                            : STATUS_BADGE_CLASSES.warning
                        }
                      >
                        {landlord.account_status}
                      </Badge>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(landlord.created_at)}
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
