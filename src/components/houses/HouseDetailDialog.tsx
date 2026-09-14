import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar, CreditCard, Home, User, Phone, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { computeArrears, ArrearsPayment, ArrearsStatus } from '@/lib/arrears';

interface HouseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: { id: string; houseNo: string; expectedRent: number; occupancyDate: string | null } | null;
  tenant: { id: string; name: string; phone: string } | undefined;
  payments: ArrearsPayment[];
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatMonthLabel = (monthStr: string): string => {
  const [year, month] = monthStr.split('-');
  return `${MONTH_NAMES[Number(month) - 1]} ${year}`;
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getStatusIcon = (status: ArrearsStatus) => {
  switch (status) {
    case 'paid':
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    case 'partial':
      return <AlertCircle className="h-5 w-5 text-warning" />;
    case 'unpaid':
      return <XCircle className="h-5 w-5 text-destructive" />;
  }
};

const getStatusBg = (status: ArrearsStatus) => {
  switch (status) {
    case 'paid':
      return 'bg-success/10 border-success/20';
    case 'partial':
      return 'bg-warning/10 border-warning/20';
    case 'unpaid':
      return 'bg-destructive/10 border-destructive/20';
  }
};

export const HouseDetailDialog = ({
  open,
  onOpenChange,
  house,
  tenant,
  payments,
}: HouseDetailDialogProps) => {
  if (!house) return null;

  const arrears = computeArrears(house.occupancyDate, house.expectedRent, payments);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            House {house.houseNo} — Rent Statement
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

          {arrears === null ? (
            <div className="p-8 text-center text-muted-foreground">
              This house is vacant — no rent is accruing.
            </div>
          ) : (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Expected</p>
                  <p className="text-xl font-bold text-foreground">{formatCurrency(arrears.totalExpected)}</p>
                </div>
                <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Total Collected</p>
                  <p className="text-xl font-bold text-success flex items-center justify-center gap-1">
                    <TrendingUp className="h-4 w-4" />
                    {formatCurrency(arrears.totalPaid)}
                  </p>
                </div>
                <div className={`p-4 rounded-xl text-center ${arrears.arrears > 0 ? 'bg-destructive/10 border border-destructive/20' : 'bg-success/10 border border-success/20'}`}>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                    {arrears.arrears > 0 ? 'Outstanding' : 'Credit'}
                  </p>
                  <p className={`text-xl font-bold flex items-center justify-center gap-1 ${arrears.arrears > 0 ? 'text-destructive' : 'text-success'}`}>
                    {arrears.arrears > 0 && <TrendingDown className="h-4 w-4" />}
                    {formatCurrency(Math.abs(arrears.arrears))}
                  </p>
                </div>
              </div>

              <Separator />

              {/* Monthly Breakdown Grid */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Monthly Breakdown
                </h3>

                <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                  {arrears.monthlyBreakdown.map((monthData) => (
                    <div
                      key={monthData.month}
                      className={`p-4 rounded-xl border transition-all hover:shadow-md ${getStatusBg(monthData.status)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-sm">{formatMonthLabel(monthData.month)}</span>
                        {getStatusIcon(monthData.status)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Paid</span>
                          <span className="font-medium text-success">
                            {formatCurrency(monthData.paidAmount)}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Due</span>
                          <span className={`font-medium ${monthData.balance > 0 ? 'text-destructive' : 'text-foreground'}`}>
                            {formatCurrency(monthData.balance)}
                          </span>
                        </div>
                        <Progress
                          value={monthData.expectedRent > 0 ? Math.min((monthData.paidAmount / monthData.expectedRent) * 100, 100) : 100}
                          className="h-1.5 mt-2"
                        />
                        {monthData.refs.length > 0 && (
                          <p className="text-[10px] font-mono text-muted-foreground truncate mt-1" title={monthData.refs.join(', ')}>
                            {monthData.refs.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-6 justify-center pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span>Paid</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span>Partial</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <XCircle className="h-4 w-4 text-destructive" />
                  <span>Unpaid</span>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
