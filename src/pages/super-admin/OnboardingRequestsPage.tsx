import { useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useOnboardingRequests, useUpdateOnboardingStatus } from '@/hooks/useSuperAdminData';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Phone, Mail, Check, X, PhoneCall, UserPlus } from 'lucide-react';
import { formatDateTime } from '@/lib/dates';
import { CreateLandlordDialog } from '@/components/super-admin/CreateLandlordDialog';
import type { OnboardingRequest } from '@/hooks/useSuperAdminData';
import { STATUS_BADGE_CLASSES } from '@/lib/adminStatusColors';

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

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Onboarding Requests</h1>
          <p className="text-slate-400">
            Leads from the public "Get started" form — reach out and onboard them.
          </p>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-10 bg-slate-900/50 border-slate-600 text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 bg-slate-900/50 border-slate-600 text-white">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
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
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Requests ({filteredRequests?.length || 0})</CardTitle>
            <CardDescription className="text-slate-400">
              Newest requests first
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-20 w-full bg-slate-700" />
                ))}
              </div>
            ) : filteredRequests?.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No onboarding requests found</p>
            ) : (
              <div className="space-y-3">
                {filteredRequests?.map((request) => (
                  <div
                    key={request.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-12 h-12 shrink-0 rounded-full bg-primary/20 flex items-center justify-center">
                        <span className="text-primary font-bold text-lg">
                          {request.full_name[0]}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{request.full_name}</p>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3.5 w-3.5" /> {request.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="h-3.5 w-3.5" /> {request.phone}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {formatDateTime(request.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
                      <Badge variant="outline" className="border-primary/40 text-primary">
                        {request.plan}
                      </Badge>
                      <Badge variant="outline" className={getStatusBadgeColor(request.status)}>
                        {request.status}
                      </Badge>

                      {request.status === 'new' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-slate-200 hover:bg-slate-800"
                          onClick={() => handleStatusChange(request.id, 'contacted')}
                        >
                          <PhoneCall className="h-4 w-4 mr-1.5" /> Mark contacted
                        </Button>
                      )}
                      {request.status !== 'converted' && (
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90"
                          onClick={() => setCreateAccountFor(request)}
                        >
                          <UserPlus className="h-4 w-4 mr-1.5" /> Create account
                        </Button>
                      )}
                      {request.status !== 'converted' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-green-600 text-green-400 hover:bg-green-950"
                          onClick={() => handleStatusChange(request.id, 'converted')}
                        >
                          <Check className="h-4 w-4 mr-1.5" /> Mark converted
                        </Button>
                      )}
                      {request.status !== 'dismissed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-950"
                          onClick={() => handleStatusChange(request.id, 'dismissed')}
                        >
                          <X className="h-4 w-4 mr-1.5" /> Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
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
