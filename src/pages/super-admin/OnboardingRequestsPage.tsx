import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useOnboardingRequests, useUpdateOnboardingStatus } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { Search, Check, X, PhoneCall, UserPlus, MoreVertical } from 'lucide-react';
import { formatDateTime } from '@/lib/dates';
import { CreateLandlordDialog } from '@/components/super-admin/CreateLandlordDialog';
import type { OnboardingRequest } from '@/hooks/useSuperAdminData';
import { DataTable } from '@/components/super-admin/DataTable';
import { useTableViewState } from '@/hooks/useTableViewState';
import type { CsvColumn } from '@/lib/csvExport';
import { STATUS_BADGE_CLASSES, ADMIN_CARD, ADMIN_SURFACE_HOVER } from '@/lib/adminStatusColors';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = ['new', 'contacted', 'converted', 'dismissed'];

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'new':
      return STATUS_BADGE_CLASSES.info;
    case 'contacted':
      return STATUS_BADGE_CLASSES.warning;
    case 'converted':
      return STATUS_BADGE_CLASSES.success;
    case 'dismissed':
      return STATUS_BADGE_CLASSES.neutral;
    default:
      return STATUS_BADGE_CLASSES.neutral;
  }
};

const OnboardingRequestsPage = () => {
  const { data: requests, isLoading } = useOnboardingRequests();
  const updateStatus = useUpdateOnboardingStatus();

  const {
    search: searchQuery,
    setSearch: setSearchQuery,
    statusFilter,
    setStatusFilter,
    sorting,
    setSorting,
    columnVisibility,
    setColumnVisibility,
  } = useTableViewState('super-admin-onboarding-requests');
  const [createAccountFor, setCreateAccountFor] = useState<OnboardingRequest | null>(null);

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

  const columns = useMemo<ColumnDef<OnboardingRequest>[]>(
    () => [
      { id: 'Name', accessorKey: 'full_name', header: 'Name' },
      { id: 'Email', accessorKey: 'email', header: 'Email' },
      { id: 'Phone', accessorKey: 'phone', header: 'Phone' },
      {
        id: 'Plan',
        accessorKey: 'plan',
        header: 'Plan',
        cell: ({ row }) => (
          <Badge variant="outline" className={STATUS_BADGE_CLASSES.info}>
            {row.original.plan}
          </Badge>
        ),
      },
      {
        id: 'Status',
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <Badge variant="outline" className={getStatusBadgeColor(row.original.status)}>
            {row.original.status}
          </Badge>
        ),
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
                {request.status === 'new' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'contacted')}>
                    <PhoneCall className="h-4 w-4 mr-2" />
                    Mark contacted
                  </DropdownMenuItem>
                )}
                {request.status !== 'converted' && (
                  <DropdownMenuItem onClick={() => setCreateAccountFor(request)}>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Create account
                  </DropdownMenuItem>
                )}
                {request.status !== 'converted' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'converted')}>
                    <Check className="h-4 w-4 mr-2 text-green-600" />
                    Mark converted
                  </DropdownMenuItem>
                )}
                {request.status !== 'dismissed' && (
                  <DropdownMenuItem onClick={() => handleStatusChange(request.id, 'dismissed')}>
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Dismiss
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [handleStatusChange]
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
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0F172A]">Onboarding Requests</h1>
          <p className="text-[#64748B]">
            Leads from the public "Get started" form — reach out and onboard them.
          </p>
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
                      {s}
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
    </SuperAdminLayout>
  );
};

export default OnboardingRequestsPage;
