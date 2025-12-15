import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { tenants as initialTenants, houses, balances, Tenant } from '@/lib/mockData';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, User, Phone, Home } from 'lucide-react';
import { TenantFormDialog } from '@/components/tenants/TenantFormDialog';
import { toast } from 'sonner';

const Tenants = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTenantData = () => {
    return tenants.map(tenant => {
      const house = houses.find(h => h.id === tenant.houseId);
      const balance = balances.find(b => b.houseId === tenant.houseId);
      return {
        ...tenant,
        house,
        balance,
      };
    }).filter(tenant => 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone.includes(searchQuery) ||
      tenant.house?.houseNo.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const tenantData = getTenantData();
  const assignedHouseIds = tenants.map(t => t.houseId);

  const handleAddTenant = () => {
    setEditingTenant(null);
    setDialogOpen(true);
  };

  const handleEditTenant = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setDialogOpen(true);
  };

  const handleSaveTenant = (data: { name: string; phone: string; houseId: string }) => {
    if (editingTenant) {
      // Edit existing tenant
      setTenants(prev =>
        prev.map(t =>
          t.id === editingTenant.id
            ? { ...t, name: data.name, phone: data.phone, houseId: data.houseId }
            : t
        )
      );
      toast.success('Tenant updated successfully');
    } else {
      // Add new tenant
      const newTenant: Tenant = {
        id: String(Date.now()),
        name: data.name,
        phone: data.phone,
        houseId: data.houseId,
      };
      setTenants(prev => [...prev, newTenant]);
      toast.success('Tenant added successfully');
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground mt-1">
              Manage tenant information and payments
            </p>
          </div>
          <Button className="gap-2" onClick={handleAddTenant}>
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Tenant Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenantData.map((tenant) => (
            <div key={tenant.id} className="stat-card">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold truncate">{tenant.name}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Phone className="h-3 w-3" />
                    <span>{tenant.phone}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Home className="h-3 w-3" />
                    <span>{tenant.house?.houseNo}</span>
                  </div>
                </div>
                {tenant.balance && <StatusBadge status={tenant.balance.status} />}
              </div>
              
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Expected Rent</p>
                  <p className="font-semibold">{formatCurrency(tenant.house?.expectedRent || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className={`font-semibold ${tenant.balance?.balance ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(tenant.balance?.balance || 0)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Statement
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEditTenant(tenant)}>
                  Edit
                </Button>
              </div>
            </div>
          ))}
        </div>

        {tenantData.length === 0 && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No tenants found</h3>
            <p className="text-muted-foreground">Try adjusting your search query</p>
          </div>
        )}
      </div>

      {/* Tenant Form Dialog */}
      <TenantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenant={editingTenant}
        houses={houses}
        assignedHouseIds={assignedHouseIds}
        onSave={handleSaveTenant}
      />
    </MainLayout>
  );
};

export default Tenants;
