import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useOnboardingRequests, useUpdateOnboardingStatus, useDeleteOnboardingRequest, useUpdateLandlordStatus } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, X, UserPlus, MoreVertical, Trash2, CheckCircle2, Clock, XCircle, Users } from 'lucide-react';
import { formatDateTime } from '@/lib/dates';
import { CreateLandlordDialog } from '@/components/super-admin/CreateLandlordDialog';
import type { OnboardingRequest } from '@/hooks/useSuperAdminData';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['pending', 'activated', 'dismissed'];

const STATUS_META = {
  pending: { label: 'Pending', icon: Clock, badge: STATUS_BADGE_CLASSES.info },
  activated: { label: 'Activated', icon: CheckCircle2, badge: STATUS_BADGE_CLASSES.success },
  dismissed: { label: 'Dismissed', icon: XCircle, badge: STATUS_BADGE_CLASSES.neutral },
} as const;

const getStatusBadgeColor = (status: string) =>
  STATUS_META[status as keyof typeof STATUS_META]?.badge ?? STATUS_BADGE_CLASSES.neutral;

const OnboardingRequestsPage = () => {
  const { data: requests, isLoading } = useOnboardingRequests();
  const updateStatus = useUpdateOnboardingStatus();
  const deleteRequest = useDeleteOnboardingRequest();
  const activateLandlord = useUpdateLandlordStatus();

  const {
    search: searchQuery,
    setSearch: setSearchQuery,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
  } = useTableViewState('super-admin-onboarding-requests-v2', 'pending');
  const [createAccountFor, setCreateAccountFor] = useState<OnboardingRequest | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OnboardingRequest | null>(null);

  const statusCounts = (requests ?? []).reduce(
    (acc, r) => {
      acc[r.status] = (acc[r.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const filteredRequests = requests?.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      r.full_name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.includes(searchQuery);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (requestId: string, status: string) => {
    updateStatus.mutate({ requestId, status });
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteRequest.mutate(deleteTarget.id);
    setDeleteTarget(null);
  };

  const columns = useMemo<ColumnDef<OnboardingRequest>[]>(
    () => [
      { id: 'Name', accessorKey: 'full_name', header: 'Name' },
      { id: 'Email', accessorKey: 'email', header: 'Email' },
      { id: 'Phone', accessorKey: 'phone', header: 'Phone' },
      {
        id: 'Plan',
        accessorKey: 'plan',
        header: 'Plan',
        cell: ({ row }) =>
          row.original.plan ? (
            <Badge variant="outline" className={STATUS_BADGE_CLASSES.info}>
              {row.original.plan}
            </Badge>
          ) : (
            <span className="text-[#64748B] text-sm">Not chosen yet</span>
          ),
      },
      {
        id: 'Status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const meta = STATUS_META[row.original.status as keyof typeof STATUS_META];
          return (
            <Badge variant="outline" className={cn('gap-1.5 font-medium', getStatusBadgeColor(row.original.status))}>
              {meta && <meta.icon className="h-3 w-3" />}
              {meta?.label ?? row.original.status}
            </Badge>
          );
        },
      },
      {
        id: 'Created',
        accessorKey: 'created_at',
        header: 'Created',
        cell: ({ row }) => formatDateTime(row.original.created_at),
      },
      {
        id: 'Actions',
        header: 'Actions',
        enableHiding: false,
        enableSorting: false,
        cell: ({ row }) => {
          const request = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={cn("p-1.5 rounded", ADMIN_SURFACE_HOVER)}>
                  <MoreVertical className="h-4 w-4 text-[#64748B]" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {request.status !== 'activated' && request.landlord_id && (
                  <DropdownMenuItem onClick={() => activateLandlord.mutate({ landlordId: request.landlord_id as string, status: 'active' })}>
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-600" />
                    Activate account
                  </DropdownMenuItem>
                )}
                {request.status !== 'activated' && !request.landlord_id && (
                  <DropdownMenuItem onClick={() => setCreateAccountFor(request)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create &amp; activate account
                  </DropdownMenuItem>
                )}
                {request.status !== 'dismissed' && request.status !== 'activated' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'dismissed')}>
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Dismiss
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => setDeleteTarget(request)}>
                  <Trash2 className="h-4 w-4 mr-2 text-red-600" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleStatusChange, activateLandlord]
  );

  const csvColumns: CsvColumn<OnboardingRequest>[] = [
    { id: 'Name', header: 'Name', accessor: (r) => r.full_name },
    { id: 'Email', header: 'Email', accessor: (r) => r.email },
    { id: 'Phone', header: 'Phone', accessor: (r) => r.phone },
    { id: 'Plan', header: 'Plan', accessor: (r) => r.plan },
    { id: 'Status', header: 'Status', accessor: (r) => r.status },
    { id: 'Created', header: 'Created', accessor: (r) => r.created_at },
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3.5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#1E3A5F] text-white shrink-0 shadow-sm">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Onboarding Requests</h1>
            <p className="text-[#64748B] text-sm">
              Leads from the public "Get started" form, plus self-serve signups that haven't activated yet.
            </p>
          </div>
        </div>

        {/* Status overview — click a card to filter by it */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {STATUS_OPTIONS.map((s) => {
            const meta = STATUS_META[s as keyof typeof STATUS_META];
            const isActive = statusFilter === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(isActive ? 'all' : s)}
                className={cn(
                  ADMIN_CARD,
                  'flex items-center gap-3.5 p-4 text-left transition-all',
                  isActive ? 'ring-2 ring-[#1E3A5F]/70 ring-offset-1' : ADMIN_SURFACE_HOVER
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg shrink-0',
                    s === 'pending' && 'bg-[#16A34A]/10 text-[#16A34A]',
                    s === 'activated' && 'bg-success/10 text-success',
                    s === 'dismissed' && 'bg-slate-100 text-slate-500'
                  )}
                >
                  <meta.icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-2xl font-semibold tracking-tight text-[#0F172A]">{statusCounts[s] ?? 0}</p>
                  <p className="text-sm text-[#64748B]">{meta.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <Card className={ADMIN_CARD}>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-[#64748B]" />
                <Input
                  placeholder="Search by name, email, or phone..."
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
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {STATUS_META[s as keyof typeof STATUS_META].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Requests List */}
        <Card className={ADMIN_CARD}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold tracking-tight text-[#0F172A]">Requests ({filteredRequests?.length || 0})</CardTitle>
            <CardDescription className="text-[#64748B]">
              Newest requests first
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable<OnboardingRequest>
              columns={columns}
              data={filteredRequests || []}
              sorting={sorting}
              onSortingChange={setSorting}
              columnVisibility={columnVisibility}
              onColumnVisibilityChange={setColumnVisibility}
              csvColumns={csvColumns}
              csvFilename="kodipap-onboarding-requests.csv"
              isLoading={isLoading}
              emptyMessage="No onboarding requests found"
            />
          </CardContent>
        </Card>
      </div>

      <CreateLandlordDialog
        open={!!createAccountFor}
        onOpenChange={(open) => !open && setCreateAccountFor(null)}
        initial={
          createAccountFor
            ? {
                fullName: createAccountFor.full_name,
                email: createAccountFor.email,
                phone: createAccountFor.phone,
              }
            : undefined
        }
        onboardingRequestId={createAccountFor?.id}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete onboarding request</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the request from <strong>{deleteTarget?.full_name}</strong>{' '}
              ({deleteTarget?.email}). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SuperAdminLayout>
  );
};

export default OnboardingRequestsPage;
