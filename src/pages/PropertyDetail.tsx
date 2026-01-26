import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useHouses } from '@/hooks/useHouses';
import { useTenants, TenantWithHouse } from '@/hooks/useTenants';
import { usePayments } from '@/hooks/usePayments';
import { useBalances } from '@/hooks/useBalances';
import { useProperties } from '@/hooks/useProperties';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Plus, 
  Home, 
  Users, 
  CreditCard, 
  Building2, 
  Loader2,
  Phone,
  MapPin,
  ArrowLeft,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { HouseFormDialog } from '@/components/houses/HouseFormDialog';
import { TenantFormDialog } from '@/components/tenants/TenantFormDialog';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';

const PropertyDetail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const propertyId = searchParams.get('property');
  
  const { properties, isLoading: propertiesLoading, updateProperty } = useProperties();
  const { houses, isLoading: housesLoading, addHouse } = useHouses(propertyId);
  const { tenants, isLoading: tenantsLoading, addTenant, updateTenant } = useTenants();
  const { payments, isLoading: paymentsLoading } = usePayments();
  const { balances } = useBalances();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('houses');
  const [addHouseDialogOpen, setAddHouseDialogOpen] = useState(false);
  const [addTenantDialogOpen, setAddTenantDialogOpen] = useState(false);
  const [editPropertyDialogOpen, setEditPropertyDialogOpen] = useState(false);

  const isLoading = propertiesLoading || housesLoading || tenantsLoading || paymentsLoading;

  const property = properties.find(p => p.id === propertyId);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Get houses for this property with balance info
  const propertyHouses = useMemo(() => {
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
        ...house,
        tenant,
        balance: balance ? {
          status: balanceStatus,
          paid_amount: Number(balance.paid_amount),
          balance: Number(balance.balance),
        } : undefined,
      };
    }).filter(house => 
      house.house_no.toLowerCase().includes(searchQuery.toLowerCase()) ||
      house.tenant?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [houses, tenants, balances, searchQuery]);

  // Get tenants for this property
  const propertyTenants = useMemo(() => {
    const propertyHouseIds = houses.map(h => h.id);
    return tenants.filter(t => 
      t.house_id && propertyHouseIds.includes(t.house_id) &&
      (t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       t.phone.includes(searchQuery))
    );
  }, [tenants, houses, searchQuery]);

  // Get payments for this property
  const propertyPayments = useMemo(() => {
    const propertyHouseIds = houses.map(h => h.id);
    return payments.filter(p => 
      p.house_id && propertyHouseIds.includes(p.house_id) &&
      (p.mpesa_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.tenants?.name?.toLowerCase().includes(searchQuery.toLowerCase()))
    ).sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());
  }, [payments, houses, searchQuery]);

  // Calculate stats
  const stats = useMemo(() => {
    const occupiedCount = propertyHouses.filter(h => h.status === 'occupied').length;
    const vacantCount = propertyHouses.filter(h => h.status === 'vacant').length;
    const totalExpected = propertyHouses.reduce((sum, h) => sum + Number(h.expected_rent), 0);
    const totalCollected = propertyHouses.reduce((sum, h) => sum + (h.balance?.paid_amount || 0), 0);
    const totalBalance = propertyHouses.reduce((sum, h) => sum + (h.balance?.balance || 0), 0);
    
    return {
      totalUnits: propertyHouses.length,
      occupiedCount,
      vacantCount,
      totalExpected,
      totalCollected,
      totalBalance,
    };
  }, [propertyHouses]);

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
      property_id: houseData.propertyId || propertyId || null,
      occupancy_date: houseData.occupancyDate || null,
    });

    if (houseData.isOccupied && houseData.tenantId && result) {
      await updateTenant.mutateAsync({
        id: houseData.tenantId,
        data: { house_id: result.id },
      });
    }
  };

  const handleAddTenant = async (data: { name: string; phone: string; secondaryPhone?: string; houseId: string }) => {
    await addTenant.mutateAsync({
      name: data.name,
      phone: data.phone,
      secondary_phone: data.secondaryPhone || null,
      house_id: data.houseId || null,
    });
  };

  const handleEditProperty = async (data: {
    name: string;
    address?: string;
    county?: string;
    town?: string;
    property_type?: string;
  }) => {
    if (property) {
      await updateProperty.mutateAsync({ id: property.id, data });
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

  if (!property) {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium">Property not found</h3>
          <p className="text-muted-foreground mb-4">The property you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/properties')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Properties
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <AppBreadcrumbs />

        {/* Property Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-xl bg-primary/10">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{property.name}</h1>
              {(property.town || property.county) && (
                <p className="text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {[property.town, property.county].filter(Boolean).join(', ')}
                </p>
              )}
              {property.address && (
                <p className="text-sm text-muted-foreground mt-1">{property.address}</p>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setEditPropertyDialogOpen(true)}
          >
            <Edit className="h-4 w-4" />
            Edit Property
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Home className="h-4 w-4" />
                <span className="text-xs">Total Units</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalUnits}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-success mb-1">
                <Users className="h-4 w-4" />
                <span className="text-xs">Occupied</span>
              </div>
              <p className="text-2xl font-bold text-success">{stats.occupiedCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-warning mb-1">
                <Home className="h-4 w-4" />
                <span className="text-xs">Vacant</span>
              </div>
              <p className="text-2xl font-bold text-warning">{stats.vacantCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Expected</span>
              </div>
              <p className="text-lg font-bold">{formatCurrency(stats.totalExpected)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-success mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Collected</span>
              </div>
              <p className="text-lg font-bold text-success">{formatCurrency(stats.totalCollected)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <CreditCard className="h-4 w-4" />
                <span className="text-xs">Outstanding</span>
              </div>
              <p className="text-lg font-bold text-destructive">{formatCurrency(stats.totalBalance)}</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <TabsList>
              <TabsTrigger value="houses" className="gap-2">
                <Home className="h-4 w-4" />
                Houses ({propertyHouses.length})
              </TabsTrigger>
              <TabsTrigger value="tenants" className="gap-2">
                <Users className="h-4 w-4" />
                Tenants ({propertyTenants.length})
              </TabsTrigger>
              <TabsTrigger value="payments" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Payments ({propertyPayments.length})
              </TabsTrigger>
            </TabsList>
            
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              {activeTab === 'houses' && (
                <Button size="sm" onClick={() => setAddHouseDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add House
                </Button>
              )}
              {activeTab === 'tenants' && (
                <Button size="sm" onClick={() => setAddTenantDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Tenant
                </Button>
              )}
            </div>
          </div>

          {/* Houses Tab */}
          <TabsContent value="houses" className="mt-0">
            <div className="stat-card p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>House No.</TableHead>
                    <TableHead>Expected Rent</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyHouses.map((house) => (
                    <TableRow key={house.id}>
                      <TableCell className="font-medium">{house.house_no}</TableCell>
                      <TableCell>{formatCurrency(Number(house.expected_rent))}</TableCell>
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
                      <TableCell className="text-success">
                        {house.balance ? formatCurrency(house.balance.paid_amount) : '-'}
                      </TableCell>
                      <TableCell className={house.balance?.balance ? 'text-destructive' : ''}>
                        {house.balance ? formatCurrency(house.balance.balance) : '-'}
                      </TableCell>
                      <TableCell>
                        {house.balance && <StatusBadge status={house.balance.status} />}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {propertyHouses.length === 0 && (
                <div className="text-center py-8">
                  <Home className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No houses found</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tenants Tab */}
          <TabsContent value="tenants" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {propertyTenants.map((tenant) => {
                const house = houses.find(h => h.id === tenant.house_id);
                return (
                  <Card key={tenant.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{tenant.name}</h4>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Phone className="h-3 w-3" />
                            {tenant.phone}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                            <Home className="h-3 w-3" />
                            {house?.house_no || 'Not assigned'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {propertyTenants.length === 0 && (
                <div className="col-span-full text-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No tenants found</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-0">
            <div className="stat-card p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="table-header">
                    <TableHead>Date</TableHead>
                    <TableHead>Tenant</TableHead>
                    <TableHead>House</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>M-Pesa Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {propertyPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {format(new Date(payment.payment_date), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {payment.tenants?.name || payment.sender_name || 'Unknown'}
                      </TableCell>
                      <TableCell>{payment.houses?.house_no || '-'}</TableCell>
                      <TableCell className="text-success font-semibold">
                        {formatCurrency(Number(payment.amount))}
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {payment.mpesa_ref}
                        </code>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {propertyPayments.length === 0 && (
                <div className="text-center py-8">
                  <CreditCard className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-muted-foreground">No payments found</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add House Dialog */}
      <HouseFormDialog
        open={addHouseDialogOpen}
        onOpenChange={setAddHouseDialogOpen}
        tenants={tenants.filter(t => !t.house_id).map(t => ({
          id: t.id,
          name: t.name,
          phone: t.phone,
          houseId: t.house_id || '',
        }))}
        properties={properties}
        defaultPropertyId={propertyId}
        onSave={handleAddHouse}
      />

      {/* Add Tenant Dialog */}
      <TenantFormDialog
        open={addTenantDialogOpen}
        onOpenChange={setAddTenantDialogOpen}
        tenant={null}
        houses={houses.filter(h => h.status === 'vacant').map(h => ({
          id: h.id,
          houseNo: h.house_no,
          expectedRent: Number(h.expected_rent),
        }))}
        assignedHouseIds={tenants.filter(t => t.house_id).map(t => t.house_id as string)}
        onSave={handleAddTenant}
      />

      {/* Edit Property Dialog */}
      <PropertyFormDialog
        open={editPropertyDialogOpen}
        onOpenChange={setEditPropertyDialogOpen}
        onSave={handleEditProperty}
        editProperty={property}
      />
    </MainLayout>
  );
};

export default PropertyDetail;
