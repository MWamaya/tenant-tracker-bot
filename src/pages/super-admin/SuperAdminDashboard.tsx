import { usePlatformStats, usePlatformTrends, useLandlords, useNewOnboardingRequestsCount } from '@/hooks/useSuperAdminData';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import NeedsAttentionCard from '@/components/super-admin/NeedsAttentionCard';
import LandlordGrowthChart from '@/components/super-admin/LandlordGrowthChart';
import RevenueTrendChart from '@/components/super-admin/RevenueTrendChart';
import PlanDistributionChart from '@/components/super-admin/PlanDistributionChart';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Users,
  Building,
  UserCheck,
  DollarSign,
  Ban,
  UserPlus,
  CircleAlert,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { formatDate } from '@/lib/dates';
import { ROUTES } from '@/lib/routes';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const formatCompactKes = (amount: number) =>
  `KES ${new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(amount)}`;

// Fixed, CVD-validated accent per metric — gives each card its own identity
// instead of every icon reading the same navy. Not reused for status badges
// (success/warning/destructive stay on their semantic tokens elsewhere).
const STAT_ACCENTS = {
  violet: { icon: '#4a3aa7', bg: '#4a3aa714', border: '#4a3aa733' },
  blue: { icon: '#2a78d6', bg: '#2a78d614', border: '#2a78d633' },
  aqua: { icon: '#1baf7a', bg: '#1baf7a14', border: '#1baf7a33' },
  magenta: { icon: '#e87ba4', bg: '#e87ba414', border: '#e87ba433' },
  green: { icon: '#008300', bg: '#00830014', border: '#00830033' },
  red: { icon: '#e34948', bg: '#e3494814', border: '#e3494833' },
} as const;

const DeltaBadge = ({ value, label, neutral }: { value: number; label: string; neutral?: boolean }) => {
  const isUp = value >= 0;
  if (neutral) {
    return <span className="inline-flex items-center text-xs font-medium text-[#94A3B8]">{label}</span>;
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        isUp ? 'text-[#0F766E]' : 'text-destructive'
      )}
    >
      {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
      {label}
    </span>
  );
};

