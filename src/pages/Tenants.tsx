import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useHouses } from '@/hooks/useHouses';
import { useTenants, TenantWithHouse } from '@/hooks/useTenants';
import { useBalances } from '@/hooks/useBalances';
import { usePayments } from '@/hooks/usePayments';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, User, Phone, Home, Trash2, FileText, Loader2 } from 'lucide-react';
import { TenantFormDialog } from '@/components/tenants/TenantFormDialog';
import { TenantStatementDialog } from '@/components/tenants/TenantStatementDialog';
import { toast } from 'sonner';
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

const Tenants = () => {
  const { houses, isLoading: housesLoading } = useHouses();
  const { tenants, isLoading: tenantsLoading, addTenant, updateTenant, deleteTenant } = useTenants();
  const { balances } = useBalances();
  const { payments } = usePayments();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithHouse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantWithHouse | null>(null);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [selectedTenantForStatement, setSelectedTenantForStatement] = useState<TenantWithHouse | null>(null);

  const isLoading = housesLoading || tenantsLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTenantData = () => {
    return tenants.map(tenant => {
      const currentMonth = new Date().toISOString().slice(0, 7) + '-01';
      const balance = balances.find(b => b.house_id === tenant.house_id && b.month === currentMonth);
      
      let balanceStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (balance) {
        if (balance.balance <= 0) balanceStatus = 'paid';
        else if (balance.paid_amount > 0) balanceStatus = 'partial';
      }

      return {
        ...tenant,
        balance: balance ? {
          status: balanceStatus,
          paid_amount: Number(balance.paid_amount),
          balance: Number(balance.balance),
        } : undefined,
      };
    }).filter(tenant => 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.phone.includes(searchQuery) ||
      tenant.houses?.house_no?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const tenantData = getTenantData();
  const assignedHouseIds = tenants.map(t => t.house_id).filter(Boolean) as string[];

  const handleAddTenant = () => {
    setEditingTenant(null);
    setDialogOpen(true);
  };

  const handleEditTenant = (tenant: TenantWithHouse) => {
    setEditingTenant(tenant);
    setDialogOpen(true);
  };

  const handleSaveTenant = async (data: { name: string; phone: string; secondaryPhone?: string; houseId: string }) => {
    if (editingTenant) {
      await updateTenant.mutateAsync({
        id: editingTenant.id,
        data: {
          name: data.name,
          phone: data.phone,
          secondary_phone: data.secondaryPhone || null,
          house_id: data.houseId || null,
        },
        previousHouseId: editingTenant.house_id,
      });
    } else {
      await addTenant.mutateAsync({
        name: data.name,
        phone: data.phone,
        secondary_phone: data.secondaryPhone || null,
        house_id: data.houseId || null,
      });
    }
  };

  const handleDeleteClick = (tenant: TenantWithHouse) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (tenantToDelete) {
      await deleteTenant.mutateAsync({
        id: tenantToDelete.id,
        houseId: tenantToDelete.house_id,
      });
      setTenantToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleViewStatement = (tenant: TenantWithHouse) => {
    setSelectedTenantForStatement(tenant);
    setStatementDialogOpen(true);
  };

  const getSelectedTenantHouse = () => {
    if (!selectedTenantForStatement?.houses) return null;
    return {
      id: selectedTenantForStatement.houses.id,
      houseNo: selectedTenantForStatement.houses.house_no,
      expectedRent: Number(selectedTenantForStatement.houses.expected_rent),
    };
  };

  const getSelectedTenantPayments = () => {
    if (!selectedTenantForStatement) return [];
    return payments
      .filter(p => p.tenant_id === selectedTenantForStatement.id)
      .map(p => ({
        id: p.id,
        amount: Number(p.amount),
        mpesaRef: p.mpesa_ref,
        date: p.payment_date,
        tenantName: selectedTenantForStatement.name,
        houseNo: selectedTenantForStatement.houses?.house_no || '',
        houseId: p.house_id || '',
        tenantId: p.tenant_id || '',
      }));
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tenants</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage tenant information and payments
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={handleAddTenant}>
            <Plus className="h-4 w-4" />
            Add Tenant
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
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
                  {tenant.secondary_phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                      <Phone className="h-3 w-3" />
                      <span>{tenant.secondary_phone} (Alt)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                    <Home className="h-3 w-3" />
                    <span>{tenant.houses?.house_no || 'Not assigned'}</span>
                  </div>
                </div>
                {tenant.balance && <StatusBadge status={tenant.balance.status} />}
              </div>
              
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Expected Rent</p>
                  <p className="font-semibold">{formatCurrency(Number(tenant.houses?.expected_rent) || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className={`font-semibold ${tenant.balance?.balance ? 'text-destructive' : 'text-success'}`}>
                    {formatCurrency(tenant.balance?.balance || 0)}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 gap-1"
                  onClick={() => handleViewStatement(tenant)}
                >
                  <FileText className="h-3 w-3" />
                  View Statement
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEditTenant(tenant)}>
                  Edit
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleDeleteClick(tenant)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {tenantData.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No tenants found</h3>
            <p className="text-muted-foreground">Add your first tenant to get started</p>
          </div>
        )}
      </div>

      {/* Tenant Form Dialog */}
      <TenantFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        tenant={editingTenant ? {
          id: editingTenant.id,
          name: editingTenant.name,
          phone: editingTenant.phone,
          secondaryPhone: editingTenant.secondary_phone || undefined,
          houseId: editingTenant.house_id || '',
        } : null}
        houses={houses.map(h => ({
          id: h.id,
          houseNo: h.house_no,
          expectedRent: Number(h.expected_rent),
        }))}
        assignedHouseIds={assignedHouseIds}
        onSave={handleSaveTenant}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Tenant</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{tenantToDelete?.name}</strong>? 
              This will mark their house as vacant.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Tenant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Statement Dialog */}
      <TenantStatementDialog
        open={statementDialogOpen}
        onOpenChange={setStatementDialogOpen}
        tenant={selectedTenantForStatement ? {
          id: selectedTenantForStatement.id,
          name: selectedTenantForStatement.name,
          phone: selectedTenantForStatement.phone,
          houseId: selectedTenantForStatement.house_id || '',
        } : null}
        house={getSelectedTenantHouse()}
        payments={getSelectedTenantPayments()}
      />
    </MainLayout>
  );
};

export default Tenants;
