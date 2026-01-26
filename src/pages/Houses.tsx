import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useHouses, HouseWithProperty } from '@/hooks/useHouses';
import { useTenants } from '@/hooks/useTenants';
import { useBalances } from '@/hooks/useBalances';
import { usePayments } from '@/hooks/usePayments';
import { useProperties } from '@/hooks/useProperties';
import { StatusBadge } from '@/components/ui/StatusBadge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, Home, Trash2, Loader2, Building2, X } from 'lucide-react';
import { HouseDetailDialog } from '@/components/houses/HouseDetailDialog';
import { HouseFormDialog } from '@/components/houses/HouseFormDialog';

interface HouseData {
  id: string;
  house_no: string;
  expected_rent: number;
  status: 'vacant' | 'occupied';
  property_id: string | null;
  property_name: string | null;
  tenant?: { id: string; name: string; phone: string; house_id: string | null };
  balance?: {
    status: 'paid' | 'partial' | 'unpaid';
    paid_amount: number;
    balance: number;
  };
}

const Houses = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const propertyFilter = searchParams.get('property');
  
  const { houses, isLoading: housesLoading, addHouse, deleteHouse } = useHouses(propertyFilter);
  const { tenants, isLoading: tenantsLoading, updateTenant } = useTenants();
  const { balances } = useBalances();
  const { payments } = usePayments();
  const { properties, isLoading: propertiesLoading } = useProperties();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHouse, setSelectedHouse] = useState<HouseData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [houseToDelete, setHouseToDelete] = useState<HouseData | null>(null);

  const isLoading = housesLoading || tenantsLoading || propertiesLoading;

  const selectedProperty = properties.find(p => p.id === propertyFilter);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getHouseData = (): HouseData[] => {
    return houses.map(house => {
      const tenant = tenants.find(t => t.house_id === house.id);
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const balance = balances.find(b => b.house_id === house.id && b.month === currentMonth);
      
      let balanceStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (balance) {
        if (balance.balance <= 0) balanceStatus = 'paid';
        else if (balance.paid_amount > 0) balanceStatus = 'partial';
      }

      return {
        id: house.id,
        house_no: house.house_no,
        expected_rent: Number(house.expected_rent),
        status: house.status as 'vacant' | 'occupied',
        property_id: house.property_id,
        property_name: house.properties?.name || null,
        tenant: tenant ? {
          id: tenant.id,
          name: tenant.name,
          phone: tenant.phone,
          house_id: tenant.house_id,
        } : undefined,
        balance: balance ? {
          status: balanceStatus,
          paid_amount: Number(balance.paid_amount),
          balance: Number(balance.balance),
        } : undefined,
      };
    }).filter(house => 
      house.house_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      house.tenant?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      house.property_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const houseData = getHouseData();

  const handleViewDetails = (house: HouseData) => {
    setSelectedHouse(house);
    setDialogOpen(true);
  };

  const getHousePayments = (houseId: string) => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    return payments.filter(p => 
      p.house_id === houseId && 
      p.payment_date.startsWith(currentMonth)
    );
  };

  const handleAddHouse = async (houseData: {
    houseNo: string;
    expectedRent: number;
    isOccupied: boolean;
    propertyId?: string;
    tenantId?: string;
    occupancyDate?: string;
  }) => {
    const result = await addHouse.mutateAsync({
      house_no: houseData.houseNo,
      expected_rent: houseData.expectedRent,
      status: houseData.isOccupied ? 'occupied' : 'vacant',
      property_id: houseData.propertyId || null,
      occupancy_date: houseData.occupancyDate || null,
    });

    // If occupied, update tenant assignment
    if (houseData.isOccupied && houseData.tenantId && result) {
      await updateTenant.mutateAsync({
        id: houseData.tenantId,
        data: { house_id: result.id },
      });
    }
  };

  const handleDeleteClick = (house: HouseData, e: React.MouseEvent) => {
    e.stopPropagation();
    setHouseToDelete(house);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (houseToDelete) {
      await deleteHouse.mutateAsync(houseToDelete.id);
      setHouseToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleClearPropertyFilter = () => {
    setSearchParams({});
  };

  const handlePropertyFilterChange = (value: string) => {
    if (value === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ property: value });
    }
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Houses</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage all rental units
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add House
          </Button>
        </div>

        {/* Property Filter Badge */}
        {selectedProperty && (
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-2 py-1.5 px-3">
              <Building2 className="h-3 w-3" />
              Showing houses in: {selectedProperty.name}
              <button
                onClick={handleClearPropertyFilter}
                className="ml-1 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          </div>
        )}

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search houses or tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select 
            value={propertyFilter || 'all'} 
            onValueChange={handlePropertyFilterChange}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table - Desktop View */}
        <div className="stat-card p-0 overflow-hidden hidden md:block">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>House No.</TableHead>
                <TableHead>Property</TableHead>
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
                      <span className="font-medium">{house.house_no}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {house.property_name ? (
                      <Badge variant="outline" className="gap-1">
                        <Building2 className="h-3 w-3" />
                        {house.property_name}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>{formatCurrency(house.expected_rent)}</TableCell>
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
                    {house.balance ? formatCurrency(house.balance.paid_amount) : '-'}
                  </TableCell>
                  <TableCell className={house.balance?.balance ? 'text-destructive font-medium' : ''}>
                    {house.balance ? formatCurrency(house.balance.balance) : '-'}
                  </TableCell>
                  <TableCell>
                    {house.balance && <StatusBadge status={house.balance.status} />}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetails(house)}
                      >
                        View Details
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => handleDeleteClick(house, e)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Mobile Card View */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {houseData.map((house) => (
            <div key={house.id} className="stat-card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3" onClick={() => handleViewDetails(house)}>
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Home className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="font-semibold">{house.house_no}</span>
                    <p className="text-sm text-muted-foreground">
                      {house.tenant?.name || 'Vacant'}
                    </p>
                    {house.property_name && (
                      <Badge variant="outline" className="mt-1 gap-1 text-xs">
                        <Building2 className="h-2 w-2" />
                        {house.property_name}
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {house.balance && <StatusBadge status={house.balance.status} />}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 p-2"
                    onClick={(e) => handleDeleteClick(house, e)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t" onClick={() => handleViewDetails(house)}>
                <div>
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="font-medium text-sm">{formatCurrency(house.expected_rent)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="font-medium text-sm text-success">
                    {house.balance ? formatCurrency(house.balance.paid_amount) : '-'}
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

        {houseData.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Home className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No houses found</h3>
            <p className="text-muted-foreground">
              {propertyFilter 
                ? 'No houses in this property. Add your first house.' 
                : 'Add your first house to get started'}
            </p>
          </div>
        )}
      </div>

      {/* House Detail Dialog */}
      <HouseDetailDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        house={selectedHouse ? {
          id: selectedHouse.id,
          houseNo: selectedHouse.house_no,
          expectedRent: selectedHouse.expected_rent,
        } : null}
        tenant={selectedHouse?.tenant ? {
          id: selectedHouse.tenant.id,
          name: selectedHouse.tenant.name,
          phone: selectedHouse.tenant.phone,
          houseId: selectedHouse.id,
        } : undefined}
        balance={selectedHouse?.balance ? {
          houseId: selectedHouse.id,
          houseNo: selectedHouse.house_no,
          month: new Date().toISOString().slice(0, 7),
          expectedRent: selectedHouse.expected_rent,
          paidAmount: selectedHouse.balance.paid_amount,
          balance: selectedHouse.balance.balance,
          status: selectedHouse.balance.status,
        } : undefined}
        payments={selectedHouse ? getHousePayments(selectedHouse.id).map(p => ({
          id: p.id,
          amount: Number(p.amount),
          mpesaRef: p.mpesa_ref,
          date: p.payment_date,
          tenantName: p.tenants?.name || '',
          houseNo: p.houses?.house_no || '',
          houseId: p.house_id || '',
          tenantId: p.tenant_id || '',
        })) : []}
      />

      {/* Add House Dialog */}
      <HouseFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        tenants={tenants.filter(t => !t.house_id).map(t => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          houseId: t.house_id || '',
        }))}
        properties={properties}
        defaultPropertyId={propertyFilter}
        onSave={handleAddHouse}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete House {houseToDelete?.house_no}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this house and remove any assigned tenant. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default Houses;
