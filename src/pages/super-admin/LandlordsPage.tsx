import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useLandlords, useUpdateLandlordStatus, useDeleteLandlord, useUnmatchedPaymentCountsByLandlord } from '@/hooks/useSuperAdminData';
import { useImpersonation } from '@/hooks/useImpersonation';
import { ROUTES } from '@/lib/routes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, UserPlus, Eye, Ban, CheckCircle, LogIn, Trash2 } from 'lucide-react';
import { formatDate } from '@/lib/dates';
import type { LandlordProfile } from '@/hooks/useSuperAdminData';
import { CreateLandlordDialog } from '@/components/super-admin/CreateLandlordDialog';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const LandlordsPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const planFilter = searchParams.get('plan');
  const [addLandlordOpen, setAddLandlordOpen] = useState(false);
  const { startImpersonation } = useImpersonation();
  const { data: landlords, isLoading } = useLandlords();
  const { data: unmatchedCounts } = useUnmatchedPaymentCountsByLandlord();
  const updateStatus = useUpdateLandlordStatus();
  const deleteLandlord = useDeleteLandlord();
  const [deleteTarget, setDeleteTarget] = useState<LandlordProfile | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleLoginAs = async (landlord: LandlordProfile, destination = ROUTES.DASHBOARD) => {
    await startImpersonation({
      id: landlord.id,
      name: landlord.full_name || 'Unknown Landlord',
      company: landlord.company_name,
    });
    navigate(destination);
  };

  // Separate from handleLoginAs: this is for admins checking in on an
  // account, not acting on the landlord's behalf, so it's read-only.
  const handleImpersonate = async (landlord: LandlordProfile) => {
    await startImpersonation({
      id: landlord.id,
      name: landlord.full_name || 'Unknown Landlord',
      company: landlord.company_name,
      viewOnly: true,
    });
    navigate(ROUTES.DASHBOARD);
  };

  const viewLandlord = (landlord: LandlordProfile) => {
    navigate(`${ROUTES.SUPER_ADMIN_LANDLORD_DETAIL}?landlord=${landlord.id}`);
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

  const filteredLandlords = landlords?.filter((landlord) => {
    const matchesSearch =
      landlord.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      landlord.company_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      landlord.phone?.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || landlord.account_status === statusFilter;
    const matchesPlan =
      !planFilter ||
      (planFilter === '__none__' ? !landlord.subscription : landlord.subscription?.plan_name === planFilter);
    return matchesSearch && matchesStatus && matchesPlan;
  });

  const clearPlanFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('plan');
    setSearchParams(next, { replace: true });
  };

  const handleStatusChange = async (landlordId: string, newStatus: string) => {
    await updateStatus.mutateAsync({ landlordId, status: newStatus });
  };

  const deleteConfirmPhrase = deleteTarget?.full_name?.trim() || deleteTarget?.company_name?.trim() || 'DELETE';

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteLandlord.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
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
        id: 'Reconciliation',
        accessorFn: (row) => unmatchedCounts?.get(row.id) || 0,
        header: 'Reconciliation',
        cell: ({ row }) => {
          const count = unmatchedCounts?.get(row.original.id) || 0;
          if (count === 0) {
            return <span className="text-[#94A3B8] text-sm">Up to date</span>;
          }
          return (
            <button
              type="button"
              onClick={() => handleLoginAs(row.original, ROUTES.RECONCILIATION)}
              className="inline-flex items-center gap-1 text-sm font-medium text-warning hover:underline"
              title="Open this landlord's Reconciliation page — matching these is their job, not admin's"
            >
              {count} unmatched
            </button>
          );
        },
      },
      {
        id: 'Actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const landlord = row.original;
          return (
            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant="outline"
                className={cn('border-[#E2E8F0] text-[#1E3A5F]', ADMIN_SURFACE_HOVER)}
                onClick={() => viewLandlord(landlord)}
              >
                <Eye className="h-4 w-4 mr-2" />
                View landlord
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {landlord.account_status !== 'suspended' ? (
                    <DropdownMenuItem onClick={() => handleStatusChange(landlord.id, 'suspended')}>
                      <Ban className="h-4 w-4 mr-2 text-red-600" />
                      Suspend Account
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleStatusChange(landlord.id, 'active')}>
                      <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                      Activate Account
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleImpersonate(landlord)}>
                    <LogIn className="h-4 w-4 mr-2" />
                    Impersonate Landlord
                  </DropdownMenuItem>
                  {landlord.account_status === 'suspended' && (
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => {
                        setDeleteConfirmText('');
                        setDeleteTarget(landlord);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Account
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [handleStatusChange, unmatchedCounts, viewLandlord, handleLoginAs, handleImpersonate]
  );

  const csvColumns: CsvColumn<LandlordProfile>[] = [
    { id: 'Landlord', header: 'Name', accessor: (r) => r.full_name ?? '' },
    { header: 'Company', accessor: (r) => r.company_name ?? '' },
    { id: 'Phone', header: 'Phone', accessor: (r) => r.phone ?? '' },
    { id: 'Status', header: 'Status', accessor: (r) => r.account_status },
    { id: 'Subscription', header: 'Subscription', accessor: (r) => r.subscription?.plan_name ?? '' },
    { id: 'SMS Balance', header: 'SMS Balance', accessor: (r) => r.sms_token_balance },
    { id: 'Joined', header: 'Joined', accessor: (r) => r.created_at },
    { id: 'Reconciliation', header: 'Unmatched Payments', accessor: (r) => unmatchedCounts?.get(r.id) || 0 },
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

        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-destructive">Delete this account?</DialogTitle>
              <DialogDescription>
                This permanently deletes {deleteTarget?.full_name}'s account and everything tied to it —
                properties, houses, tenants, payments, and subscription history. This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>
                Type <span className="font-semibold">{deleteConfirmPhrase}</span> to confirm
              </Label>
              <Input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder={deleteConfirmPhrase}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteLandlord.isPending || deleteConfirmText.trim() !== deleteConfirmPhrase}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleteLandlord.isPending ? 'Deleting...' : 'Delete Permanently'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
            {planFilter && (
              <div className="flex items-center gap-2 mt-3">
                <Badge variant="outline" className="border-[#0F766E]/40 text-[#0F766E] gap-1.5">
                  Plan: {planFilter === '__none__' ? 'No plan' : planFilter}
                  <button type="button" onClick={clearPlanFilter} className="hover:opacity-70">
                    ×
                  </button>
                </Badge>
              </div>
            )}
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
              onRowClick={viewLandlord}
            />
          </CardContent>
        </Card>
      </div>

    </SuperAdminLayout>
  );
};

export default LandlordsPage;
