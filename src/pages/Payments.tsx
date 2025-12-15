import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { payments } from '@/lib/mockData';
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
import { Search, Plus, Download, CreditCard, Calendar } from 'lucide-react';
import { format } from 'date-fns';

const Payments = () => {
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
      const matchesSearch = 
        payment.tenantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.houseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payment.mpesaRef.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (monthFilter === 'all') return matchesSearch;
      
      const paymentMonth = format(new Date(payment.date), 'yyyy-MM');
      return matchesSearch && paymentMonth === monthFilter;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
            <p className="text-muted-foreground mt-1">
              Track all rent payments received
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Payment
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by tenant, house, or reference..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-48">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="2025-01">January 2025</SelectItem>
              <SelectItem value="2024-12">December 2024</SelectItem>
              <SelectItem value="2024-11">November 2024</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Card */}
        <div className="stat-card flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10">
              <CreditCard className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {filteredPayments.length} payments
              </p>
              <p className="text-2xl font-bold">{formatCurrency(totalAmount)}</p>
            </div>
          </div>
          <Badge variant="secondary" className="text-sm">
            {monthFilter === 'all' ? 'All Time' : format(new Date(monthFilter + '-01'), 'MMMM yyyy')}
          </Badge>
        </div>

        {/* Table */}
        <div className="stat-card p-0 overflow-hidden">
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
                        {format(new Date(payment.date), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(payment.date), 'h:mm a')}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{payment.tenantName}</TableCell>
                  <TableCell>{payment.houseNo}</TableCell>
                  <TableCell className="font-semibold text-success">
                    {formatCurrency(payment.amount)}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {payment.mpesaRef}
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

        {filteredPayments.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No payments found</h3>
            <p className="text-muted-foreground">Try adjusting your search or filter</p>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Payments;
