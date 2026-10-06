import { usePlatformStats, useLandlords, useNewOnboardingRequestsCount } from '@/hooks/useSuperAdminData';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import NeedsAttentionCard from '@/components/super-admin/NeedsAttentionCard';
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

const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  loading,
  error,
  onClick,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
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
      onClick && 'cursor-pointer hover:border-[#0F766E]/40 transition-colors duration-150'
    )}
  >
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-[#64748B]">{title}</CardTitle>
      <div className="p-2 rounded-lg bg-[#F1F5F9] border border-[#E2E8F0]">
        <Icon className="h-4 w-4 text-[#1E3A5F]" />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-24 bg-[#E2E8F0]" />
      ) : error ? (
        <div className="flex items-center gap-1.5 text-destructive">
          <CircleAlert className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">Failed to load</span>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold tracking-tight text-[#0F172A]">{value}</div>
          {description && (
            <p className="text-xs text-[#64748B] mt-1.5">{description}</p>
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
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Platform Overview</h1>
          <p className="text-[#64748B]">Welcome to the Super Admin Dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Onboarding Requests"
            value={newRequestsCount || 0}
            description="Awaiting triage"
            icon={UserPlus}
            loading={newRequestsLoading}
            error={newRequestsError}
            onClick={() => navigate(ROUTES.SUPER_ADMIN_ONBOARDING_REQUESTS)}
          />
          <StatCard
            title="Total Landlords"
            value={stats?.totalLandlords || 0}
            description={`${stats?.activeLandlords || 0} active · View all`}
            icon={Users}
            loading={statsLoading}
            error={statsError}
            onClick={() => navigate(ROUTES.SUPER_ADMIN_LANDLORDS)}
          />
          <StatCard
            title="Total Properties"
            value={stats?.totalProperties || 0}
            icon={Building}
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Total Tenants"
            value={stats?.totalTenants || 0}
            icon={UserCheck}
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Rent Collected"
            value={`KES ${(stats?.totalRentCollected || 0).toLocaleString()}`}
            icon={DollarSign}
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
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Expiring Soon"
            value={stats?.expiringSubscriptions || 0}
            description="Within 7 days"
            icon={Clock}
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="SMS Tokens"
            value={`${(stats?.smsTokensIssued || 0) - (stats?.smsTokensUsed || 0)}`}
            description={`${stats?.smsTokensUsed || 0} used`}
            icon={MessageSquare}
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Unmatched Payments"
            value={stats?.unmatchedPayments || 0}
            icon={AlertTriangle}
            loading={statsLoading}
            error={statsError}
          />
        </div>

        <NeedsAttentionCard stats={stats} />

        {/* Recent Landlords */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Recent Landlords</CardTitle>
            <CardDescription className="text-[#64748B]">
              Recently registered landlords on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {landlordsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full bg-[#E2E8F0]" />
                ))}
              </div>
            ) : landlordsError ? (
              <div className="flex items-center justify-center gap-1.5 text-destructive py-8">
                <CircleAlert className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Failed to load landlords</span>
              </div>
            ) : recentLandlords.length === 0 ? (
              <p className="text-[#64748B] text-center py-8">No landlords registered yet</p>
            ) : (
              <div className="space-y-2.5">
                {recentLandlords.map((landlord) => (
                  <div
                    key={landlord.id}
                    className={cn('flex items-center justify-between p-3', ADMIN_SURFACE, 'hover:bg-[#F1F5F9] transition-colors duration-150')}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#CCFBF1] border border-[#0F766E]/20 flex items-center justify-center">
                        <span className="text-[#0F766E] font-semibold">
                          {landlord.full_name?.[0] || 'L'}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-[#0F172A]">
                          {landlord.full_name || 'Unknown'}
                        </p>
                        <p className="text-sm text-[#64748B]">
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
                      <p className="text-xs text-[#64748B] mt-1">
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
