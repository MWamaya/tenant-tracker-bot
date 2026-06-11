import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useHouses } from '@/hooks/useHouses';
import { useTenants, TenantWithHouse } from '@/hooks/useTenants';
import { useBalances } from '@/hooks/useBalances';
import { usePayments } from '@/hooks/usePayments';
import { useProperties } from '@/hooks/useProperties';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Plus, User, Phone, Home, Trash2, FileText, Loader2, ChevronDown, Users, Building2, LogOut, DoorOpen } from 'lucide-react';
import { TenantFormDialog } from '@/components/tenants/TenantFormDialog';
import { BulkTenantFormDialog } from '@/components/tenants/BulkTenantFormDialog';
import { TenantStatementDialog } from '@/components/tenants/TenantStatementDialog';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  const { properties, isLoading: propertiesLoading } = useProperties();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<TenantWithHouse | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<TenantWithHouse | null>(null);
  const [statementDialogOpen, setStatementDialogOpen] = useState(false);
  const [selectedTenantForStatement, setSelectedTenantForStatement] = useState<TenantWithHouse | null>(null);

  const isLoading = housesLoading || tenantsLoading || propertiesLoading;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const getTenantData = () => {
    // Map house_id -> property_id for filtering
    const housePropertyMap = new Map<string, string | null>();
    houses.forEach(h => housePropertyMap.set(h.id, h.property_id));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthIdx = now.getMonth();

    return tenants.map(tenant => {
      const expectedRent = Number(tenant.houses?.expected_rent || 0);

      // Load manual B/F overrides saved from the Statement dialog (per tenant/year)
      let bfOverrides: Record<number, number> = {};
      try {
        const stored = localStorage.getItem(`bf_overrides_${tenant.id}_${currentYear}`);
        if (stored) bfOverrides = JSON.parse(stored);
      } catch { /* ignore */ }

      // Tenant's payments for the current year, grouped by month index
      const tenantPayments = payments.filter(p => p.tenant_id === tenant.id);
      const paidByMonth: Record<number, number> = {};
      tenantPayments.forEach(p => {
        const d = new Date(p.payment_date);
        if (d.getFullYear() !== currentYear) return;
        paidByMonth[d.getMonth()] = (paidByMonth[d.getMonth()] || 0) + Number(p.amount);
      });

      // Walk months Jan..prev to derive C/F INTO the current month (allow negative = credit)
      let bfIntoCurrent = 0;
      for (let i = 0; i < currentMonthIdx; i++) {
        const hasOverride = Object.prototype.hasOwnProperty.call(bfOverrides, i);
        const bf = hasOverride ? Number(bfOverrides[i]) || 0 : bfIntoCurrent;
        const paid = paidByMonth[i] || 0;
        bfIntoCurrent = expectedRent + bf - paid; // no clamp: negative = credit
      }
      // Apply current-month override if present (overrides incoming BF)
      if (Object.prototype.hasOwnProperty.call(bfOverrides, currentMonthIdx)) {
        bfIntoCurrent = Number(bfOverrides[currentMonthIdx]) || 0;
      }

      const totalPaidCurrentMonth = paidByMonth[currentMonthIdx] || 0;

      // End-of-current-month projected balance (negative = credit rolling to next month)
      const endOfMonthBalance = expectedRent + bfIntoCurrent - totalPaidCurrentMonth;

      // Display "C/F" as what will roll into NEXT month (credit if overpaid)
      const carryForward = endOfMonthBalance;

      // Monthly balance still owed for the current month (0 if fully paid / overpaid)
      const monthlyBalance = Math.max(0, expectedRent + Math.max(0, bfIntoCurrent) - totalPaidCurrentMonth);

      const totalDue = expectedRent + Math.max(0, bfIntoCurrent);
      const balanceRemaining = Math.max(0, totalDue - totalPaidCurrentMonth);

      let balanceStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (totalPaidCurrentMonth >= totalDue) balanceStatus = 'paid';
      else if (totalPaidCurrentMonth > 0) balanceStatus = 'partial';


      return {
        ...tenant,
        balance: {
          status: balanceStatus,
          paid_amount: totalPaidCurrentMonth,
          balance: balanceRemaining,
          carry_forward: carryForward,
          monthly_balance: monthlyBalance,
          expected_rent: expectedRent,
        },

      };
    })

    .filter(tenant => {
      const matchesSearch =
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.phone.includes(searchQuery) ||
        tenant.houses?.house_no?.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (selectedPropertyId === 'all') return true;
      const tenantPropertyId = tenant.house_id ? housePropertyMap.get(tenant.house_id) : null;
      return tenantPropertyId === selectedPropertyId;
    })
    .sort((a, b) => {
      const aNo = a.houses?.house_no || '';
      const bNo = b.houses?.house_no || '';
      // Tenants without an assigned house go to the bottom
      if (!aNo && bNo) return 1;
      if (aNo && !bNo) return -1;
      return aNo.localeCompare(bNo, undefined, { numeric: true, sensitivity: 'base' });
    });
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

  const handleBulkSaveTenants = async (data: { name: string; phone: string; houseId: string }[]) => {
    for (const tenant of data) {
      await addTenant.mutateAsync({
        name: tenant.name,
        phone: tenant.phone,
        house_id: tenant.houseId || null,
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
      <MainLayout seo={{ title: "Tenants \u2014 KODI PAP", description: "Manage tenants, expected rent and carry-forward balances.", path: "/tenants" }}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout seo={{ title: "Tenants \u2014 KODI PAP", description: "Manage tenants, expected rent and carry-forward balances.", path: "/tenants" }}>
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Add Tenant
                <ChevronDown className="h-3 w-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover">
              <DropdownMenuItem onClick={handleAddTenant} className="gap-2">
                <User className="h-4 w-4" />
                Add Single Tenant
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBulkDialogOpen(true)} className="gap-2">
                <Users className="h-4 w-4" />
                Bulk Add Tenants
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Search & Property Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          {properties.length > 0 && (
            <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
              <SelectTrigger className="w-full sm:w-[200px] gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <SelectValue placeholder="All Properties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Properties</SelectItem>
                {properties.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Tenant Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenantData.map((tenant) => (
            <div key={tenant.id} className="stat-card">
              <div className="flex items-start gap-4">
                <div className="h-14 w-14 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                  {tenant.houses?.house_no ? (
                    <span className="font-bold text-primary text-lg leading-none">
                      {tenant.houses.house_no.match(/[A-Za-z].*$/)?.[0] || tenant.houses.house_no}
                    </span>
                  ) : (
                    <Home className="h-6 w-6 text-muted-foreground" />
                  )}
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
              
              <div className="mt-4 pt-4 border-t grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Expected Rent</p>
                  <p className="font-semibold">{formatCurrency(Number(tenant.houses?.expected_rent) || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {(tenant.balance?.carry_forward ?? 0) < 0 ? 'Credit C/F' : 'C/F'}
                  </p>
                  <p className={`font-semibold ${(tenant.balance?.carry_forward ?? 0) < 0 ? 'text-success' : (tenant.balance?.carry_forward ?? 0) > 0 ? 'text-destructive' : ''}`}>
                    {formatCurrency(Math.abs(tenant.balance?.carry_forward || 0))}
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Edit <ChevronDown className="h-3 w-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleEditTenant(tenant)}>
                      Edit Details
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteClick(tenant)}
                      className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    >
                      <LogOut className="h-3.5 w-3.5 mr-2" />
                      Mark as Moved Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>

        {/* Vacant Houses Notice */}
        {(() => {
          const vacantHouses = houses.filter(h => h.status === 'vacant');
          if (vacantHouses.length === 0) return null;
          return (
            <div className="rounded-lg border border-dashed border-warning/40 bg-warning/5 p-4">
              <div className="flex items-center gap-2 mb-3">
                <DoorOpen className="h-4 w-4 text-warning" />
                <h3 className="font-semibold text-sm">Vacant Houses ({vacantHouses.length})</h3>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                These houses currently have no tenant assigned and are available for occupancy.
              </p>
              <div className="flex flex-wrap gap-2">
                {vacantHouses.map(h => (
                  <span key={h.id} className="inline-flex items-center gap-1.5 rounded-md bg-background border px-2.5 py-1 text-xs font-medium">
                    <Home className="h-3 w-3 text-muted-foreground" />
                    {h.house_no}
                    {h.properties?.name && <span className="text-muted-foreground">· {h.properties.name}</span>}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

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

      {/* Bulk Tenant Form Dialog */}
      <BulkTenantFormDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        houses={houses.map(h => ({
          id: h.id,
          houseNo: h.house_no,
          expectedRent: Number(h.expected_rent),
        }))}
        assignedHouseIds={assignedHouseIds}
        onSave={handleBulkSaveTenants}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Tenant as Moved Out</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{tenantToDelete?.name}</strong>'s details and mark house{' '}
              <strong>{tenantToDelete?.houses?.house_no || 'N/A'}</strong> as vacant. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Mark as Moved Out
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
