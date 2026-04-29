import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { usePayments } from '@/hooks/usePayments';
import { useEffectiveLandlordId } from '@/hooks/useImpersonation';
import { PaymentStatementUploadDialog } from '@/components/payments/PaymentStatementUploadDialog';
import { PaymentTextPasteDialog } from '@/components/payments/PaymentTextPasteDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Download, CreditCard, Calendar, Loader2, Upload, RefreshCw, ClipboardPaste, Folder, FolderOpen, ChevronRight } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format } from 'date-fns';
import { syncPaymentsToTenants } from '@/lib/syncPayments';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Payments = () => {
  const { payments, isLoading } = usePayments();
  const landlordId = useEffectiveLandlordId();
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const handleSync = async () => {
    if (!landlordId) return;
    setSyncing(true);
    try {
      const res = await syncPaymentsToTenants(landlordId);
      toast.success(
        `Linked ${res.linked} payments • Synced ${res.recomputed} balance${res.recomputed === 1 ? '' : 's'}${res.unmatched > 0 ? ` • ${res.unmatched} still unmatched` : ''}`
      );
      queryClient.invalidateQueries({ queryKey: ['payments'] });
      queryClient.invalidateQueries({ queryKey: ['balances'] });
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      queryClient.invalidateQueries({ queryKey: ['houses'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    if (filteredPayments.length === 0) {
      toast.error('No payments to export');
      return;
    }
    try {
      const doc = new jsPDF();
      const title = 'KODI PAP — Payments Report';
      const subtitle =
        monthFilter === 'all'
          ? 'All Time'
          : format(new Date(monthFilter + '-01'), 'MMMM yyyy');

      doc.setFontSize(16);
      doc.text(title, 14, 16);
      doc.setFontSize(10);
      doc.text(subtitle, 14, 22);
      doc.text(`Generated: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 27);
      doc.text(
        `Total: ${formatCurrency(totalAmount)}  •  ${filteredPayments.length} payment(s)`,
        14,
        32
      );

      autoTable(doc, {
        startY: 38,
        head: [['Date', 'Name', 'House', 'M-Pesa Ref', 'Amount (KES)']],
        body: filteredPayments.map((p) => [
          format(new Date(p.payment_date), 'dd/MM/yy'),
          p.tenants?.name || p.sender_name || 'Unknown',
          p.houses?.house_no || 'Unassigned',
          p.mpesa_ref,
          Number(p.amount).toLocaleString(),
        ]),
        styles: { fontSize: 9 },
        headStyles: { fillColor: [16, 122, 87] },
      });

      const fname = `payments-${monthFilter === 'all' ? 'all' : monthFilter}-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
      doc.save(fname);
      toast.success('PDF exported');
    } catch (err: any) {
      toast.error(`Export failed: ${err.message}`);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const filteredPayments = payments
    .filter(payment => {
      const tenantName = payment.tenants?.name || payment.sender_name || '';
      const houseNo = payment.houses?.house_no || '';
      
      const matchesSearch = 
        tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        houseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.mpesa_ref.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (monthFilter === 'all') return matchesSearch;
      
      const paymentMonth = format(new Date(payment.payment_date), 'yyyy-MM');
      return matchesSearch && paymentMonth === monthFilter;
    })
    .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

  const totalAmount = filteredPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  // App goes live April 1, 2026 — never show months before this
  const APP_START = new Date(2026, 3, 1); // April 2026

  // Generate month options from April 2026 up to current month
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    let cursor = new Date(currentMonth);
    while (cursor >= APP_START) {
      months.push({
        value: format(cursor, 'yyyy-MM'),
        label: format(cursor, 'MMMM yyyy'),
      });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1);
    }
    return months;
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Track all rent payments received
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button onClick={() => setUploadOpen(true)} className="gap-2 flex-1 sm:flex-none">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Import Statement</span>
              <span className="sm:hidden">Import</span>
            </Button>
            <Button onClick={() => setPasteOpen(true)} variant="outline" className="gap-2 flex-1 sm:flex-none">
              <ClipboardPaste className="h-4 w-4" />
              <span className="hidden sm:inline">Paste Text</span>
              <span className="sm:hidden">Paste</span>
            </Button>
            <Button onClick={handleSync} disabled={syncing || !landlordId} variant="secondary" className="gap-2 flex-1 sm:flex-none">
              {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="hidden sm:inline">Sync to Tenants</span>
              <span className="sm:hidden">Sync</span>
            </Button>
            <Button onClick={handleExport} variant="outline" className="gap-2 flex-1 sm:flex-none">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export PDF</span>
            </Button>
          </div>
        </div>

        <PaymentStatementUploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          landlordId={landlordId}
        />

        <PaymentTextPasteDialog
          open={pasteOpen}
          onOpenChange={setPasteOpen}
          landlordId={landlordId}
        />

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant, house, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              {getMonthOptions().map(month => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Summary Card */}
        <div className="stat-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10">
              <CreditCard className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {filteredPayments.length} payments
              </p>
              <p className="text-xl md:text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {monthFilter === 'all' ? 'All Time' : format(new Date(monthFilter + '-01'), 'MMMM yyyy')}
          </Badge>
        </div>

        {/* Month Folders */}
        {(() => {
          const groups = new Map<string, typeof filteredPayments>();
          for (const p of filteredPayments) {
            const d = new Date(p.payment_date);
            const key = format(d, 'yyyy-MM');
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key)!.push(p);
          }
          const sortedKeys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a));
          const defaultOpen = sortedKeys[0] ? [sortedKeys[0]] : [];

          return (
            <Accordion type="multiple" defaultValue={defaultOpen} className="space-y-3">
              {sortedKeys.map((key) => {
                const monthPayments = groups.get(key)!;
                const monthTotal = monthPayments.reduce((s, p) => s + Number(p.amount), 0);
                return (
                  <AccordionItem key={key} value={key} className="stat-card border-0 p-0 overflow-hidden">
                    <AccordionTrigger className="px-4 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]_.folder-icon-closed]:hidden [&[data-state=closed]_.folder-icon-open]:hidden">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <Folder className="folder-icon-closed h-5 w-5" />
                          <FolderOpen className="folder-icon-open h-5 w-5" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-base">
                            {format(new Date(key + '-01'), 'MMMM yyyy')}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {monthPayments.length} payment{monthPayments.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        <div className="text-right mr-2">
                          <p className="font-bold text-success">{formatCurrency(monthTotal)}</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="p-0">
                      {/* Desktop table */}
                      <div className="hidden md:block">
                        <Table>
                          <TableHeader>
                            <TableRow className="table-header">
                              <TableHead>Name</TableHead>
                              <TableHead>Amount</TableHead>
                              <TableHead>House Code</TableHead>
                              <TableHead>M-Pesa Ref</TableHead>
                              <TableHead>Date &amp; Time</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {monthPayments.map((payment) => (
                              <TableRow key={payment.id} className="hover:bg-muted/30">
                                <TableCell className="font-medium">
                                  {payment.tenants?.name || payment.sender_name || 'Unknown'}
                                </TableCell>
                                <TableCell className="font-semibold text-success">
                                  {formatCurrency(Number(payment.amount))}
                                </TableCell>
                                <TableCell>{payment.houses?.house_no || 'Unassigned'}</TableCell>
                                <TableCell>
                                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                    {payment.mpesa_ref}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">
                                      {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {format(new Date(payment.payment_date), 'h:mm a')}
                                    </p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button variant="ghost" size="sm">View</Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>

                      {/* Mobile cards */}
                      <div className="grid grid-cols-1 gap-3 md:hidden p-3">
                        {monthPayments.map((payment) => (
                          <div key={payment.id} className="rounded-lg border p-3 bg-background">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-semibold">
                                  {payment.tenants?.name || payment.sender_name || 'Unknown'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {payment.houses?.house_no || 'Unassigned'}
                                </p>
                              </div>
                              <p className="font-bold text-success">{formatCurrency(Number(payment.amount))}</p>
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t text-sm">
                              <div className="text-muted-foreground">
                                {format(new Date(payment.payment_date), 'MMM d, h:mm a')}
                              </div>
                              <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                                {payment.mpesa_ref}
                              </code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          );
        })()}
        {filteredPayments.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No payments found</h3>
            <p className="text-muted-foreground">Payments will appear here once processed from email logs</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Payments;
