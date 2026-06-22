import { useEffect, useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Tenant, House, Payment } from '@/lib/mockData';
import { format } from 'date-fns';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Pencil, Check, X, RotateCcw, Printer } from 'lucide-react';
import { toast } from 'sonner';
import { useEffectiveLandlordId } from '@/hooks/useImpersonation';
import { supabase } from '@/integrations/supabase/client';

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
  payments: { amount: number; mpesaRef: string; date: string; isRollover?: boolean }[];
  totalPaid: number;
  balanceBroughtForward: number;
  balanceCarriedForward: number;
  status: 'paid' | 'partial' | 'unpaid';
  isManualOverride: boolean;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);
};

const getOverrideStorageKey = (tenantId: string, year: number) =>
  `bf_overrides_${tenantId}_${year}`;

export const TenantStatementDialog = ({
  open,
  onOpenChange,
  tenant,
  house,
  payments,
}: TenantStatementDialogProps) => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();

  // Manual C/F overrides keyed by month index
  const [bfOverrides, setBfOverrides] = useState<Record<number, number>>({});
  const [editingMonth, setEditingMonth] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [landlordCreatedAt, setLandlordCreatedAt] = useState<string | null>(null);

  const landlordId = useEffectiveLandlordId();

  // Load overrides whenever the tenant/dialog changes
  useEffect(() => {
    if (!tenant || !open) return;
    try {
      const stored = localStorage.getItem(getOverrideStorageKey(tenant.id, currentYear));
      setBfOverrides(stored ? JSON.parse(stored) : {});
    } catch {
      setBfOverrides({});
    }
    setEditingMonth(null);
  }, [tenant, open, currentYear]);

  // Fetch the landlord's app registration date so the statement starts from that month
  useEffect(() => {
    if (!landlordId || !open) return;
    const fetchLandlordCreatedAt = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .eq('id', landlordId)
        .single();
      if (!error && data) {
        setLandlordCreatedAt(data.created_at);
      }
    };
    fetchLandlordCreatedAt();
  }, [landlordId, open]);

  if (!tenant || !house) return null;

  const expectedRent = house.expectedRent;

  const persistOverrides = (next: Record<number, number>) => {
    setBfOverrides(next);
    try {
      localStorage.setItem(
        getOverrideStorageKey(tenant.id, currentYear),
        JSON.stringify(next)
      );
    } catch {
      /* ignore quota errors */
    }
  };

  const handleStartEdit = (monthIndex: number, currentValue: number) => {
    setEditingMonth(monthIndex);
    setEditValue(String(currentValue || 0));
  };

  const handleSaveEdit = (monthIndex: number) => {
    const parsed = Number(editValue);
    if (Number.isNaN(parsed) || parsed < 0) {
      toast.error('Enter a valid non-negative amount');
      return;
    }
    persistOverrides({ ...bfOverrides, [monthIndex]: parsed });
    setEditingMonth(null);
    toast.success(`Balance brought forward updated for ${months[monthIndex]}`);
  };

  const handleResetOverride = (monthIndex: number) => {
    const next = { ...bfOverrides };
    delete next[monthIndex];
    persistOverrides(next);
    setEditingMonth(null);
    toast.success(`Reverted to auto-calculated C/F for ${months[monthIndex]}`);
  };

  // Statement starts from: (1) landlord's saved override in Settings if set for this year,
  // otherwise (2) landlord's app registration month if registered this year,
  // otherwise (3) January.
  let overrideMonth: number | null = null;
  let overrideYear: number | null = null;
  if (landlordId) {
    try {
      const raw = localStorage.getItem(`statement_start_${landlordId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed.month === 'number') overrideMonth = parsed.month;
        if (typeof parsed.year === 'number') overrideYear = parsed.year;
      }
    } catch {
      /* ignore */
    }
  }
  const registrationDateObj = landlordCreatedAt ? new Date(landlordCreatedAt) : null;
  const STATEMENT_START_MONTH =
    overrideMonth !== null && overrideYear === currentYear
      ? overrideMonth
      : registrationDateObj && registrationDateObj.getFullYear() === currentYear
      ? registrationDateObj.getMonth()
      : 0;
  const monthsFromStart = 12 - STATEMENT_START_MONTH;
  const monthOrder = Array.from({ length: monthsFromStart }, (_, k) => STATEMENT_START_MONTH + k);


  // Generate yearly statement with balance carry forward + manual overrides.
  // C/F is computed strictly as: B/F + Rent Due − Paid (can be negative when overpaid).
  const generateYearlyStatement = (): MonthlyRecord[] => {
    const records: MonthlyRecord[] = [];
    let carryForwardBalance = 0;

    for (const i of monthOrder) {
      const monthPayments = payments
        .filter((p) => {
          const paymentDate = new Date(p.date);
          return paymentDate.getMonth() === i && paymentDate.getFullYear() === currentYear;
        })
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // Manual override takes precedence over auto-calc
      const hasOverride = Object.prototype.hasOwnProperty.call(bfOverrides, i);
      const balanceBroughtForward = hasOverride ? bfOverrides[i] : carryForwardBalance;

      const appliedPayments: MonthlyRecord['payments'] = monthPayments.map((p) => ({
        amount: p.amount,
        mpesaRef: p.mpesaRef,
        date: p.date,
      }));

      const totalPaid = appliedPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalDue = expectedRent + balanceBroughtForward;
      // C/F = B/F + Rent Due − Paid (no clamping; negative means credit to next month)
      const balanceCarriedForward = totalDue - totalPaid;

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
        payments: appliedPayments,
        totalPaid,
        balanceBroughtForward,
        balanceCarriedForward,
        status,
        isManualOverride: hasOverride,
      });

      carryForwardBalance = balanceCarriedForward;
    }

    return records;
  };

  const yearlyStatement = generateYearlyStatement();
  const totalExpected = yearlyStatement.reduce((sum, r) => sum + r.expectedRent, 0);
  const totalPaid = yearlyStatement.reduce((sum, r) => sum + r.totalPaid, 0);
  const totalOutstanding = yearlyStatement[yearlyStatement.length - 1]?.balanceCarriedForward || 0;

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
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="text-xl">Annual Statement - {currentYear}</DialogTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const filteredRecords = yearlyStatement.filter((record) => {
                const pos = monthOrder.indexOf(record.monthIndex);
                const currentPos = monthOrder.indexOf(currentMonth);
                return pos <= currentPos;
              });
              const rows = filteredRecords.map((record) => {
                const paymentCells = record.payments.length > 0
                  ? record.payments.map((p) => `
                    <div>${formatCurrency(p.amount)}${p.isRollover ? ' <span class="rollover">(Carried)</span>' : ''}</div>
                    <div class="mono">${p.mpesaRef}</div>
                    <div class="date">${p.isRollover ? '—' : format(new Date(p.date), 'd/M/yyyy')}</div>
                  `).join('')
                  : '<div class="empty">-</div><div class="empty">-</div><div class="empty">-</div>';
                const bfDisplay = record.balanceBroughtForward > 0
                  ? formatCurrency(record.balanceBroughtForward)
                  : record.balanceBroughtForward < 0
                  ? '+' + formatCurrency(Math.abs(record.balanceBroughtForward))
                  : record.isManualOverride ? formatCurrency(0) : '-';
                const cfDisplay = record.balanceCarriedForward > 0
                  ? formatCurrency(record.balanceCarriedForward)
                  : record.balanceCarriedForward < 0
                  ? '+' + formatCurrency(Math.abs(record.balanceCarriedForward))
                  : '-';
                const statusClass = record.status === 'paid' ? 'status-paid' : record.status === 'partial' ? 'status-partial' : 'status-unpaid';
                const statusText = record.status === 'paid' ? 'Paid' : record.status === 'partial' ? 'Partial' : 'Unpaid';
                return `
                  <tr>
                    <td class="month">${record.month}</td>
                    <td class="num">${bfDisplay}</td>
                    <td class="num">${formatCurrency(record.expectedRent)}</td>
                    <td class="payments">${paymentCells}</td>
                    <td class="num total">${record.totalPaid > 0 ? formatCurrency(record.totalPaid) : '-'}</td>
                    <td class="num">${cfDisplay}</td>
                    <td><span class="badge ${statusClass}">${statusText}</span></td>
                  </tr>
                `;
              }).join('');
              const win = window.open('', '_blank', 'width=900,height=700');
              if (!win) return;
              win.document.write(`
                <html>
                <head>
                  <title>Annual Statement - ${tenant.name} - ${currentYear}</title>
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
                    td.payments { font-size: 11px; }
                    td.payments div { margin-bottom: 2px; }
                    td.payments .rollover { color: #2563eb; font-size: 10px; }
                    td.payments .mono { font-family: monospace; font-size: 10px; color: #475569; }
                    td.payments .date { color: #64748b; font-size: 10px; }
                    td.payments .empty { color: #94a3b8; }
                    .badge { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 10px; font-weight: 600; }
                    .status-paid { background: #dcfce7; color: #166534; }
                    .status-partial { background: #fef9c3; color: #854d0e; }
                    .status-unpaid { background: #fee2e2; color: #991b1b; }
                    .totals-row { background: #f8fafc; font-weight: 700; }
                    .totals-row td { border-top: 2px solid #0f172a; }
                    .totals-label { text-align: right; padding-right: 8px; }
                    .footer { margin-top: 12px; font-size: 10px; color: #64748b; }
                    .footer strong { color: #0f172a; }
                  </style>
                </head>
                <body>
                  <h1>KODI PAP — Annual Statement</h1>
                  <h2>${currentYear}</h2>
                  <div class="meta">
                    <div class="meta-item"><p>Tenant</p><strong>${tenant.name}</strong></div>
                    <div class="meta-item"><p>Phone</p><strong>${tenant.phone}</strong></div>
                    <div class="meta-item"><p>House No</p><strong>${house.houseNo}</strong></div>
                    <div class="meta-item"><p>Monthly Rent</p><strong>${formatCurrency(expectedRent)}</strong></div>
                  </div>
                  <table>
                    <thead>
                      <tr>
                        <th>Month</th><th>B/F</th><th>Rent Due</th>
                        <th style="width:160px">Paid / Ref / Date</th>
                        <th>TMC</th><th>C/F</th><th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rows}
                      <tr class="totals-row">
                        <td colspan="2" class="totals-label">TOTALS</td>
                        <td class="num">${formatCurrency(totalExpected)}</td>
                        <td></td>
                        <td class="num total">${formatCurrency(totalPaid)}</td>
                        <td class="num">${totalOutstanding > 0 ? formatCurrency(totalOutstanding) : '-'}</td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                  <div class="footer">
                    <span><strong>B/F</strong> = Balance Brought Forward</span> &nbsp;|&nbsp;
                    <span><strong>TMC</strong> = Total Monthly Collection</span> &nbsp;|&nbsp;
                    <span><strong>C/F</strong> = Balance Carried Forward</span> &nbsp;|&nbsp;
                    <span>Printed ${format(new Date(), 'dd/MM/yyyy')}</span>
                  </div>
                </body>
                </html>
              `);
              win.document.close();
              win.focus();
              setTimeout(() => win.print(), 300);
            }}
          >
            <Printer className="h-4 w-4 mr-1.5" /> Print
          </Button>
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
                <TableHead className="text-right">TMC</TableHead>
                <TableHead className="text-right">C/F</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yearlyStatement
                .filter((record) => {
                  const pos = monthOrder.indexOf(record.monthIndex);
                  const currentPos = monthOrder.indexOf(currentMonth);
                  return pos <= currentPos;
                })
                .map((record) => (
                <TableRow key={record.monthIndex}>
                  <TableCell className="font-medium">{record.month}</TableCell>
                  <TableCell className="text-right">
                    {editingMonth === record.monthIndex ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(record.monthIndex);
                            if (e.key === 'Escape') setEditingMonth(null);
                          }}
                          className="h-7 w-24 text-right"
                          autoFocus
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => handleSaveEdit(record.monthIndex)}
                          title="Save"
                        >
                          <Check className="h-3.5 w-3.5 text-success" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setEditingMonth(null)}
                          title="Cancel"
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1 group">
                        {record.balanceBroughtForward > 0 ? (
                          <span
                            className={
                              record.isManualOverride
                                ? 'text-warning font-medium'
                                : 'text-destructive'
                            }
                          >
                            {formatCurrency(record.balanceBroughtForward)}
                          </span>
                        ) : record.balanceBroughtForward < 0 ? (
                          <span className="text-success font-medium" title="Credit from previous month">
                            +{formatCurrency(Math.abs(record.balanceBroughtForward))}
                          </span>
                        ) : (
                          <span>{record.isManualOverride ? formatCurrency(0) : '-'}</span>
                        )}
                        {record.isManualOverride ? (
                          <Badge
                            variant="outline"
                            className="h-5 px-1 text-[10px] border-success/40 text-success"
                            title="Locked — balance brought forward cannot be edited again"
                          >
                            Locked
                          </Badge>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-6 w-6 opacity-60 hover:opacity-100"
                            onClick={() =>
                              handleStartEdit(record.monthIndex, record.balanceBroughtForward)
                            }
                            title="Edit B/F (one-time — locks after saving)"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(record.expectedRent)}</TableCell>
                  <TableCell className="text-right">
                    {record.payments.length > 0 ? (
                      <div className="space-y-1">
                        {record.payments.map((p, idx) => (
                          <div key={idx} className="text-xs text-success font-medium flex items-center justify-end gap-1">
                            {formatCurrency(p.amount)}
                            {p.isRollover && (
                              <Badge
                                variant="outline"
                                className="h-4 px-1 text-[9px] border-primary/40 text-primary"
                                title={`Carried over from ${months[new Date(p.date).getMonth()]}`}
                              >
                                Carried
                              </Badge>
                            )}
                          </div>
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
                          <div key={idx} className="text-xs whitespace-nowrap">
                            {p.isRollover ? '—' : format(new Date(p.date), 'd/M/yyyy')}
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.totalPaid > 0 ? (
                      <span className="font-semibold text-success">{formatCurrency(record.totalPaid)}</span>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {record.balanceCarriedForward > 0 ? (
                      <span className="text-destructive font-medium">{formatCurrency(record.balanceCarriedForward)}</span>
                    ) : record.balanceCarriedForward < 0 ? (
                      <span className="text-success font-medium" title="Credit rolling to next month">
                        +{formatCurrency(Math.abs(record.balanceCarriedForward))}
                      </span>
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
        <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span><strong>B/F</strong> = Balance Brought Forward (auto-calculated; one-time manual override locks the value)</span>
          <span><strong>TMC</strong> = Total Monthly Collection</span>
          <span><strong>C/F</strong> = Balance Carried Forward</span>
        </div>
      </DialogContent>
    </Dialog>
  );
};
