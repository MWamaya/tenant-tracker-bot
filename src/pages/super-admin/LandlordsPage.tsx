import { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useLandlords, useUpdateLandlordStatus, useSubscriptionPlans, useAssignSubscription, useAllocateSmsTokens, useUpdateInboundEmail } from '@/hooks/useSuperAdminData';
import { useImpersonation } from '@/hooks/useImpersonation';
import { ROUTES } from '@/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
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

  const {
    search: searchQuery,
    setSearch: setSearchQuery,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
  } = useTableViewState('super-admin-landlords');
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

  const columns = useMemo<ColumnDef<LandlordProfile>[]>(
    () => [
      {
        id: 'Landlord',
        accessorFn: (row) => row.full_name || '',
        header: 'Landlord',
        cell: ({ row }) => {
          const landlord = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 shrink-0 rounded-full bg-[#CCFBF1] border border-[#0F766E]/20 flex items-center justify-center">
                <span className="text-[#0F766E] font-semibold text-sm">
                  {landlord.full_name?.[0] || 'L'}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-medium text-[#0F172A] truncate">{landlord.full_name || 'Unknown'}</p>
                <p className="text-xs text-[#64748B] truncate">{landlord.company_name || 'No company'}</p>
              </div>
            </div>
          );
        },
      },
      {
        id: 'Phone',
        accessorKey: 'phone',
        header: 'Phone',
        cell: ({ row }) => row.original.phone || 'No phone',
      },
      {
        id: 'Status',
        accessorKey: 'account_status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="outline" className={getStatusBadgeColor(row.original.account_status)}>
            {row.original.account_status}
          </Badge>
        ),
      },
      {
        id: 'Subscription',
        accessorFn: (row) => row.subscription?.plan_name || '',
        header: 'Subscription',
        cell: ({ row }) => row.original.subscription?.plan_name || 'No subscription',
      },
      {
        id: 'SMS Balance',
        accessorKey: 'sms_token_balance',
        header: 'SMS Balance',
      },
      {
        id: 'Joined',
        accessorKey: 'created_at',
        header: 'Joined',
        cell: ({ row }) => formatDate(row.original.created_at),
      },
      {
        id: 'Actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const landlord = row.original;
          return (
            <div className="flex items-center justify-end gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90">
                    <LogIn className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleLoginAs(landlord)}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Open Dashboard
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLoginAs(landlord, ROUTES.PROPERTIES)}>
                    <Building2 className="h-4 w-4 mr-2" />
                    Add Property
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLoginAs(landlord, ROUTES.HOUSES)}>
                    <Home className="h-4 w-4 mr-2" />
                    Add House
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleLoginAs(landlord, ROUTES.TENANTS)}>
                    <Users className="h-4 w-4 mr-2" />
                    Add Tenant
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLandlord(landlord);
                      setDialogType('view');
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLandlord(landlord);
                      setDialogType('subscription');
                    }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Assign Subscription
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLandlord(landlord);
                      setDialogType('sms');
                    }}
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Allocate SMS Tokens
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setSelectedLandlord(landlord);
                      setInboundEmailInput(landlord.inbound_email || '');
                      setDialogType('inboundEmail');
                    }}
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Edit Inbound Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {landlord.account_status !== 'active' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(landlord.id, 'active')}>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Activate Account
                    </DropdownMenuItem>
                  )}
                  {landlord.account_status !== 'suspended' && (
                    <DropdownMenuItem onClick={() => handleStatusChange(landlord.id, 'suspended')}>
                      <Ban className="h-4 w-4 mr-2 text-red-600" />
                      Suspend Account
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleLoginAs, handleStatusChange]
  );

  const csvColumns: CsvColumn<LandlordProfile>[] = [
    { id: 'Landlord', header: 'Name', accessor: (r) => r.full_name ?? '' },
    { header: 'Company', accessor: (r) => r.company_name ?? '' },
    { id: 'Phone', header: 'Phone', accessor: (r) => r.phone ?? '' },
    { id: 'Status', header: 'Status', accessor: (r) => r.account_status },
    { id: 'Subscription', header: 'Subscription', accessor: (r) => r.subscription?.plan_name ?? '' },
    { id: 'SMS Balance', header: 'SMS Balance', accessor: (r) => r.sms_token_balance },
    { id: 'Joined', header: 'Joined', accessor: (r) => r.created_at },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
      {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <Link to={ROUTES.SUPER_ADMIN_ROOT} className="text-sm text-[#1E3A5F] hover:text-[#1E3A5F]/80 flex items-center gap-1 mb-1">
              ← Back to Dashboard
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Landlord Management</h1>
            <p className="text-[#64748B]">Manage landlord accounts and subscriptions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className={cn("border-[#E2E8F0] text-[#1E3A5F]", ADMIN_SURFACE_HOVER)}>
              <Link to={ROUTES.SUPER_ADMIN_ONBOARDING_REQUESTS}>
                View Onboarding Requests
              </Link>
            </Button>
            <Button className="bg-[#1E3A5F] hover:bg-[#1E3A5F]/90" onClick={() => setAddLandlordOpen(true)}>
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
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
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

        {/* Landlords Table */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Landlords ({filteredLandlords?.length || 0})</CardTitle>
            <CardDescription className="text-[#64748B]">
              All registered landlords on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable<LandlordProfile>
              columns={columns}
              data={filteredLandlords || []}
              sorting={sorting}
              onSortingChange={setSorting}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              csvColumns={csvColumns}
              csvFilename="kodipap-landlords.csv"
              isLoading={isLoading}
              emptyMessage="No landlords found"
            />
          </CardContent>
        </Card>
      </div>

      {/* View Details Dialog */}
      <Dialog open={dialogType === 'view'} onOpenChange={() => setDialogType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Landlord Details</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              View landlord profile and subscription information
            </DialogDescription>
          </DialogHeader>
          {selectedLandlord && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-[#64748B]">Full Name</Label>
                  <p>{selectedLandlord.full_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Company</Label>
                  <p>{selectedLandlord.company_name || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Phone</Label>
                  <p>{selectedLandlord.phone || 'N/A'}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Inbound Email</Label>
                  <p>{selectedLandlord.inbound_email || 'Not yet generated'}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Status</Label>
                  <Badge variant="outline" className={getStatusBadgeColor(selectedLandlord.account_status)}>
                    {selectedLandlord.account_status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-[#64748B]">SMS Balance</Label>
                  <p>{selectedLandlord.sms_token_balance} tokens</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Subscription</Label>
                  <p>{selectedLandlord.subscription?.plan_name || 'None'}</p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Joined</Label>
                  <p>
                    {formatDate(selectedLandlord.created_at)}
                  </p>
                </div>
                <div>
                  <Label className="text-[#64748B]">Last Login</Label>
                  <p>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Subscription</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              Assign a subscription plan to {selectedLandlord?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Subscription Plan</Label>
              <Select
                value={subscriptionData.planId}
                onValueChange={(value) =>
                  setSubscriptionData({ ...subscriptionData, planId: value })
                }
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
                onChange={(e) =>
                  setSubscriptionData({ ...subscriptionData, paymentReference: e.target.value })
                }
                placeholder="e.g., MPESA transaction code"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Paid (Optional)</Label>
              <Input
                type="number"
                value={subscriptionData.amountPaid}
                onChange={(e) =>
                  setSubscriptionData({ ...subscriptionData, amountPaid: e.target.value })
                }
                placeholder="Amount in KES"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className={cn("border-[#E2E8F0] text-[#1E3A5F]", ADMIN_SURFACE_HOVER)}>
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
              The address {selectedLandlord?.full_name} forwards bank notification emails to.
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
            <Button variant="outline" onClick={() => setDialogType(null)} className={cn("border-[#E2E8F0] text-[#1E3A5F]", ADMIN_SURFACE_HOVER)}>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Allocate SMS Tokens</DialogTitle>
            <DialogDescription className="text-[#64748B]">
              Add SMS tokens to {selectedLandlord?.full_name}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className={cn("p-4", ADMIN_SURFACE)}>
              <p className="text-sm text-[#64748B]">Current Balance</p>
              <p className="text-2xl font-bold">
                {selectedLandlord?.sms_token_balance || 0} tokens
              </p>
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
            <Button variant="outline" onClick={() => setDialogType(null)} className={cn("border-[#E2E8F0] text-[#1E3A5F]", ADMIN_SURFACE_HOVER)}>
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
