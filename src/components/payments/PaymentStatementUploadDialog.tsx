import { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { format, parse, isValid } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Upload, FileSpreadsheet, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ParsedRow {
  payment_date: string;
  amount: number;
  mpesa_ref: string;
  sender_name: string | null;
  sender_phone: string | null;
  house_no: string | null;
  status: 'new' | 'duplicate' | 'invalid';
  reason?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landlordId: string | null;
  /** Optional: when omitted, uploader still works but won't auto-match houses/tenants */
  scopeLabel?: string;
}

const DATE_KEYS = ['date', 'payment_date', 'paymentdate', 'transaction date', 'trans date', 'completion time', 'completion_time'];
const AMOUNT_KEYS = ['amount', 'paid in', 'paid_in', 'credit', 'credit amount', 'received', 'transaction amount'];
const REF_KEYS = ['ref', 'reference', 'mpesa_ref', 'mpesa ref', 'transaction id', 'receipt no', 'receipt number', 'transaction code'];
const NAME_KEYS = ['name', 'sender', 'sender name', 'paid by', 'from', 'customer name', 'payer'];
const PHONE_KEYS = ['phone', 'sender phone', 'msisdn', 'mobile', 'phone number'];
const HOUSE_KEYS = ['house', 'house no', 'house_no', 'unit', 'unit no', 'account', 'account no', 'bill ref'];

const findKey = (row: Record<string, any>, candidates: string[]): string | null => {
  const normalized = Object.keys(row).reduce<Record<string, string>>((acc, k) => {
    acc[k.toLowerCase().trim().replace(/[._-]/g, ' ').replace(/\s+/g, ' ')] = k;
    return acc;
  }, {});
  for (const c of candidates) {
    const norm = c.toLowerCase().trim().replace(/[._-]/g, ' ').replace(/\s+/g, ' ');
    if (normalized[norm]) return normalized[norm];
    // partial match
    const partial = Object.keys(normalized).find((k) => k.includes(norm));
    if (partial) return normalized[partial];
  }
  return null;
};

const parseDate = (val: any): string | null => {
  if (val == null || val === '') return null;
  // Native JS Date (when cellDates: true is used)
  if (val instanceof Date && isValid(val)) return val.toISOString();
  // Excel serial date
  if (typeof val === 'number') {
    const d = XLSX.SSF.parse_date_code(val);
    if (d) {
      const dt = new Date(Date.UTC(d.y, d.m - 1, d.d, d.H || 0, d.M || 0, Math.floor(d.S || 0)));
      return dt.toISOString();
    }
  }
  const s = String(val).trim();
  // Try common formats — DD/MM first since this app is Kenya-based
  const formats = [
    'yyyy-MM-dd HH:mm:ss',
    'yyyy-MM-dd',
    'dd/MM/yyyy hh:mm:ss a',
    'dd/MM/yyyy hh:mm a',
    'dd/MM/yyyy HH:mm:ss',
    'dd/MM/yyyy HH:mm',
    'dd/MM/yyyy',
    'd/M/yyyy hh:mm a',
    'd/M/yyyy HH:mm',
    'd/M/yyyy',
    'MM/dd/yyyy',
    'dd-MM-yyyy',
    'yyyy/MM/dd',
  ];
  for (const f of formats) {
    const d = parse(s, f, new Date());
    if (isValid(d)) return d.toISOString();
  }
  const fallback = new Date(s);
  return isValid(fallback) ? fallback.toISOString() : null;
};

const parseAmount = (val: any): number | null => {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
};

export const PaymentStatementUploadDialog = ({ open, onOpenChange, landlordId, scopeLabel }: Props) => {
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const reset = () => {
    setRows([]);
    setFileName('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!landlordId) {
      toast.error('No landlord context. Please select a landlord first.');
      return;
    }

    setParsing(true);
    setFileName(file.name);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rawJson = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });
      // Filter out completely blank rows
      const json = rawJson.filter((r) =>
        Object.values(r).some((v) => v !== '' && v != null)
      );

      if (json.length === 0) {
        toast.error('No rows found in the spreadsheet');
        setParsing(false);
        return;
      }

      const sample = json[0];
      const dateKey = findKey(sample, DATE_KEYS);
      const amountKey = findKey(sample, AMOUNT_KEYS);
      const refKey = findKey(sample, REF_KEYS);
      const nameKey = findKey(sample, NAME_KEYS);
      const phoneKey = findKey(sample, PHONE_KEYS);
      const houseKey = findKey(sample, HOUSE_KEYS);

      if (!dateKey || !amountKey || !refKey) {
        toast.error('Could not detect required columns: Date, Amount, Reference');
        setParsing(false);
        return;
      }

      // Get existing refs to detect duplicates
      const { data: existing } = await supabase
        .from('payments')
        .select('mpesa_ref')
        .eq('landlord_id', landlordId);
      const existingRefs = new Set((existing || []).map((p) => p.mpesa_ref));

      // Get houses for matching
      const { data: houses } = await supabase
        .from('houses')
        .select('id, house_no')
        .eq('landlord_id', landlordId);
      const houseMap = new Map((houses || []).map((h) => [h.house_no.toLowerCase().trim(), h.id]));

      const seenInFile = new Set<string>();
      const parsed: ParsedRow[] = json.map((r) => {
        const date = parseDate(r[dateKey]);
        const amount = parseAmount(r[amountKey]);
        const ref = String(r[refKey] ?? '').trim();
        const name = nameKey ? String(r[nameKey] ?? '').trim() || null : null;
        const phone = phoneKey ? String(r[phoneKey] ?? '').trim() || null : null;
        const house = houseKey ? String(r[houseKey] ?? '').trim() || null : null;

        let status: ParsedRow['status'] = 'new';
        let reason: string | undefined;

        if (!date || !amount || amount <= 0 || !ref) {
          status = 'invalid';
          reason = !date ? 'Invalid date' : !amount || amount <= 0 ? 'Invalid amount' : 'Missing reference';
        } else if (existingRefs.has(ref) || seenInFile.has(ref)) {
          status = 'duplicate';
          reason = 'Reference already exists';
        } else {
          seenInFile.add(ref);
        }

        return {
          payment_date: date || '',
          amount: amount || 0,
          mpesa_ref: ref,
          sender_name: name,
          sender_phone: phone,
          house_no: house,
          status,
          reason,
        };
      });

      setRows(parsed);
      const newCount = parsed.filter((r) => r.status === 'new').length;
      toast.success(`Parsed ${json.length} rows • ${newCount} ready to import`);
    } catch (err: any) {
      toast.error(`Failed to parse file: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  const handleImport = async () => {
    if (!landlordId) return;
    const newRows = rows.filter((r) => r.status === 'new');
    if (newRows.length === 0) {
      toast.error('No new rows to import');
      return;
    }

    setImporting(true);
    try {
      // Re-fetch houses for matching
      const { data: houses } = await supabase
        .from('houses')
        .select('id, house_no')
        .eq('landlord_id', landlordId);
      const houseMap = new Map((houses || []).map((h) => [h.house_no.toLowerCase().trim(), h.id]));

      const { data: tenants } = await supabase
        .from('tenants')
        .select('id, name, house_id')
        .eq('landlord_id', landlordId);
      const tenantByHouse = new Map(
        (tenants || []).filter((t) => t.house_id).map((t) => [t.house_id, t.id])
      );

      // Build name-token index for fuzzy tenant→house matching
      const normName = (s: string) =>
        s.toLowerCase().replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
      const tenantsWithHouse = (tenants || []).filter((t) => t.house_id);
      const matchByName = (sender: string | null): { houseId: string | null; tenantId: string | null } => {
        if (!sender) return { houseId: null, tenantId: null };
        const senderTokens = new Set(normName(sender).split(' ').filter((w) => w.length >= 3));
        if (senderTokens.size === 0) return { houseId: null, tenantId: null };
        let best: { score: number; tenant: typeof tenantsWithHouse[number] | null } = { score: 0, tenant: null };
        for (const t of tenantsWithHouse) {
          const tTokens = new Set(normName(t.name).split(' ').filter((w) => w.length >= 3));
          let overlap = 0;
          tTokens.forEach((tok) => { if (senderTokens.has(tok)) overlap++; });
          if (overlap > best.score) best = { score: overlap, tenant: t };
        }
        if (best.score >= 2 || (best.score === 1 && best.tenant && normName(best.tenant.name).split(' ').length <= 2)) {
          return { houseId: best.tenant!.house_id as string, tenantId: best.tenant!.id };
        }
        return { houseId: null, tenantId: null };
      };

      const inserts = newRows.map((r) => {
        let houseId = r.house_no ? houseMap.get(r.house_no.toLowerCase().trim()) || null : null;
        let tenantId = houseId ? tenantByHouse.get(houseId) || null : null;
        if (!houseId) {
          const fuzzy = matchByName(r.sender_name);
          houseId = fuzzy.houseId;
          tenantId = fuzzy.tenantId;
        }
        return {
          landlord_id: landlordId,
          payment_date: r.payment_date,
          amount: r.amount,
          mpesa_ref: r.mpesa_ref,
          sender_name: r.sender_name,
          sender_phone: r.sender_phone,
          house_id: houseId,
          tenant_id: tenantId,
          payment_source: 'statement_upload',
        };
      });

      // Batch inserts to avoid timeouts / payload limits on large statements.
      // Continue on per-batch errors so a single bad row doesn't block the whole import.
      const BATCH_SIZE = 200;
      const totalBatches = Math.ceil(inserts.length / BATCH_SIZE);
      let insertedCount = 0;
      const successfulInserts: typeof inserts = [];
      const batchErrors: string[] = [];

      for (let b = 0; b < totalBatches; b++) {
        const batch = inserts.slice(b * BATCH_SIZE, (b + 1) * BATCH_SIZE);
        const { error: batchError } = await supabase.from('payments').insert(batch);
        if (batchError) {
          // Fallback: try row-by-row to salvage as many as possible
          console.error(`Batch ${b + 1}/${totalBatches} failed, retrying per row:`, batchError);
          for (const row of batch) {
            const { error: rowError } = await supabase.from('payments').insert(row);
            if (rowError) {
              batchErrors.push(`Ref ${row.mpesa_ref}: ${rowError.message}`);
            } else {
              insertedCount++;
              successfulInserts.push(row);
            }
          }
        } else {
          insertedCount += batch.length;
          successfulInserts.push(...batch);
        }
      }

      if (batchErrors.length > 0) {
        console.warn('Skipped rows during import:', batchErrors);
      }

      if (insertedCount === 0) {
        throw new Error(batchErrors[0] || 'No rows could be inserted');
      }

      // Build affected (house, month) pairs from the inserts that did match a house
      const matchedInserts = successfulInserts.filter((i) => i.house_id);

      // Recompute monthly balances for each affected (house, month) pair
      // so the Tenants page and tenant statements reflect the imported payments.
      const houseMonthPairs = new Map<string, { houseId: string; month: string }>();
      for (const ins of inserts) {
        if (!ins.house_id || !ins.payment_date) continue;
        const d = new Date(ins.payment_date);
        if (isNaN(d.getTime())) continue;
        const monthStr = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-01`;
        houseMonthPairs.set(`${ins.house_id}_${monthStr}`, { houseId: ins.house_id, month: monthStr });
      }

      // Fetch house rents once
      const houseIds = Array.from(new Set(Array.from(houseMonthPairs.values()).map((p) => p.houseId)));
      let rentByHouse = new Map<string, number>();
      if (houseIds.length > 0) {
        const { data: houseRows } = await supabase
          .from('houses')
          .select('id, expected_rent')
          .in('id', houseIds);
        rentByHouse = new Map((houseRows || []).map((h) => [h.id, Number(h.expected_rent)]));
      }

      let recomputed = 0;
      for (const { houseId, month } of houseMonthPairs.values()) {
        try {
          const expectedRent = rentByHouse.get(houseId) ?? 0;

          // Previous month carry-forward
          const prev = new Date(month);
          prev.setUTCMonth(prev.getUTCMonth() - 1);
          const prevMonthStr = `${prev.getUTCFullYear()}-${String(prev.getUTCMonth() + 1).padStart(2, '0')}-01`;
          const { data: prevBalance } = await supabase
            .from('balances')
            .select('balance')
            .eq('house_id', houseId)
            .eq('month', prevMonthStr)
            .maybeSingle();
          const carryForward = Number(prevBalance?.balance || 0);

          // Sum payments in the month for this house
          const monthStart = new Date(month);
          const monthEnd = new Date(month);
          monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);
          const { data: monthPayments } = await supabase
            .from('payments')
            .select('amount')
            .eq('house_id', houseId)
            .gte('payment_date', monthStart.toISOString())
            .lt('payment_date', monthEnd.toISOString());
          const paidAmount = (monthPayments || []).reduce((s, p) => s + Number(p.amount), 0);

          const balance = expectedRent + carryForward - paidAmount;

          await supabase
            .from('balances')
            .upsert(
              {
                landlord_id: landlordId,
                house_id: houseId,
                month,
                expected_rent: expectedRent,
                paid_amount: paidAmount,
                carry_forward: carryForward,
                balance,
              },
              { onConflict: 'house_id,month' }
            );
          recomputed++;
        } catch (e) {
          console.error('Balance recompute failed for', houseId, month, e);
        }
      }

      const matchedCount = matchedInserts.length;
      const unmatchedCount = inserts.length - matchedCount;
      toast.success(
        `Imported ${inserts.length} payments • Linked ${matchedCount} to tenants • Synced ${recomputed} balance${recomputed === 1 ? '' : 's'}${unmatchedCount > 0 ? ` • ${unmatchedCount} unmatched` : ''}`
      );
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['all-payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      handleClose(false);
    } catch (err: any) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setImporting(false);
    }
  };

  const newCount = rows.filter((r) => r.status === 'new').length;
  const dupCount = rows.filter((r) => r.status === 'duplicate').length;
  const invalidCount = rows.filter((r) => r.status === 'invalid').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Import Payment Statement
          </DialogTitle>
          <DialogDescription>
            Upload an Excel or CSV file with columns in this order: <span className="font-medium">Name, Amount, House Code, M-Pesa Ref, Date &amp; Time</span>.
            Name and House Code are optional but recommended for auto-matching.
            {scopeLabel && <span className="font-medium"> Scope: {scopeLabel}</span>}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          {rows.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                Select an .xlsx, .xls, or .csv file to upload
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFile}
                className="hidden"
                id="statement-file"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={parsing || !landlordId}
                className="gap-2"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Parsing...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Choose File
                  </>
                )}
              </Button>
              {!landlordId && (
                <p className="text-xs text-destructive mt-3">No landlord selected</p>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">{fileName}</span>
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {newCount} new
                </Badge>
                {dupCount > 0 && (
                  <Badge variant="secondary">{dupCount} duplicates</Badge>
                )}
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" /> {invalidCount} invalid
                  </Badge>
                )}
                <Button variant="ghost" size="sm" onClick={reset} className="ml-auto">
                  Clear
                </Button>
              </div>

              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>House Code</TableHead>
                      <TableHead>M-Pesa Ref</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.slice(0, 200).map((r, i) => (
                      <TableRow key={i} className={r.status === 'invalid' ? 'opacity-60' : ''}>
                        <TableCell>
                          {r.status === 'new' && (
                            <Badge variant="default" className="text-xs">New</Badge>
                          )}
                          {r.status === 'duplicate' && (
                            <Badge variant="secondary" className="text-xs">Duplicate</Badge>
                          )}
                          {r.status === 'invalid' && (
                            <Badge variant="destructive" className="text-xs" title={r.reason}>
                              Invalid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{r.sender_name || '—'}</TableCell>
                        <TableCell className="font-medium">
                          {r.amount ? `KES ${r.amount.toLocaleString()}` : '—'}
                        </TableCell>
                        <TableCell className="text-xs">{r.house_no || '—'}</TableCell>
                        <TableCell className="font-mono text-xs">{r.mpesa_ref || '—'}</TableCell>
                        <TableCell className="text-xs">
                          {r.payment_date ? format(new Date(r.payment_date), 'MMM d, yyyy HH:mm') : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {rows.length > 200 && (
                  <p className="text-xs text-muted-foreground text-center py-2">
                    Showing first 200 of {rows.length} rows
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Cancel
          </Button>
          {rows.length > 0 && (
            <Button onClick={handleImport} disabled={importing || newCount === 0} className="gap-2">
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>Import {newCount} Payments</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
