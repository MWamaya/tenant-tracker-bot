import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ClipboardPaste, Loader2, AlertCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { parseBankText, ParsedTextRow } from '@/lib/parseBankText';
import { importPaymentRows } from '@/lib/importPayments';

type PreviewRow = ParsedTextRow & {
  status: 'new' | 'duplicate';
  reason?: string;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  landlordId: string | null;
}

const SAMPLE = `SG12ABCD34 Confirmed. Ksh1,500.00 received from JOHN DOE 0712345678 on 4/4/24 at 9:15 AM for account A1. New M-PESA balance is Ksh...`;

export const PaymentTextPasteDialog = ({ open, onOpenChange, landlordId }: Props) => {
  const [text, setText] = useState('');
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const queryClient = useQueryClient();

  const reset = () => {
    setText('');
    setRows([]);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleParse = async () => {
    if (!landlordId) {
      toast.error('No landlord context.');
      return;
    }
    if (!text.trim()) {
      toast.error('Paste some text first.');
      return;
    }

    setParsing(true);
    try {
      const parsed = parseBankText(text);
      if (parsed.length === 0) {
        toast.error('Could not detect any transactions. Check the format and try again.');
        setRows([]);
        return;
      }

      // Detect duplicates against existing payments
      const refs = parsed.map((r) => r.mpesa_ref);
      const { data: existing } = await supabase
        .from('payments')
        .select('mpesa_ref')
        .eq('landlord_id', landlordId)
        .in('mpesa_ref', refs);
      const existingRefs = new Set((existing || []).map((p) => p.mpesa_ref));

      const seen = new Set<string>();
      const previews: PreviewRow[] = parsed.map((r) => {
        let status: PreviewRow['status'] = 'new';
        let reason: string | undefined;
        if (existingRefs.has(r.mpesa_ref) || seen.has(r.mpesa_ref)) {
          status = 'duplicate';
          reason = 'Reference already exists';
        } else {
          seen.add(r.mpesa_ref);
        }
        return { ...r, status, reason };
      });

      setRows(previews);
      const newCount = previews.filter((r) => r.status === 'new').length;
      toast.success(`Detected ${parsed.length} transaction${parsed.length === 1 ? '' : 's'} • ${newCount} ready to import`);
    } catch (err: any) {
      toast.error(`Parse failed: ${err.message}`);
    } finally {
      setParsing(false);
    }
  };

  const updateRow = (index: number, patch: Partial<PreviewRow>) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (!landlordId) return;
    const newRows = rows.filter((r) => r.status === 'new');
    if (newRows.length === 0) {
      toast.error('No new rows to import.');
      return;
    }

    setImporting(true);
    try {
      const result = await importPaymentRows(
        landlordId,
        newRows.map((r) => ({
          payment_date: r.payment_date,
          amount: r.amount,
          mpesa_ref: r.mpesa_ref,
          sender_name: r.sender_name,
          sender_phone: r.sender_phone,
          house_no: r.house_no,
        })),
        'manual_paste'
      );

      toast.success(
        `Imported ${result.inserted} payment${result.inserted === 1 ? '' : 's'} • Linked ${result.matched} to tenants • Synced ${result.recomputed} balance${result.recomputed === 1 ? '' : 's'}${result.unmatched > 0 ? ` • ${result.unmatched} unmatched` : ''}`
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

  const counts = useMemo(() => {
    return {
      total: rows.length,
      new: rows.filter((r) => r.status === 'new').length,
      duplicate: rows.filter((r) => r.status === 'duplicate').length,
    };
  }, [rows]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Paste Bank / M-Pesa Text
          </DialogTitle>
          <DialogDescription>
            Paste raw payment SMS or bank notification text below. The system will detect
            each transaction, let you fix any missing fields, then save them to Payments and
            sync to the Tenants page. Instalments are supported — each transaction with a
            different M-Pesa reference is saved as a separate payment and all of them are
            counted toward that month's total.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-4">
          <div className="space-y-2">
            <Textarea
              placeholder={`Paste one or more payment notifications here. Example:\n\n${SAMPLE}`}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="min-h-[140px] font-mono text-xs"
              disabled={parsing || importing}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleParse}
                disabled={parsing || importing || !landlordId || !text.trim()}
                className="gap-2"
              >
                {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardPaste className="h-4 w-4" />}
                Detect Transactions
              </Button>
              {rows.length > 0 && (
                <Button variant="ghost" onClick={() => setRows([])} disabled={importing}>
                  Clear preview
                </Button>
              )}
            </div>
          </div>

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {counts.new} new
                </Badge>
                {counts.duplicate > 0 && (
                  <Badge variant="secondary">{counts.duplicate} duplicates</Badge>
                )}
                <span className="text-muted-foreground ml-2">
                  Edit any field below before importing.
                </span>
              </div>

              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-20">Status</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-28">Amount</TableHead>
                      <TableHead className="w-28">House</TableHead>
                      <TableHead className="w-36">M-Pesa Ref</TableHead>
                      <TableHead className="w-40">Date &amp; Time</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          {r.status === 'new' ? (
                            <Badge variant="default" className="text-xs">New</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs" title={r.reason}>
                              Duplicate
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.sender_name || ''}
                            onChange={(e) => updateRow(i, { sender_name: e.target.value || null })}
                            className="h-8 text-xs"
                            placeholder="Sender name"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={r.amount}
                            onChange={(e) => updateRow(i, { amount: parseFloat(e.target.value) || 0 })}
                            className="h-8 text-xs"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.house_no || ''}
                            onChange={(e) => updateRow(i, { house_no: e.target.value || null })}
                            className="h-8 text-xs"
                            placeholder="A1"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={r.mpesa_ref}
                            onChange={(e) => updateRow(i, { mpesa_ref: e.target.value.toUpperCase() })}
                            className="h-8 text-xs font-mono"
                          />
                        </TableCell>
                        <TableCell className="text-xs">
                          {r.payment_date ? format(new Date(r.payment_date), 'MMM d, yyyy HH:mm') : '—'}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => removeRow(i)}
                            title="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex items-start gap-2 text-xs text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Set the <span className="font-medium">House</span> code to auto-link a payment to a tenant.
                  Otherwise the system will try to fuzzy-match using the sender name.
                </span>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={importing}>
            Cancel
          </Button>
          {rows.length > 0 && (
            <Button onClick={handleImport} disabled={importing || counts.new === 0} className="gap-2">
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>Import {counts.new} Payment{counts.new === 1 ? '' : 's'}</>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
