import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Calendar, CreditCard, Home, User, Phone, TrendingUp, TrendingDown, CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { House, Tenant, Balance, Payment } from '@/lib/mockData';

interface HouseDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  house: House | null;
  tenant: Tenant | undefined;
  balance: Balance | undefined;
  payments: Payment[];
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Mock yearly data generator
const generateYearlyData = (houseId: string, expectedRent: number) => {
  const currentMonth = 0; // January (0-indexed)
  
  return months.map((month, index) => {
    // Only show data up to current month (January 2025)
    if (index > currentMonth) {
      return {
        month,
        monthIndex: index,
        expectedRent,
        paidAmount: 0,
        balance: expectedRent,
        status: 'upcoming' as const,
        payments: [],
      };
    }

    // Mock data for demonstration - varies by house
    const mockPaidAmounts: Record<string, number[]> = {
      '1': [8000], // Fully paid
      '2': [5000], // Partial
      '3': [10000], // Fully paid
      '4': [10000], // Fully paid
      '5': [12000], // Fully paid
      '6': [8000], // Partial
      '7': [15000], // Fully paid
      '8': [0], // Unpaid
    };

    const paidAmount = mockPaidAmounts[houseId]?.[index] ?? 0;
    const balance = expectedRent - paidAmount;
    const status = paidAmount === 0 ? 'unpaid' : paidAmount >= expectedRent ? 'paid' : 'partial';

    return {
      month,
      monthIndex: index,
      expectedRent,
      paidAmount,
      balance: Math.max(0, balance),
      status: status as 'paid' | 'partial' | 'unpaid',
      payments: [],
    };
  });
};

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

  const yearlyData = generateYearlyData(house.id, house.expectedRent);
  
  const yearSummary = yearlyData.reduce(
    (acc, month) => {
      if (month.status !== 'upcoming') {
        acc.totalExpected += month.expectedRent;
        acc.totalPaid += month.paidAmount;
        acc.totalBalance += month.balance;
      }
      return acc;
    },
    { totalExpected: 0, totalPaid: 0, totalBalance: 0 }
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case 'partial':
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case 'unpaid':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <Calendar className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success/10 border-success/20';
      case 'partial':
        return 'bg-warning/10 border-warning/20';
      case 'unpaid':
        return 'bg-destructive/10 border-destructive/20';
      default:
        return 'bg-muted/50 border-muted';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 rounded-lg bg-primary/10">
              <Home className="h-5 w-5 text-primary" />
            </div>
            House {house.houseNo} - 2025 Yearly Tracker
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

          {/* Year Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Year Expected</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(yearSummary.totalExpected)}</p>
            </div>
            <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Year Collected</p>
              <p className="text-xl font-bold text-success flex items-center justify-center gap-1">
                <TrendingUp className="h-4 w-4" />
                {formatCurrency(yearSummary.totalPaid)}
              </p>
            </div>
            <div className={`p-4 rounded-xl text-center ${yearSummary.totalBalance > 0 ? 'bg-destructive/10 border border-destructive/20' : 'bg-success/10 border border-success/20'}`}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">Outstanding</p>
              <p className={`text-xl font-bold flex items-center justify-center gap-1 ${yearSummary.totalBalance > 0 ? 'text-destructive' : 'text-success'}`}>
                {yearSummary.totalBalance > 0 && <TrendingDown className="h-4 w-4" />}
                {formatCurrency(yearSummary.totalBalance)}
              </p>
            </div>
          </div>

          <Separator />

          {/* Monthly Tracker Grid */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Monthly Breakdown
            </h3>

            <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
              {yearlyData.map((monthData) => (
                <div
                  key={monthData.month}
                  className={`p-4 rounded-xl border transition-all ${getStatusBg(monthData.status)} ${monthData.status === 'upcoming' ? 'opacity-50' : 'hover:shadow-md'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{monthData.month.slice(0, 3)}</span>
                    {getStatusIcon(monthData.status)}
                  </div>
                  
                  {monthData.status !== 'upcoming' ? (
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
                        value={Math.min((monthData.paidAmount / monthData.expectedRent) * 100, 100)} 
                        className="h-1.5 mt-2" 
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Upcoming</p>
                  )}
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
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Upcoming</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
