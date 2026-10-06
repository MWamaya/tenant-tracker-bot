import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import {
  useLandlords,
  useUpdateLandlordStatus,
  useSubscriptionPlans,
  useAssignSubscription,
  useAllocateSmsTokens,
  useUpdateInboundEmail,
  useLandlordProperties,
  useLandlordHouses,
  useLandlordTenantCount,
  useLandlordRentSummary,
  useLandlordPlatformPayments,
  useLandlordAuditLog,
  useUnmatchedPaymentCountsByLandlord,
} from '@/hooks/useSuperAdminData';
import { useImpersonation } from '@/hooks/useImpersonation';
import { ROUTES } from '@/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ArrowLeft,
  Ban,
  CheckCircle,
  CreditCard,
  MessageSquare,
  Mail,
  Phone,
  Building2,
  Home,
  Users,
  Banknote,
  AlertTriangle,
  MoreVertical,
  LogIn,
  Clock,
  History,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dates';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const ACCENTS = {
  blue: { icon: '#2a78d6', bg: '#2a78d614', border: '#2a78d633' },
  aqua: { icon: '#1baf7a', bg: '#1baf7a14', border: '#1baf7a33' },
  magenta: { icon: '#e87ba4', bg: '#e87ba414', border: '#e87ba433' },
  green: { icon: '#008300', bg: '#00830014', border: '#00830033' },
  orange: { icon: '#eb6834', bg: '#eb683414', border: '#eb683433' },
} as const;