const StatCard = ({
  title,
  value,
  description,
  delta,
  icon: Icon,
  accent,
  loading,
  error,
  onClick,
}: {
  title: string;
  value: string | number;
  description?: string;
  delta?: { value: number; label: string; neutral?: boolean };
  icon: React.ComponentType<{ className?: string }>;
  accent: keyof typeof STAT_ACCENTS;
  loading?: boolean;
  /** When true, shows a distinct error state instead of falling back to a
   * misleading "0" that's indistinguishable from a real zero count. */
  error?: boolean;
  onClick?: () => void;
}) => {
  const tone = STAT_ACCENTS[accent];
  return (
    <Card
      onClick={onClick}
      className={cn(ADMIN_CARD, onClick && 'cursor-pointer hover:border-[#0F766E]/40 transition-colors duration-150')}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-4">
        <CardTitle className="text-xs font-medium text-[#64748B]">{title}</CardTitle>
        <div
          className="p-1.5 rounded-lg border"
          style={{ backgroundColor: tone.bg, borderColor: tone.border }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: tone.icon }} />
        </div>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {loading ? (
          <Skeleton className="h-7 w-20 bg-[#E2E8F0]" />
        ) : error ? (
          <div className="flex items-center gap-1.5 text-destructive">
            <CircleAlert className="h-4 w-4 shrink-0" />
            <span className="text-sm font-medium">Failed to load</span>
          </div>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight text-[#0F172A]">{value}</div>
            {delta && (
              <div className="mt-1">
                <DeltaBadge value={delta.value} label={delta.label} neutral={delta.neutral} />
              </div>
            )}
            {description && <p className="text-xs text-[#64748B] mt-1">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
};

const SuperAdminDashboard = () => {
  const { data: stats, isLoading: statsLoading, isError: statsError } = usePlatformStats();
  const { data: trends, isLoading: trendsLoading, isError: trendsError } = usePlatformTrends();
  const { data: landlords, isLoading: landlordsLoading, isError: landlordsError } = useLandlords();
  const {
    data: newRequestsCount,
    isLoading: newRequestsLoading,
    isError: newRequestsError,
  } = useNewOnboardingRequestsCount();
  const navigate = useNavigate();

  const recentLandlords = landlords?.slice(0, 5) || [];

  // Month-over-month deltas for the headline cards, derived from the same
  // 6-month trend data the charts below use — no extra query.
  const lastMonth = trends?.at(-1);
  const prevMonth = trends?.at(-2);
  const currentCalendarMonth = new Date().toISOString().slice(0, 7);
  const lastMonthInProgress = lastMonth?.month === currentCalendarMonth;
  const rentDelta =
    lastMonth && prevMonth && prevMonth.rentCollected > 0
      ? {
          value: lastMonth.rentCollected - prevMonth.rentCollected,
          label: `${lastMonth.rentCollected >= prevMonth.rentCollected ? '+' : ''}${Math.round(
            ((lastMonth.rentCollected - prevMonth.rentCollected) / prevMonth.rentCollected) * 100
          )}% vs last month${lastMonthInProgress ? ' (month in progress)' : ''}`,
        }
      : undefined;
  const landlordDelta = lastMonth
    ? { value: lastMonth.landlordSignups, label: `+${lastMonth.landlordSignups} this month` }
    : undefined;
  const propertiesDelta = lastMonth
    ? { value: lastMonth.newProperties, label: `+${lastMonth.newProperties} this month` }
    : undefined;
  const tenantsDelta = lastMonth
    ? { value: lastMonth.newTenants, label: `+${lastMonth.newTenants} this month` }
    : undefined;
  const onboardingDelta = lastMonth
    ? { value: lastMonth.newOnboardingRequests, label: `+${lastMonth.newOnboardingRequests} this month` }
    : undefined;
  // No clean historical signal for suspensions (would require diffing audit
  // logs) — show a neutral indicator rather than a fabricated number.
  const suspendedDelta = { value: 0, label: 'No trend data', neutral: true };

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
            delta={onboardingDelta}
            icon={UserPlus}
            accent="violet"
            loading={newRequestsLoading}
            error={newRequestsError}
            onClick={() => navigate(ROUTES.SUPER_ADMIN_ONBOARDING_REQUESTS)}
          />
          <StatCard
            title="Total Landlords"
            value={stats?.totalLandlords || 0}
            description={`${stats?.activeLandlords || 0} active · View all`}
            delta={landlordDelta}
            icon={Users}
            accent="blue"
            loading={statsLoading}
            error={statsError}
            onClick={() => navigate(ROUTES.SUPER_ADMIN_LANDLORDS)}
          />
          <StatCard
            title="Total Properties"
            value={stats?.totalProperties || 0}
            delta={propertiesDelta}
            icon={Building}
            accent="aqua"
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Total Tenants"
            value={stats?.totalTenants || 0}
            delta={tenantsDelta}
            icon={UserCheck}
            accent="magenta"
            loading={statsLoading}
            error={statsError}
          />
          <StatCard
            title="Rent Collected"
            value={formatCompactKes(stats?.totalRentCollected || 0)}
            delta={rentDelta}
            icon={DollarSign}
            accent="green"
            loading={statsLoading}
            error={statsError}
          />
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Suspended Landlords"
            value={stats?.suspendedLandlords || 0}
            delta={suspendedDelta}
            icon={Ban}
            accent="red"
            loading={statsLoading}
            error={statsError}
          />
        </div>

        {/* Analytics */}
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-[#0F172A] mb-3">Platform Trends</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <RevenueTrendChart data={trends} loading={trendsLoading} error={trendsError} />
            <LandlordGrowthChart data={trends} loading={trendsLoading} error={trendsError} />
            <PlanDistributionChart landlords={landlords} loading={landlordsLoading} error={landlordsError} />
          </div>
        </div>

        <NeedsAttentionCard stats={stats} statsError={statsError} />

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
                    role="button"
                    tabIndex={0}
                    onClick={() => navigate(`${ROUTES.SUPER_ADMIN_LANDLORD_DETAIL}?landlord=${landlord.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(`${ROUTES.SUPER_ADMIN_LANDLORD_DETAIL}?landlord=${landlord.id}`)}
                    className={cn('flex items-center justify-between p-3 cursor-pointer', ADMIN_SURFACE, ADMIN_SURFACE_HOVER)}
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
