import { useState } from 'react';
import SuperAdminLayout from '@/components/super-admin/SuperAdminLayout';
import { useLandlords, useUpdateLandlordStatus, useSubscriptionPlans, useAssignSubscription, useAllocateSmsTokens } from '@/hooks/useSuperAdminData';
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
import { Search, MoreVertical, UserPlus, Eye, Ban, CheckCircle, CreditCard, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import type { LandlordProfile } from '@/hooks/useSuperAdminData';

const LandlordsPage = () => {
  const { data: landlords, isLoading } = useLandlords();
  const { data: plans } = useSubscriptionPlans();
  const updateStatus = useUpdateLandlordStatus();
  const assignSubscription = useAssignSubscription();
  const allocateTokens = useAllocateSmsTokens();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLandlord, setSelectedLandlord] = useState<LandlordProfile | null>(null);
  const [dialogType, setDialogType] = useState<'view' | 'subscription' | 'sms' | null>(null);
  const [subscriptionData, setSubscriptionData] = useState({
    planId: '',
    paymentReference: '',
    amountPaid: '',
  });
  const [smsAmount, setSmsAmount] = useState('');

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
    if (!selectedLandlord || !smsAmount) return;
    await allocateTokens.mutateAsync({
      landlordId: selectedLandlord.id,
      amount: parseInt(smsAmount),
      description: 'Manual allocation by Super Admin',
    });
    setDialogType(null);
    setSmsAmount('');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'border-green-500 text-green-400';
      case 'suspended':
        return 'border-red-500 text-red-400';
      case 'expired':
        return 'border-yellow-500 text-yellow-400';
      case 'pending':
        return 'border-blue-500 text-blue-400';
      default:
        return 'border-slate-500 text-slate-400';
    }
  };

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Landlord Management</h1>
            <p className="text-slate-400">Manage landlord accounts and subscriptions</p>
          </div>
          <Button className="bg-primary hover:bg-primary/90">
            <UserPlus className="h-4 w-4 mr-2" />
            Add Landlord
          </Button>
        </div>

        {/* Filters */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by name, company, or phone..."
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
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">Landlords ({filteredLandlords?.length || 0})</CardTitle>
            <CardDescription className="text-slate-400">
              All registered landlords on the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full bg-slate-700" />
                ))}
              </div>
            ) : filteredLandlords?.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No landlords found</p>
            ) : (
              <div className="space-y-3">
                {filteredLandlords?.map((landlord) => (
                  <div
                    key={landlord.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-slate-900/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
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
                          Joined {format(new Date(landlord.created_at), 'MMM d, yyyy')}
                        </p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-slate-400">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
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
                          <DropdownMenuSeparator className="bg-slate-700" />
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
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
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
                    {format(new Date(selectedLandlord.created_at), 'MMM d, yyyy')}
                  </p>
                </div>
                <div>
                  <Label className="text-slate-400">Last Login</Label>
                  <p className="text-white">
                    {selectedLandlord.last_login_at
                      ? format(new Date(selectedLandlord.last_login_at), 'MMM d, yyyy HH:mm')
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
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
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
                <SelectTrigger className="bg-slate-900/50 border-slate-600">
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
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
                className="bg-slate-900/50 border-slate-600"
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
                className="bg-slate-900/50 border-slate-600"
                value={subscriptionData.amountPaid}
                onChange={(e) =>
                  setSubscriptionData({ ...subscriptionData, amountPaid: e.target.value })
                }
                placeholder="Amount in KES"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleAssignSubscription} disabled={!subscriptionData.planId}>
              Assign Subscription
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Allocate SMS Dialog */}
      <Dialog open={dialogType === 'sms'} onOpenChange={() => setDialogType(null)}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle>Allocate SMS Tokens</DialogTitle>
            <DialogDescription className="text-slate-400">
              Add SMS tokens to {selectedLandlord?.full_name}'s account
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-slate-900/50">
              <p className="text-sm text-slate-400">Current Balance</p>
              <p className="text-2xl font-bold text-white">
                {selectedLandlord?.sms_token_balance || 0} tokens
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-200">Tokens to Add</Label>
              <Input
                type="number"
                className="bg-slate-900/50 border-slate-600"
                value={smsAmount}
                onChange={(e) => setSmsAmount(e.target.value)}
                placeholder="Enter number of tokens"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogType(null)} className="border-slate-600">
              Cancel
            </Button>
            <Button onClick={handleAllocateSms} disabled={!smsAmount || parseInt(smsAmount) <= 0}>
              Allocate Tokens
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SuperAdminLayout>
  );
};

export default LandlordsPage;