const StatTile = ({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  accent: keyof typeof ACCENTS;
  loading?: boolean;
}) => {
  const tone = ACCENTS[accent];
  return (
    <Card className={ADMIN_CARD}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="p-2 rounded-lg border shrink-0" style={{ backgroundColor: tone.bg, borderColor: tone.border }}>
          <Icon className="h-4 w-4" style={{ color: tone.icon }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-[#64748B]">{label}</p>
          {loading ? (
            <Skeleton className="h-6 w-16 bg-[#E2E8F0] mt-0.5" />
          ) : (
            <p className="text-xl font-bold tracking-tight text-[#0F172A] truncate">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'active':
      return STATUS_BADGE_CLASSES.success;
    case 'suspended':
      return STATUS_BADGE_CLASSES.destructive;
    case 'expired':
      return STATUS_BADGE_CLASSES.warning;
    case 'pending':
      return STATUS_BADGE_CLASSES.info;
    default:
      return STATUS_BADGE_CLASSES.neutral;
  }
};

const LandlordDetailPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const landlordId = searchParams.get('landlord');
  const { startImpersonation } = useImpersonation();

  const { data: landlords, isLoading: landlordLoading } = useLandlords();
  const landlord = landlords?.find((l) => l.id === landlordId);

  const { data: properties, isLoading: propertiesLoading } = useLandlordProperties(landlordId);
  const { data: houses, isLoading: housesLoading } = useLandlordHouses(landlordId);
  const { data: tenantCount, isLoading: tenantCountLoading } = useLandlordTenantCount(landlordId);
  const { data: rentSummary, isLoading: rentLoading } = useLandlordRentSummary(landlordId);
  const { data: platformPayments, isLoading: platformPaymentsLoading } = useLandlordPlatformPayments(landlordId);
  const { data: auditLog, isLoading: auditLoading } = useLandlordAuditLog(landlordId);
  const { data: unmatchedCounts } = useUnmatchedPaymentCountsByLandlord();

  const updateStatus = useUpdateLandlordStatus();
  const { data: plans } = useSubscriptionPlans();
  const assignSubscription = useAssignSubscription();
  const allocateTokens = useAllocateSmsTokens();
  const updateInboundEmail = useUpdateInboundEmail();

  const [dialogType, setDialogType] = useState<'subscription' | 'sms' | 'inboundEmail' | null>(null);
  const [subscriptionData, setSubscriptionData] = useState({ planId: '', paymentReference: '', amountPaid: '' });
  const [smsAmount, setSmsAmount] = useState('');
  const [inboundEmailInput, setInboundEmailInput] = useState(landlord?.inbound_email || '');

  const occupiedHouses = houses?.filter((h) => h.status === 'occupied').length || 0;
  const vacantHouses = houses?.filter((h) => h.status === 'vacant').length || 0;
  const unmatchedCount = (landlordId && unmatchedCounts?.get(landlordId)) || 0;

  const handleStatusChange = async (newStatus: string) => {
    if (!landlord) return;
    await updateStatus.mutateAsync({ landlordId: landlord.id, status: newStatus });
  };

  // Read-only: for admins checking in on an account, not acting on the
  // landlord's behalf. "Open Reconciliation" below stays full-access since
  // that's an admin actively helping the landlord match a payment.
  const handleImpersonate = async () => {
    if (!landlord) return;
    await startImpersonation({
      id: landlord.id,
      name: landlord.full_name || 'Unknown Landlord',
      company: landlord.company_name,
      viewOnly: true,
    });
    navigate(ROUTES.DASHBOARD);
  };

  const handleOpenReconciliation = async () => {
    if (!landlord) return;
    await startImpersonation({
      id: landlord.id,
      name: landlord.full_name || 'Unknown Landlord',
      company: landlord.company_name,
    });
    navigate(ROUTES.RECONCILIATION);
  };

  const handleAssignSubscription = async () => {
    if (!landlord || !subscriptionData.planId) return;
    await assignSubscription.mutateAsync({
      landlordId: landlord.id,
      planId: subscriptionData.planId,
      paymentReference: subscriptionData.paymentReference || undefined,
      amountPaid: subscriptionData.amountPaid ? parseFloat(subscriptionData.amountPaid) : undefined,
    });
    setDialogType(null);
    setSubscriptionData({ planId: '', paymentReference: '', amountPaid: '' });
  };

  const handleAllocateSms = async () => {
    const amount = parseInt(smsAmount, 10);
    if (!landlord || !Number.isFinite(amount) || amount <= 0) return;
    await allocateTokens.mutateAsync({
      landlordId: landlord.id,
      amount,
      description: 'Manual allocation by Super Admin',
    });
    setDialogType(null);
    setSmsAmount('');
  };

  const handleUpdateInboundEmail = async () => {
    if (!landlord || !inboundEmailInput.trim()) return;
    await updateInboundEmail.mutateAsync({ landlordId: landlord.id, inboundEmail: inboundEmailInput.trim() });
    setDialogType(null);
  };

  if (landlordLoading) {
    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48 bg-[#E2E8F0]" />
          <Skeleton className="h-32 w-full bg-[#E2E8F0]" />
        </div>
      </SuperAdminLayout>
    );
  }

  if (!landlord) {
    return (
      <SuperAdminLayout>
        <div className="space-y-4">
          <Link to={ROUTES.SUPER_ADMIN_LANDLORDS} className="text-sm text-[#1E3A5F] hover:text-[#1E3A5F]/80 flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to Landlords
          </Link>
          <p className="text-[#64748B]">Landlord not found.</p>
        </div>
      </SuperAdminLayout>
    );
  }

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        <Link to={ROUTES.SUPER_ADMIN_LANDLORDS} className="text-sm text-[#1E3A5F] hover:text-[#1E3A5F]/80 flex items-center gap-1 w-fit">
          <ArrowLeft className="h-4 w-4" /> Back to Landlords
        </Link>

        {/* Header */}
        <Card className={ADMIN_CARD}>
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-14 h-14 shrink-0 rounded-full bg-[#CCFBF1] border border-[#0F766E]/20 flex items-center justify-center">
                <span className="text-[#0F766E] font-semibold text-xl">{landlord.full_name?.[0] || 'L'}</span>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold tracking-tight text-[#0F172A] truncate">
                    {landlord.full_name || 'Unknown'}
                  </h1>
                  <Badge variant="outline" className={getStatusBadgeColor(landlord.account_status)}>
                    {landlord.account_status}
                  </Badge>
                </div>
                <p className="text-sm text-[#64748B] truncate">{landlord.company_name || 'No company'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {landlord.account_status !== 'suspended' ? (
                <Button
                  variant="outline"
                  className="border-destructive/40 text-destructive hover:bg-destructive/5"
                  onClick={() => handleStatusChange('suspended')}
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Suspend Account
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="border-[#0F766E]/40 text-[#0F766E] hover:bg-[#0F766E]/5"
                  onClick={() => handleStatusChange('active')}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Activate Account
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleImpersonate}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Impersonate Landlord
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatTile label="Properties" value={properties?.length ?? 0} icon={Building2} accent="blue" loading={propertiesLoading} />
          <StatTile
            label="Houses"
            value={houses ? `${occupiedHouses}/${houses.length}` : 0}
            icon={Home}
            accent="aqua"
            loading={housesLoading}
          />
          <StatTile label="Tenants" value={tenantCount ?? 0} icon={Users} accent="magenta" loading={tenantCountLoading} />
          <StatTile label="SMS Balance" value={landlord.sms_token_balance} icon={MessageSquare} accent="orange" />
          <StatTile
            label="Rent Collected"
            value={`KES ${new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(rentSummary?.totalCollected ?? 0)}`}
            icon={Banknote}
            accent="green"
            loading={rentLoading}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Info */}
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Account</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#64748B] flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5" /> Phone
                  </Label>
                  <p className="text-[#0F172A]">{landlord.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-[#64748B] flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" /> Email
                  </Label>
                  <p className="text-[#0F172A] truncate">{landlord.email || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Joined</Label>
                  <p className="text-[#0F172A]">{formatDate(landlord.created_at)}</p>
                </div>
                <div>
                  <Label className="text-[#64748B] flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Last Login
                  </Label>
                  <p className="text-[#0F172A]">
                    {landlord.last_login_at ? formatDateTime(landlord.last_login_at) : 'Never'}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-[#E2E8F0]">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-[#64748B]">Inbound Email</Label>
                    <p className="text-[#0F172A]">{landlord.inbound_email || 'Not yet generated'}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}
                    onClick={() => {
                      setInboundEmailInput(landlord.inbound_email || '');
                      setDialogType('inboundEmail');
                    }}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subscription & SMS */}
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Subscription & SMS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-[#64748B]">Plan</Label>
                  <p className="text-[#0F172A] font-medium">{landlord.subscription?.plan_name || 'No subscription'}</p>
                  {landlord.subscription?.end_date && (
                    <p className="text-xs text-[#64748B]">Renews/expires {formatDate(landlord.subscription.end_date)}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}
                  onClick={() => setDialogType('subscription')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Assign Plan
                </Button>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                <div>
                  <Label className="text-[#64748B]">SMS Balance</Label>
                  <p className="text-[#0F172A] font-medium">{landlord.sms_token_balance} tokens</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}
                  onClick={() => setDialogType('sms')}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Allocate Tokens
                </Button>
              </div>
              {unmatchedCount > 0 && (
                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                  <div className="flex items-center gap-2 text-warning">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    <span className="text-sm font-medium">{unmatchedCount} unmatched rent payment(s)</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}
                    onClick={handleOpenReconciliation}
                  >
                    Open Reconciliation
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Properties & Houses — counts only, not every house/tenant */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Properties & Houses</CardTitle>
            <CardDescription className="text-[#64748B]">
              {properties?.length ?? 0} propert{(properties?.length ?? 0) === 1 ? 'y' : 'ies'} · {houses?.length ?? 0} house(s) ·{' '}
              {occupiedHouses} occupied · {vacantHouses} vacant
            </CardDescription>
          </CardHeader>
          <CardContent>
            {propertiesLoading || housesLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 w-full bg-[#E2E8F0]" />
                ))}
              </div>
            ) : !properties || properties.length === 0 ? (
              <p className="text-[#64748B] text-sm py-4 text-center">No properties yet</p>
            ) : (
              <div className="space-y-2">
                {properties.map((property) => {
                  const propertyHouses = houses?.filter((h) => h.property_id === property.id) ?? [];
                  const occupied = propertyHouses.filter((h) => h.status === 'occupied').length;
                  const vacant = propertyHouses.filter((h) => h.status === 'vacant').length;
                  const expectedRent = propertyHouses.reduce((sum, h) => sum + h.expected_rent, 0);
                  return (
                    <div key={property.id} className={cn('flex items-center justify-between p-3', ADMIN_SURFACE)}>
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 className="h-4 w-4 text-[#64748B] shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-[#0F172A] truncate">{property.name}</p>
                          <p className="text-xs text-[#64748B] truncate">
                            {[property.town, property.county].filter(Boolean).join(', ') || 'No location set'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0 text-sm">
                        <span className="text-[#0F172A]">KES {expectedRent.toLocaleString()} expected</span>
                        <Badge variant="outline" className={STATUS_BADGE_CLASSES.success}>
                          {occupied} occupied
                        </Badge>
                        <Badge variant="outline" className={STATUS_BADGE_CLASSES.neutral}>
                          {vacant} vacant
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Platform payments */}
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Subscription Payments</CardTitle>
              <CardDescription className="text-[#64748B]">Payments made to Kodipap</CardDescription>
            </CardHeader>
            <CardContent>
              {platformPaymentsLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-[#E2E8F0]" />
                  ))}
                </div>
              ) : !platformPayments || platformPayments.length === 0 ? (
                <p className="text-[#64748B] text-sm py-4 text-center">No subscription payments yet</p>
              ) : (
                <div className="space-y-2">
                  {platformPayments.map((p) => (
                    <div key={p.id} className={cn('flex items-center justify-between p-3', ADMIN_SURFACE)}>
                      <div>
                        <p className="font-medium text-[#0F172A]">KES {p.amount.toLocaleString()}</p>
                        <p className="text-xs text-[#64748B]">{formatDateTime(p.created_at)}</p>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          p.status === 'completed'
                            ? STATUS_BADGE_CLASSES.success
                            : p.status === 'failed'
                            ? STATUS_BADGE_CLASSES.destructive
                            : STATUS_BADGE_CLASSES.warning
                        }
                      >
                        {p.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity */}
          <Card className={ADMIN_CARD}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A] flex items-center gap-2">
                <History className="h-5 w-5" />
                Admin Activity
              </CardTitle>
              <CardDescription className="text-[#64748B]">Actions taken on this account</CardDescription>
            </CardHeader>
            <CardContent>
              {auditLoading ? (
                <div className="space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full bg-[#E2E8F0]" />
                  ))}
                </div>
              ) : !auditLog || auditLog.length === 0 ? (
                <p className="text-[#64748B] text-sm py-4 text-center">No recorded actions yet</p>
              ) : (
                <div className="space-y-2">
                  {auditLog.map((log) => (
                    <div key={log.id} className={cn('p-3', ADMIN_SURFACE)}>
                      <p className="text-sm text-[#0F172A]">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-[#64748B]">
                        {log.admin_name} · {formatDateTime(log.created_at)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Assign Subscription Dialog */}
      <Dialog open={dialogType === 'subscription'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subscription</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              Assign a subscription plan to {landlord.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select
                value={subscriptionData.planId}
                onValueChange={(value) => setSubscriptionData({ ...subscriptionData, planId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - KES {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Payment Reference (Optional)</Label>
              <Input
                value={subscriptionData.paymentReference}
                onChange={(e) => setSubscriptionData({ ...subscriptionData, paymentReference: e.target.value })}
                placeholder="e.g., MPESA transaction code"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Paid (Optional)</Label>
              <Input
                type="number"
                value={subscriptionData.amountPaid}
                onChange={(e) => setSubscriptionData({ ...subscriptionData, amountPaid: e.target.value })}
                placeholder="Amount in KES"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubscription} disabled={!subscriptionData.planId}>
              Assign Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Inbound Email Dialog */}
      <Dialog open={dialogType === 'inboundEmail'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Inbound Email</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              The address {landlord.full_name} forwards bank notification emails to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Inbound Email</Label>
              <Input
                value={inboundEmailInput}
                onChange={(e) => setInboundEmailInput(e.target.value)}
                placeholder="e.g., munene@kodipap.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateInboundEmail} disabled={updateInboundEmail.isPending || !inboundEmailInput.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate SMS Dialog */}
      <Dialog open={dialogType === 'sms'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate SMS Tokens</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              Add SMS tokens to {landlord.full_name}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className={cn('p-4', ADMIN_SURFACE)}>
              <p className="text-sm text-[#64748B]">Current Balance</p>
              <p className="text-2xl font-bold">{landlord.sms_token_balance} tokens</p>
            </div>
            <div className="space-y-2">
              <Label>Tokens to Add</Label>
              <Input
                type="number"
                value={smsAmount}
                onChange={(e) => setSmsAmount(e.target.value)}
                placeholder="Enter number of tokens"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}>
              Cancel
            </Button>
            <Button
              onClick={handleAllocateSms}
              disabled={!Number.isFinite(parseInt(smsAmount, 10)) || parseInt(smsAmount, 10) <= 0}
            >
              Allocate Tokens
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default LandlordDetailPage;
