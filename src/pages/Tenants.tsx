import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { balances, payments, Tenant } from '@/lib/mockData';
import { useData } from '@/context/DataContext';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Plus, User, Phone, Home, Trash2, FileText } from 'lucide-react';
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
  const { houses, tenants, addTenant, updateTenant, deleteTenant } = useData();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<Tenant | null>(null);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [selectedTenantForStatement, setSelectedTenantForStatement] = useState<Tenant | null>(null);

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
      updateTenant(editingTenant.id, data);
      toast.success('Tenant updated successfully');
    } else {
      addTenant(data);
      toast.success('Tenant added successfully');
    }
  };

  const handleDeleteClick = (tenant: Tenant) => {
    setTenantToDelete(tenant);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (tenantToDelete) {
      deleteTenant(tenantToDelete.id);
      toast.success('Tenant removed successfully. House is now vacant.');
      setTenantToDelete(null);
      setDeleteDialogOpen(false);
    }
  };

  const handleViewStatement = (tenant: Tenant) => {
    setSelectedTenantForStatement(tenant);
    setStatementDialogOpen(true);
  };

  const getSelectedTenantHouse = () => {
    if (!selectedTenantForStatement) return null;
    return houses.find(h => h.id === selectedTenantForStatement.houseId) || null;
  };

  const getSelectedTenantPayments = () => {
    if (!selectedTenantForStatement) return [];
    return payments.filter(p => p.tenantId === selectedTenantForStatement.id);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
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
        tenant={selectedTenantForStatement}
        house={getSelectedTenantHouse()}
        payments={getSelectedTenantPayments()}
      />
    </MainLayout>
  );
};

export default Tenants;