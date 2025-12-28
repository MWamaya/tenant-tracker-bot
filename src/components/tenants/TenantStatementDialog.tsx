import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tenant, House, Payment } from '@/lib/mockData';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TenantStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: Tenant | null;
  house: House | null;
  payments: Payment[];
}

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

interface MonthlyRecord {
  month: string;
  monthIndex: number;
  expectedRent: number;
  payments: { amount: number; mpesaRef: string; date: string }[];
  totalPaid: number;
  balanceBroughtForward: number;
  balanceCarriedForward: number;
  status: 'paid' | 'partial' | 'unpaid';
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

export const TenantStatementDialog = ({
  open,
  onOpenChange,
  tenant,
  house,
  payments,
}: TenantStatementDialogProps) => {
  if (!tenant || !house) return null;

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const expectedRent = house.expectedRent;

  // Generate yearly statement with balance carry forward
  const generateYearlyStatement = (): MonthlyRecord[] => {
    const records: MonthlyRecord[] = [];
    let carryForwardBalance = 0;

    for (let i = 0; i < 12; i++) {
      const monthPayments = payments.filter(p => {
        const paymentDate = new Date(p.date);
        return paymentDate.getMonth() === i && paymentDate.getFullYear() === currentYear;
      });

      const totalPaid = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const balanceBroughtForward = carryForwardBalance;
      const totalDue = expectedRent + balanceBroughtForward;
      const balanceCarriedForward = Math.max(0, totalDue - totalPaid);

      let status: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (totalPaid >= totalDue) {
        status = 'paid';
      } else if (totalPaid > 0) {
        status = 'partial';
      }

      records.push({
        month: months[i],
        monthIndex: i,
        expectedRent,
        payments: monthPayments.map(p => ({
          amount: p.amount,
          mpesaRef: p.mpesaRef,
          date: p.date,
        })),
        totalPaid,
        balanceBroughtForward,
        balanceCarriedForward,
        status,
      });

      carryForwardBalance = balanceCarriedForward;
    }

    return records;
  };

  const yearlyStatement = generateYearlyStatement();
  const totalExpected = yearlyStatement.reduce((sum, r) => sum + r.expectedRent, 0);
  const totalPaid = yearlyStatement.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalOutstanding = yearlyStatement[11]?.balanceCarriedForward || 0;

  const getStatusBadge = (status: 'paid' | 'partial' | 'unpaid') => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>;
      case 'partial':
        return <Badge className="bg-warning/10 text-warning border-warning/20">Partial</Badge>;
      case 'unpaid':
        return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Unpaid</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl">Annual Statement - {currentYear}</DialogTitle>
        </DialogHeader>

        {/* Tenant & House Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-xs text-muted-foreground">Tenant</p>
            <p className="font-semibold">{tenant.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="font-medium">{tenant.phone}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">House No</p>
            <p className="font-medium">{house.houseNo}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Monthly Rent</p>
            <p className="font-semibold text-primary">{formatCurrency(expectedRent)}</p>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-primary/5 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total Expected</p>
            <p className="font-bold text-lg">{formatCurrency(totalExpected)}</p>
          </div>
          <div className="p-3 bg-success/5 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Total Paid</p>
            <p className="font-bold text-lg text-success">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="p-3 bg-destructive/5 rounded-lg text-center">
            <p className="text-xs text-muted-foreground">Outstanding</p>
            <p className="font-bold text-lg text-destructive">{formatCurrency(totalOutstanding)}</p>
          </div>
        </div>

        {/* Monthly Breakdown Table */}
        <ScrollArea className="h-[400px] rounded-md border">
          <Table>
            <TableHeader className="sticky top-0 bg-background">
              <TableRow>
                <TableHead className="w-[100px]">Month</TableHead>
                <TableHead className="text-right">B/F</TableHead>
                <TableHead className="text-right">Rent Due</TableHead>
                <TableHead className="text-right">Paid</TableHead>
                <TableHead>M-Pesa Ref</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">C/F</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearlyStatement
                .filter((record) => record.monthIndex === currentMonth)
                .map((record) => (
                <TableRow key={record.monthIndex}>
                  <TableCell className="font-medium">{record.month}</TableCell>
                  <TableCell className="text-right">
                    {record.balanceBroughtForward > 0 ? (
                      <span className="text-destructive">{formatCurrency(record.balanceBroughtForward)}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(record.expectedRent)}</TableCell>
                  <TableCell className="text-right">
                    {record.totalPaid > 0 ? (
                      <span className="text-success font-medium">{formatCurrency(record.totalPaid)}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {record.payments.length > 0 ? (
                      <div className="space-y-1">
                        {record.payments.map((p, idx) => (
                          <div key={idx} className="text-xs font-mono">{p.mpesaRef}</div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {record.payments.length > 0 ? (
                      <div className="space-y-1">
                        {record.payments.map((p, idx) => (
                          <div key={idx} className="text-xs">
                            {format(new Date(p.date), 'dd MMM yyyy')}
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.balanceCarriedForward > 0 ? (
                      <span className="text-destructive font-medium">{formatCurrency(record.balanceCarriedForward)}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(record.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span><strong>B/F</strong> = Balance Brought Forward</span>
          <span><strong>C/F</strong> = Balance Carried Forward</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
