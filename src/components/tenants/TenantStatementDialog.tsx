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
import { formatDate } from '@/lib/dates';
import { computeArrears, isRentPayment, ArrearsPayment, MonthlyStatementEntry } from '@/lib/arrears';

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

const formatPaymentDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return format(d, 'd MMM yyyy');
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

// The amount to display in the Paid column: the real amount received when a
// payment landed in this calendar month, otherwise the portion of an earlier
// payment that was applied to this month's rent.
const displayedPaid = (record: MonthlyStatementEntry): number =>
  record.receivedThisMonth > 0 ? record.receivedThisMonth : record.paidAmount;

const getStatusBadge = (status: 'paid' | 'partial' | 'unpaid', isFuture = false) => {
  if (isFuture) {
    return <Badge className="bg-primary/10 text-primary border-primary/20">Prepaid</Badge>;
  }
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
  deposit: ArrearsPayment | undefined,
  monthlyBreakdown: MonthlyStatementEntry[],
  futureCredit: MonthlyStatementEntry[],
  totalExpected: number,
  totalPaid: number,
  totalOutstanding: number,
): string => {
  const buildRow = (record: MonthlyStatementEntry, isFuture: boolean) => {
    const statusClass = isFuture ? 'status-future' : record.status === 'paid' ? 'status-paid' : record.status === 'partial' ? 'status-partial' : 'status-unpaid';
    const statusText = isFuture ? 'Prepaid' : record.status === 'paid' ? 'Paid' : record.status === 'partial' ? 'Partial' : 'Unpaid';
    const breakdown = record.payments.length > 0
      ? `<table class="pay-list"><tbody>${record.payments
          .map(
            (p) =>
              `<tr><td class="pd">${formatPaymentDate(p.date)}</td><td class="pa">${formatCurrency(p.amount)}${p.paymentTotal > p.amount ? `<span class="split"> of ${formatCurrency(p.paymentTotal)}</span>` : ''}</td><td class="pr">${p.ref ?? ''}</td></tr>`,
          )
          .join('')}</tbody></table>`
      : '-';
    const paid = displayedPaid(record);
    return `
      <tr class="${isFuture ? 'future-row' : ''}">
        <td class="month">${formatMonthLabel(record.month)}</td>
        <td class="num">${formatCurrency(record.expectedRent)}</td>
        <td class="num total">${paid > 0 ? formatCurrency(paid) : '-'}</td>
        <td class="num">${record.balance > 0 ? formatCurrency(record.balance) : '-'}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td class="ref">${breakdown}</td>
      </tr>
    `;
  };

  const rows = monthlyBreakdown.map((record) => buildRow(record, false)).join('');
  const futureRows = futureCredit.map((record) => buildRow(record, true)).join('');

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
        td.ref { padding: 4px 6px; min-width: 220px; }
        .pay-list { width: 100%; border-collapse: collapse; }
        .pay-list td { border: none; padding: 2px 10px 2px 0; font-size: 10px; }
        .pay-list tr + tr td { border-top: 1px dashed #e2e8f0; padding-top: 4px; margin-top: 4px; }
        .pay-list .pd { color: #64748b; white-space: nowrap; width: 60px; }
        .pay-list .pa { color: #16a34a; font-weight: 700; text-align: right; white-space: nowrap; }
        .pay-list .pa .split { color: #64748b; font-weight: 400; }
        .pay-list .pr { font-family: monospace; color: #64748b; white-space: nowrap; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
        .status-paid { background: #dcfce7; color: #166534; }
        .status-partial { background: #fef9c3; color: #854d0e; }
        .status-unpaid { background: #fee2e2; color: #991b1b; }
        .status-future { background: #dbeafe; color: #1e40af; }
        .future-row { background: #f8fafc; }
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
        ${deposit ? `<div class="meta-item"><p>Deposit</p><strong>${formatCurrency(deposit.amount)} <span style="font-weight:400;color:#64748b;">(${formatPaymentDate(deposit.payment_date)})</span></strong></div>` : ''}
      </div>
      <table>
        <thead>
          <tr><th>Month</th><th>Rent Due</th><th>Paid</th><th>Balance</th><th>Status</th><th>Payment Breakdown</th></tr>
        </thead>
        <tbody>
          ${rows}
          ${futureRows}
          <tr class="totals-row">
            <td class="totals-label">TOTALS</td>
            <td class="num">${formatCurrency(totalExpected)}</td>
            <td class="num total">${formatCurrency(totalPaid)}</td>
            <td class="num">${totalOutstanding > 0 ? formatCurrency(totalOutstanding) : '-'}</td>
            <td></td>
            <td></td>
          </tr>
        </tbody>
      </table>
      <div class="footer">Printed ${formatDate(new Date())}</div>
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

  const deposit = payments.find((p) => p.payment_type === 'deposit');
  const arrears = computeArrears(house.occupancyDate, house.expectedRent, payments.filter(isRentPayment));

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
        deposit,
        arrears.monthlyBreakdown,
        arrears.futureCredit,
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
          {deposit && (
            <div>
              <p className="text-xs text-muted-foreground">Deposit</p>
              <p className="font-medium">
                {formatCurrency(deposit.amount)} <span className="text-xs text-muted-foreground">({formatPaymentDate(deposit.payment_date)})</span>
              </p>
            </div>
          )}
        </div>

        {!arrears ? (
          <div className="p-8 text-center text-muted-foreground">
            This house is vacant — no rent is accruing.
          </div>
        ) : (
          <ScrollArea className="h-[400px] rounded-md border">
            <Table className="table-fixed">
              <TableHeader className="sticky top-0 bg-background">
                <TableRow>
                  <TableHead className="w-[90px]">Month</TableHead>
                  <TableHead className="w-[100px] text-right">Rent Due</TableHead>
                  <TableHead className="w-[100px] text-right">Paid</TableHead>
                  <TableHead className="w-[100px] text-right">Balance</TableHead>
                  <TableHead className="w-[90px]">Status</TableHead>
                  <TableHead>Payment Breakdown</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {arrears.monthlyBreakdown.map((record) => (
                  <MonthRow key={record.month} record={record} />
                ))}
                {arrears.futureCredit.map((record) => (
                  <MonthRow key={record.month} record={record} isFuture />
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
};

const MonthRow = ({ record, isFuture = false }: { record: MonthlyStatementEntry; isFuture?: boolean }) => {
  const paid = displayedPaid(record);
  return (
    <TableRow className={isFuture ? 'bg-muted/30' : undefined}>
      <TableCell className="font-medium">{formatMonthLabel(record.month)}</TableCell>
      <TableCell className="text-right">{formatCurrency(record.expectedRent)}</TableCell>
      <TableCell className="text-right">
        {paid > 0 ? <span className="font-semibold text-success">{formatCurrency(paid)}</span> : '-'}
      </TableCell>
      <TableCell className="text-right">
        {record.balance > 0 ? <span className="text-destructive font-medium">{formatCurrency(record.balance)}</span> : '-'}
      </TableCell>
      <TableCell>{getStatusBadge(record.status, isFuture)}</TableCell>
      <TableCell>
        {record.payments.length > 0 ? (
          <table className="border-collapse">
            <tbody>
              {record.payments.map((p, i) => (
                <tr key={i}>
                  <td className="text-muted-foreground text-xs whitespace-nowrap py-0.5 pr-3">{formatPaymentDate(p.date)}</td>
                  <td className="font-semibold text-success text-xs whitespace-nowrap py-0.5 pr-3">
                    {formatCurrency(p.amount)}
                    {p.paymentTotal > p.amount && (
                      <span className="font-normal text-muted-foreground"> of {formatCurrency(p.paymentTotal)}</span>
                    )}
                  </td>
                  <td className="py-0.5">
                    {p.ref && (
                      <span className="font-mono text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                        {p.ref}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <span className="text-muted-foreground text-xs">-</span>
        )}
      </TableCell>
    </TableRow>
  );
};
