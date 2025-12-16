import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { houses, balances, tenants, payments } from '@/lib/mockData';
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
import { HouseDetailDialog } from '@/components/houses/HouseDetailDialog';

interface HouseData {
  id: string;
  houseNo: string;
  expectedRent: number;
  tenant?: typeof tenants[0];
  balance?: typeof balances[0];
}

const Houses = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<HouseData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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

  const handleViewDetails = (house: HouseData) => {
    setSelectedHouse(house);
    setDialogOpen(true);
  };

  const getHousePayments = (houseId: string) => {
    return payments.filter(p => 
      p.houseId === houseId && 
      p.date.startsWith('2025-01')
    );
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Houses</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage all rental properties
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add House
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search houses or tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Table - Desktop View */}
        <div className="stat-card p-0 overflow-hidden hidden md:block">
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
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleViewDetails(house)}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {houseData.map((house) => (
            <div key={house.id} className="stat-card" onClick={() => handleViewDetails(house)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold">{house.houseNo}</span>
                    <p className="text-sm text-muted-foreground">
                      {house.tenant?.name || 'Vacant'}
                    </p>
                  </div>
                </div>
                {house.balance && <StatusBadge status={house.balance.status} />}
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="font-medium text-sm">{formatCurrency(house.expectedRent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-medium text-sm text-success">
                    {house.balance ? formatCurrency(house.balance.paidAmount) : '-'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className={`font-medium text-sm ${house.balance?.balance ? 'text-destructive' : ''}`}>
                    {house.balance ? formatCurrency(house.balance.balance) : '-'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* House Detail Dialog */}
      <HouseDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        house={selectedHouse}
        tenant={selectedHouse ? tenants.find(t => t.houseId === selectedHouse.id) : undefined}
        balance={selectedHouse ? balances.find(b => b.houseId === selectedHouse.id) : undefined}
        payments={selectedHouse ? getHousePayments(selectedHouse.id) : []}
      />
    </MainLayout>
  );
};

export default Houses;
