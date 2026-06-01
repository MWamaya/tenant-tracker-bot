import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffectiveLandlordId } from '@/hooks/useImpersonation';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    minimumFractionDigits: 0,
  }).format(amount);

export const MonthlyReconciliation = () => {
  const landlordId = useEffectiveLandlordId();
  const now = new Date();
  const monthLabel = format(now, 'MMMM yyyy');
  const monthStart = format(startOfMonth(now), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(now), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['monthly-reconciliation', landlordId, monthStart],
    enabled: !!landlordId,
    queryFn: async () => {
      const [{ data: houses }, { data: tenants }, { data: payments }] = await Promise.all([
        supabase.from('houses').select('id, house_no, expected_rent').eq('landlord_id', landlordId!),
        supabase.from('tenants').select('id, name, house_id').eq('landlord_id', landlordId!),
        supabase
          .from('payments')
          .select('id, amount, house_id, mpesa_ref, payment_date')
          .eq('landlord_id', landlordId!)
          .gte('payment_date', monthStart)
          .lte('payment_date', monthEnd),
      ]);

      const rows = (houses || [])
        .map((h) => {
          const hp = (payments || []).filter((p) => p.house_id === h.id);
          const rawPaid = hp.reduce((s, p) => s + Number(p.amount), 0);
          const applied = Math.min(rawPaid, Number(h.expected_rent));
          const rollover = Math.max(0, rawPaid - Number(h.expected_rent));
          const tenant = (tenants || []).find((t) => t.house_id === h.id);
          return {
            houseId: h.id,
            houseNo: h.house_no,
            tenantName: tenant?.name || 'Vacant',
            expectedRent: Number(h.expected_rent),
            rawPaid,
            applied,
            rollover,
            paymentCount: hp.length,
          };
        })
        .filter((r) => r.rawPaid > 0)
        .sort((a, b) => b.rollover - a.rollover || b.rawPaid - a.rawPaid);

      const totals = rows.reduce(
        (acc, r) => ({
          rawPaid: acc.rawPaid + r.rawPaid,
          applied: acc.applied + r.applied,
          rollover: acc.rollover + r.rollover,
        }),
        { rawPaid: 0, applied: 0, rollover: 0 },
      );

      return { rows, totals };
    },
  });

  return (
    <div className="stat-card animate-slide-up">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="text-lg font-semibold">{monthLabel} Reconciliation</h3>
          <p className="text-xs text-muted-foreground">
            Raw payments received vs amount applied to this month's rent. Excess is held as rollover credit and applied to the next month.
          </p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </div>
      ) : data.rows.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4">No payments received yet for {monthLabel}.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-3 rounded-lg bg-muted/50 text-center">
              <p className="text-xs text-muted-foreground">Raw Received</p>
              <p className="font-bold">{formatCurrency(data.totals.rawPaid)}</p>
            </div>
            <div className="p-3 rounded-lg bg-success/10 text-center">
              <p className="text-xs text-muted-foreground">Applied (Collected)</p>
              <p className="font-bold text-success">{formatCurrency(data.totals.applied)}</p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10 text-center">
              <p className="text-xs text-muted-foreground">Rollover Credit</p>
              <p className="font-bold text-primary">{formatCurrency(data.totals.rollover)}</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>House</TableHead>
                  <TableHead className="hidden sm:table-cell">Tenant</TableHead>
                  <TableHead className="text-right">Rent</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Applied</TableHead>
                  <TableHead className="text-right">Rollover</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.houseId}>
                    <TableCell className="font-medium">
                      {r.houseNo}
                      {r.paymentCount > 1 && (
                        <Badge variant="outline" className="ml-2 h-5 px-1 text-[10px]">
                          {r.paymentCount}×
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-sm">{r.tenantName}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(r.expectedRent)}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(r.rawPaid)}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-success">
                      {formatCurrency(r.applied)}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {r.rollover > 0 ? (
                        <span className="text-primary">+{formatCurrency(r.rollover)}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};
