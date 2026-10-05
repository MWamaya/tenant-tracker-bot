import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useLandlords, useUpdateLandlordStatus, useSubscriptionPlans, useAssignSubscription, useAllocateSmsTokens, useUpdateInboundEmail } from '@/hooks/useSuperAdminData';
import { useImpersonation } from '@/hooks/useImpersonation';
import { ROUTES } from '@/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Search, MoreVertical, UserPlus, Eye, Ban, CheckCircle, CreditCard, MessageSquare, LogIn, Building2, Users, Home, Mail } from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dates';
import type { LandlordProfile } from '@/hooks/useSuperAdminData';
import { CreateLandlordDialog } from '@/components/super-admin/CreateLandlordDialog';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const LandlordsPage = () => {
  const navigate = useNavigate();
  const [addLandlordOpen, setAddLandlordOpen] = useState(false);
  const { startImpersonation } = useImpersonation();
  const { data: landlords, isLoading } = useLandlords();
  const { data: plans } = useSubscriptionPlans();
  const updateStatus = useUpdateLandlordStatus();
  const assignSubscription = useAssignSubscription();
  const allocateTokens = useAllocateSmsTokens();
  const updateInboundEmail = useUpdateInboundEmail();

  const handleLoginAs = async (landlord: LandlordProfile, destination = ROUTES.DASHBOARD) => {
    await startImpersonation({
      id: landlord.id,
      name: landlord.full_name || 'Unknown Landlord',
      company: landlord.company_name,
    });
    navigate(destination);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLandlord, setSelectedLandlord] = useState<LandlordProfile | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'subscription' | 'sms' | 'inboundEmail' | null>(null);
  const [subscriptionData, setSubscriptionData] = useState({
    planId: '',
    paymentReference: '',
    amountPaid: '',
  });
  const [smsAmount, setSmsAmount] = useState('');
  const [inboundEmailInput, setInboundEmailInput] = useState('');

  const filteredLandlords = landlords?.filter((landlord) => {
    const matchesSearch =
      landlord.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      landlord.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      landlord.phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || landlord.account_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (landlordId: string, newStatus: string) => {
    await updateStatus.mutateAsync({ landlordId, status: newStatus });
  };

  const handleAssignSubscription = async () => {
    if (!selectedLandlord || !subscriptionData.planId) return;
    await assignSubscription.mutateAsync({
      landlordId: selectedLandlord.id,
      planId: subscriptionData.planId,
      paymentReference: subscriptionData.paymentReference || undefined,
      amountPaid: subscriptionData.amountPaid ? parseFloat(subscriptionData.amountPaid) : undefined,
    });
    setDialogType(null);
    setSubscriptionData({ planId: '', paymentReference: '', amountPaid: '' });
  };

  const handleAllocateSms = async () => {
    const amount = parseInt(smsAmount, 10);
    if (!selectedLandlord || !Number.isFinite(amount) || amount <= 0) return;
    await allocateTokens.mutateAsync({
      landlordId: selectedLandlord.id,
      amount,
      description: 'Manual allocation by Super Admin',
    });
    setDialogType(null);
    setSmsAmount('');
  };

  const handleUpdateInboundEmail = async () => {
    if (!selectedLandlord || !inboundEmailInput.trim()) return;
    await updateInboundEmail.mutateAsync({
      landlordId: selectedLandlord.id,
      inboundEmail: inboundEmailInput.trim(),
    });
    setDialogType(null);
    setInboundEmailInput('');
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

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <Link to={ROUTES.SUPER_ADMIN_ROOT} className="text-sm text-primary hover:text-primary/80 flex items-center gap-1 mb-1">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-white">Landlord Management</h1>
            <p className="text-slate-400">Manage landlord accounts and subscriptions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              <Link to={ROUTES.SUPER_ADMIN_ONBOARDING_REQUESTS}>
                View Onboarding Requests
              </Link>
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => setAddLandlordOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Landlord
            </Button>
          </div>
        </div>

        <CreateLandlordDialog open={addLandlordOpen} onOpenChange={setAddLandlordOpen} />

        {/* Filters */}
        <Card className={ADMIN_CARD}>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, company, or phone..."
                  className="pl-10 bg-white/[0.04] border-white/10 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-white/[0.04] border-white/10 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-[#121a2e] border-white/10">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Landlords List */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-white">Landlords ({filteredLandlords?.length || 0})</CardTitle>
            <CardDescription className="text-slate-400">
              All registered landlords on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-white/[0.06]" />
                ))}
              </div>
            ) : filteredLandlords?.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No landlords found</p>
            ) : (
              <div className="space-y-3">
                {filteredLandlords?.map((landlord) => (
                  <div
                    key={landlord.id}
                    className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4", ADMIN_SURFACE, "hover:bg-white/[0.06] transition-colors duration-150")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/25 to-primary/5 border border-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg">
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
                        <p className="text-xs text-slate-500">{landlord.phone || 'No phone'}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            className="bg-primary hover:bg-primary/90 ml-2"
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Manage
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="bg-[#121a2e] border-white/10">
                          <DropdownMenuItem
                            className="text-primary font-medium focus:bg-primary/20 focus:text-primary"
                            onClick={() => handleLoginAs(landlord)}
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Open Dashboard
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            className="text-emerald-400 font-medium focus:bg-emerald-500/20 focus:text-emerald-300"
                            onClick={() => handleLoginAs(landlord, ROUTES.PROPERTIES)}
                          >
                            <Building2 className="h-4 w-4 mr-2" />
                            Add Property
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-amber-400 font-medium focus:bg-amber-500/20 focus:text-amber-300"
                            onClick={() => handleLoginAs(landlord, ROUTES.HOUSES)}
                          >
                            <Home className="h-4 w-4 mr-2" />
                            Add House
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-sky-400 font-medium focus:bg-sky-500/20 focus:text-sky-300"
                            onClick={() => handleLoginAs(landlord, ROUTES.TENANTS)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Add Tenant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="text-right">
                        <Badge variant="outline" className={getStatusBadgeColor(landlord.account_status)}>
                          {landlord.account_status}
                        </Badge>
                        <p className="text-xs text-slate-500 mt-1">
                          SMS: {landlord.sms_token_balance} tokens
                        </p>
                      </div>

                      <div className="text-right hidden md:block">
                        <p className="text-sm text-slate-300">
                          {landlord.subscription?.plan_name || 'No subscription'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Joined {formatDate(landlord.created_at)}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#121a2e] border-white/10">
                          <DropdownMenuItem
                            className="text-slate-200"
                            onClick={() => {
                              setSelectedLandlord(landlord);
                              setDialogType('view');
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-primary"
                            onClick={() => handleLoginAs(landlord)}
                          >
                            <LogIn className="h-4 w-4 mr-2" />
                            Login as Landlord
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-slate-200"
                            onClick={() => {
                              setSelectedLandlord(landlord);
                              setDialogType('subscription');
                            }}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Assign Subscription
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-slate-200"
                            onClick={() => {
                              setSelectedLandlord(landlord);
                              setDialogType('sms');
                            }}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            Allocate SMS Tokens
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-slate-200"
                            onClick={() => {
                              setSelectedLandlord(landlord);
                              setInboundEmailInput(landlord.inbound_email || '');
                              setDialogType('inboundEmail');
                            }}
                          >
                            <Mail className="h-4 w-4 mr-2" />
                            Edit Inbound Email
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          {landlord.account_status !== 'active' && (
                            <DropdownMenuItem
                              className="text-green-400"
                              onClick={() => handleStatusChange(landlord.id, 'active')}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Activate Account
                            </DropdownMenuItem>
                          )}
                          {landlord.account_status !== 'suspended' && (
                            <DropdownMenuItem
                              className="text-red-400"
                              onClick={() => handleStatusChange(landlord.id, 'suspended')}
                            >
                              <Ban className="h-4 w-4 mr-2" />
                              Suspend Account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog open={dialogType === 'view'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-[#121a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Landlord Details</DialogTitle>
            <DialogDescription className="text-slate-400">
              View landlord profile and subscription information
            </DialogDescription>
          </DialogHeader>
          {selectedLandlord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-400">Full Name</Label>
                  <p className="text-white">{selectedLandlord.full_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Company</Label>
                  <p className="text-white">{selectedLandlord.company_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Phone</Label>
                  <p className="text-white">{selectedLandlord.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Inbound Email</Label>
                  <p className="text-white">{selectedLandlord.inbound_email || 'Not yet generated'}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Status</Label>
                  <Badge variant="outline" className={getStatusBadgeColor(selectedLandlord.account_status)}>
                    {selectedLandlord.account_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-slate-400">SMS Balance</Label>
                  <p className="text-white">{selectedLandlord.sms_token_balance} tokens</p>
                </div>
                <div>
                  <Label className="text-slate-400">Subscription</Label>
                  <p className="text-white">{selectedLandlord.subscription?.plan_name || 'None'}</p>
                </div>
                <div>
                  <Label className="text-slate-400">Joined</Label>
                  <p className="text-white">
                    {formatDate(selectedLandlord.created_at)}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400">Last Login</Label>
                  <p className="text-white">
                    {selectedLandlord.last_login_at
                      ? formatDateTime(selectedLandlord.last_login_at)
                      : 'Never'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Subscription Dialog */}
      <Dialog open={dialogType === 'subscription'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-[#121a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Assign Subscription</DialogTitle>
            <DialogDescription className="text-slate-400">
              Assign a subscription plan to {selectedLandlord?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Subscription Plan</Label>
              <Select
                value={subscriptionData.planId}
                onValueChange={(value) =>
                  setSubscriptionData({ ...subscriptionData, planId: value })
                }
              >
                <SelectTrigger className="bg-white/[0.04] border-white/10">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent className="bg-[#121a2e] border-white/10">
                  {plans?.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} - KES {plan.price}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Payment Reference (Optional)</Label>
              <Input
                className="bg-white/[0.04] border-white/10"
                value={subscriptionData.paymentReference}
                onChange={(e) =>
                  setSubscriptionData({ ...subscriptionData, paymentReference: e.target.value })
                }
                placeholder="e.g., MPESA transaction code"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Amount Paid (Optional)</Label>
              <Input
                type="number"
                className="bg-white/[0.04] border-white/10"
                value={subscriptionData.amountPaid}
                onChange={(e) =>
                  setSubscriptionData({ ...subscriptionData, amountPaid: e.target.value })
                }
                placeholder="Amount in KES"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
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
        <DialogContent className="bg-[#121a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Edit Inbound Email</DialogTitle>
            <DialogDescription className="text-slate-400">
              The address {selectedLandlord?.full_name} forwards bank notification emails to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-200">Inbound Email</Label>
              <Input
                className="bg-white/[0.04] border-white/10"
                value={inboundEmailInput}
                onChange={(e) => setInboundEmailInput(e.target.value)}
                placeholder="e.g., munene@kodipap.com"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
              Cancel
            </Button>
            <Button
              onClick={handleUpdateInboundEmail}
              disabled={updateInboundEmail.isPending || !inboundEmailInput.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate SMS Dialog */}
      <Dialog open={dialogType === 'sms'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-[#121a2e] border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Allocate SMS Tokens</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add SMS tokens to {selectedLandlord?.full_name}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className={cn("p-4", ADMIN_SURFACE)}>
              <p className="text-sm text-slate-400">Current Balance</p>
              <p className="text-2xl font-bold text-white">
                {selectedLandlord?.sms_token_balance || 0} tokens
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Tokens to Add</Label>
              <Input
                type="number"
                className="bg-white/[0.04] border-white/10"
                value={smsAmount}
                onChange={(e) => setSmsAmount(e.target.value)}
                placeholder="Enter number of tokens"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className="bg-transparent border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
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

export default LandlordsPage;
