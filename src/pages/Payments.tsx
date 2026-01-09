import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { usePayments } from '@/hooks/usePayments';
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
import { Search, Download, CreditCard, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

const Payments = () => {
  const { payments, isLoading } = usePayments();
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');

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

  // Generate month options
  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(date, 'yyyy-MM'),
        label: format(date, 'MMMM yyyy'),
      });
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
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Track all rent payments received
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
          </div>
        </div>

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

        {/* Table - Desktop View */}
        <div className="stat-card p-0 overflow-hidden hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Date & Time</TableHead>
                <TableHead>Tenant</TableHead>
                <TableHead>House</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>M-Pesa Ref</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id} className="hover:bg-muted/30">
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
                  <TableCell className="font-medium">
                    {payment.tenants?.name || payment.sender_name || 'Unknown'}
                  </TableCell>
                  <TableCell>{payment.houses?.house_no || 'Unassigned'}</TableCell>
                  <TableCell className="font-semibold text-success">
                    {formatCurrency(Number(payment.amount))}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {payment.mpesa_ref}
                    </code>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {filteredPayments.map((payment) => (
            <div key={payment.id} className="stat-card">
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
                  {format(new Date(payment.payment_date), 'MMM d, yyyy h:mm a')}
                </div>
                <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                  {payment.mpesa_ref}
                </code>
              </div>
            </div>
          ))}
        </div>

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
