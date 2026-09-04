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
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Printer } from 'lucide-react';
import { format } from 'date-fns';
import { computeArrears, ArrearsPayment, MonthlyStatementEntry } from '@/lib/arrears';

interface TenantStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: { id: string; name: string; phone: string } | null;
  house: { id: string; houseNo: string; expectedRent: number; occupancyDate: string | null } | null;
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

const buildPrintHtml = (
  tenantName: string,
  tenantPhone: string,
  houseNo: string,
  expectedRent: number,
  monthlyBreakdown: MonthlyStatementEntry[],
  totalExpected: number,
  totalPaid: number,
  totalOutstanding: number,
): string => {
  const rows = monthlyBreakdown
    .map((record) => {
      const statusClass = record.status === 'paid' ? 'status-paid' : record.status === 'partial' ? 'status-partial' : 'status-unpaid';
      const statusText = record.status === 'paid' ? 'Paid' : record.status === 'partial' ? 'Partial' : 'Unpaid';
      return `
        <tr>
          <td class="month">${formatMonthLabel(record.month)}</td>
          <td class="num">${formatCurrency(record.expectedRent)}</td>
          <td class="num total">${record.paidAmount > 0 ? formatCurrency(record.paidAmount) : '-'}</td>
          <td class="num">${record.balance > 0 ? formatCurrency(record.balance) : '-'}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
        </tr>
      `;
    })
    .join('');

  return `
    <html>
    <head>
      <title>Rent Statement - ${tenantName}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: Arial, sans-serif; padding: 20px; color: #0f172a; font-size: 12px; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        h2 { font-size: 14px; margin: 0 0 16px; color: #64748b; font-weight: 400; }
        .meta { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; padding: 12px; background: #f8fafc; border-radius: 6px; }
        .meta-item p { margin: 0; font-size: 11px; color: #64748b; }
        .meta-item strong { font-size: 13px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 0; }
        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
        th { background: #f1f5f9; font-weight: 600; font-size: 11px; }
        td.month { font-weight: 600; white-space: nowrap; }
        td.num { text-align: right; white-space: nowrap; }
        td.total { font-weight: 700; color: #16a34a; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-partial { background: #fef9c3; color: #854d0e; }
        .status-unpaid { background: #fee2e2; color: #991b1b; }
        .totals-row { background: #f8fafc; font-weight: 700; }
        .totals-row td { border-top: 2px solid #0f172a; }
        .totals-label { text-align: right; padding-right: 8px; }
        .footer { margin-top: 12px; font-size: 10px; color: #64748b; }
      </style>
    </head>
    <body>
      <h1>KODI PAP — Rent Statement</h1>
      <h2>Full tenancy history</h2>
      <div class="meta">
        <div class="meta-item"><p>Tenant</p><strong>${tenantName}</strong></div>
        <div class="meta-item"><p>Phone</p><strong>${tenantPhone}</strong></div>
        <div class="meta-item"><p>House No</p><strong>${houseNo}</strong></div>
        <div class="meta-item"><p>Monthly Rent</p><strong>${formatCurrency(expectedRent)}</strong></div>
      </div>
      <table>
        <thead>
          <tr><th>Month</th><th>Rent Due</th><th>Paid</th><th>Balance</th><th>Status</th></tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="totals-row">
            <td class="totals-label">TOTALS</td>
            <td class="num">${formatCurrency(totalExpected)}</td>
            <td class="num total">${formatCurrency(totalPaid)}</td>
            <td class="num">${totalOutstanding > 0 ? formatCurrency(totalOutstanding) : '-'}</td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">Printed ${format(new Date(), 'dd/MM/yyyy')}</div>
    </body>
    </html>
  `;
};

export const TenantStatementDialog = ({
  open,
  onOpenChange,
  tenant,
  house,
  payments,
}: TenantStatementDialogProps) => {
  if (!tenant || !house) return null;

  const arrears = computeArrears(house.occupancyDate, house.expectedRent, payments);

  const handlePrint = () => {
    if (!arrears) return;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(
      buildPrintHtml(
        tenant.name,
        tenant.phone,
        house.houseNo,
        house.expectedRent,
        arrears.monthlyBreakdown,
        arrears.totalExpected,
        arrears.totalPaid,
        Math.max(0, arrears.arrears),
      ),
    );
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">Rent Statement</DialogTitle>
          <Button variant="outline" size="sm" onClick={handlePrint} disabled={!arrears}>
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
        </DialogHeader>

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
            <p className="font-semibold text-primary">{formatCurrency(house.expectedRent)}</p>
          </div>
        </div>

        {!arrears ? (
          <div className="p-8 text-center text-muted-foreground">
            This house is vacant — no rent is accruing.
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-md border">
            <Table>
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[100px]">Month</TableHead>
                  <TableHead className="text-right">Rent Due</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrears.monthlyBreakdown.map((record) => (
                  <TableRow key={record.month}>
                    <TableCell className="font-medium">{formatMonthLabel(record.month)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(record.expectedRent)}</TableCell>
                    <TableCell className="text-right">
                      {record.paidAmount > 0 ? (
                        <span className="font-semibold text-success">{formatCurrency(record.paidAmount)}</span>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {record.balance > 0 ? (
                        <span className="text-destructive font-medium">{formatCurrency(record.balance)}</span>
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
        )}
      </DialogContent>
    </Dialog>
  );
};
