import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { houses, balances, tenants } from '@/lib/mockData';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Search, Plus, Home } from 'lucide-react';

const Houses = () => {
  const [searchQuery, setSearchQuery] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getHouseData = () => {
    return houses.map(house => {
      const balance = balances.find(b => b.houseId === house.id);
      const tenant = tenants.find(t => t.houseId === house.id);
      return {
        ...house,
        tenant,
        balance,
      };
    }).filter(house => 
      house.houseNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      house.tenant?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const houseData = getHouseData();

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Houses</h1>
            <p className="text-muted-foreground mt-1">
              Manage all rental properties
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add House
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search houses or tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table */}
        <div className="stat-card p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>House No.</TableHead>
                <TableHead>Expected Rent</TableHead>
                <TableHead>Current Tenant</TableHead>
                <TableHead>Paid Amount</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {houseData.map((house) => (
                <TableRow key={house.id} className="hover:bg-muted/30">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Home className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{house.houseNo}</span>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(house.expectedRent)}</TableCell>
                  <TableCell>
                    {house.tenant ? (
                      <div>
                        <p className="font-medium">{house.tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{house.tenant.phone}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Vacant</span>
                    )}
                  </TableCell>
                  <TableCell className="text-success font-medium">
                    {house.balance ? formatCurrency(house.balance.paidAmount) : '-'}
                  </TableCell>
                  <TableCell className={house.balance?.balance ? 'text-destructive font-medium' : ''}>
                    {house.balance ? formatCurrency(house.balance.balance) : '-'}
                  </TableCell>
                  <TableCell>
                    {house.balance && <StatusBadge status={house.balance.status} />}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </MainLayout>
  );
};

export default Houses;
