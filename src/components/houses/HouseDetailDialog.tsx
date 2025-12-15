import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar, CreditCard, Home, User, Phone, TrendingUp, TrendingDown } from 'lucide-react';
import { House, Tenant, Balance, Payment } from '@/lib/mockData';

interface HouseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null;
  tenant: Tenant | undefined;
  balance: Balance | undefined;
  payments: Payment[];
}

export const HouseDetailDialog = ({
  open,
  onOpenChange,
  house,
  tenant,
  balance,
  payments,
}: HouseDetailDialogProps) => {
  if (!house) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-KE', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const progressPercentage = balance 
    ? Math.min((balance.paidAmount / balance.expectedRent) * 100, 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            House {house.houseNo} - January 2025 Tracker
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* House & Tenant Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Property Details
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{house.houseNo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span>Expected: {formatCurrency(house.expectedRent)}/month</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-muted/50 space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                Tenant Information
              </h3>
              {tenant ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{tenant.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{tenant.phone}</span>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No tenant assigned</p>
              )}
            </div>
          </div>

          <Separator />

          {/* January Balance Summary */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                January 2025 Summary
              </h3>
              {balance && <StatusBadge status={balance.status} />}
            </div>

            {balance ? (
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Collection Progress</span>
                    <span className="font-medium">{Math.round(progressPercentage)}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Expected</p>
                    <p className="text-lg font-bold text-foreground">{formatCurrency(balance.expectedRent)}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Paid</p>
                    <p className="text-lg font-bold text-success flex items-center justify-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      {formatCurrency(balance.paidAmount)}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl text-center ${balance.balance > 0 ? 'bg-destructive/10 border border-destructive/20' : 'bg-success/10 border border-success/20'}`}>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Balance</p>
                    <p className={`text-lg font-bold flex items-center justify-center gap-1 ${balance.balance > 0 ? 'text-destructive' : 'text-success'}`}>
                      {balance.balance > 0 && <TrendingDown className="h-4 w-4" />}
                      {formatCurrency(balance.balance)}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No balance data for January 2025</p>
            )}
          </div>

          <Separator />

          {/* Payment History for January */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Payment History</h3>
            {payments.length > 0 ? (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="p-4 rounded-xl border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <p className="font-medium text-success">{formatCurrency(payment.amount)}</p>
                        <p className="text-sm text-muted-foreground">
                          Ref: {payment.mpesaRef}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{payment.tenantName}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(payment.date)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-xl bg-muted/30">
                <CreditCard className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No payments recorded for January 2025</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
