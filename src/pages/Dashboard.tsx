import { useState, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/dashboard/StatCard';
import { EmptyDashboard } from '@/components/dashboard/EmptyDashboard';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useProperties } from '@/hooks/useProperties';
import { useHouses } from '@/hooks/useHouses';
import { useTenants } from '@/hooks/useTenants';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { HouseFormDialog } from '@/components/houses/HouseFormDialog';
import { Home, CheckCircle, AlertCircle, XCircle, Banknote, Phone, User, MessageCircle, MessageSquare, Printer, Loader2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('unpaid');
  const [addPropertyOpen, setAddPropertyOpen] = useState(false);
  const [addHouseOpen, setAddHouseOpen] = useState(false);
  const tabsRef = useRef<HTMLDivElement>(null);

  const { data, isLoading: statsLoading } = useDashboardStats();
  const { properties, isLoading: propertiesLoading, addProperty } = useProperties();
  const { houses, isLoading: housesLoading, addHouse } = useHouses();
  const { tenants, isLoading: tenantsLoading } = useTenants();

  const isLoading = statsLoading || propertiesLoading || housesLoading || tenantsLoading;

  const scrollToTabs = (tab: string) => {
    setActiveTab(tab);
    tabsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddProperty = async (propertyData: {
    name: string;
    address?: string;
    county?: string;
    town?: string;
    property_type?: string;
  }) => {
    await addProperty.mutateAsync(propertyData);
  };

  const handleAddHouse = async (houseData: {
    houseNo: string;
    expectedRent: number;
    isOccupied: boolean;
    propertyId?: string;
    tenantId?: string;
    occupancyDate?: string;
  }) => {
    await addHouse.mutateAsync({
      house_no: houseData.houseNo,
      expected_rent: houseData.expectedRent,
      property_id: houseData.propertyId || null,
      status: houseData.isOccupied ? 'occupied' : 'vacant',
      occupancy_date: houseData.occupancyDate || null,
    });
  };

  // Convert tenants to the format expected by HouseFormDialog
  const availableTenants = tenants
    .filter(t => !t.house_id) // Only show tenants without a house
    .map(t => ({
      id: t.id,
      name: t.name,
      phone: t.phone,
      houseId: t.house_id || '',
    }));

  const handlePrintStatements = () => {
    if (!data) return;
    
    const doc = new jsPDF();
    const currentDate = new Date().toLocaleDateString('en-KE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Title
    doc.setFontSize(18);
    doc.text('Outstanding Rent Statement', 14, 20);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated on: ${currentDate}`, 14, 28);

    let yPosition = 40;

    // Unpaid Houses Section
    if (data.unpaidHouses.length > 0) {
      doc.setFontSize(14);
      doc.setTextColor(220, 53, 69);
      doc.text('Unpaid Houses', 14, yPosition);
      yPosition += 6;

      const unpaidData = data.unpaidHouses.map((house) => [
        house.houseNo,
        house.tenantName || 'Vacant',
        house.tenantPhone || '-',
        formatCurrency(house.expectedRent),
        formatCurrency(house.balance),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['House No', 'Tenant', 'Phone', 'Expected', 'Amount Due']],
        body: unpaidData,
        theme: 'striped',
        headStyles: { fillColor: [220, 53, 69] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Partially Paid Houses Section
    if (data.partialHouses.length > 0) {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(14);
      doc.setTextColor(255, 193, 7);
      doc.text('Partially Paid Houses', 14, yPosition);
      yPosition += 6;

      const partialData = data.partialHouses.map((house) => [
        house.houseNo,
        house.tenantName || 'Vacant',
        house.tenantPhone || '-',
        formatCurrency(house.expectedRent),
        formatCurrency(house.paidAmount),
        formatCurrency(house.balance),
      ]);

      autoTable(doc, {
        startY: yPosition,
        head: [['House No', 'Tenant', 'Phone', 'Expected', 'Paid', 'Balance']],
        body: partialData,
        theme: 'striped',
        headStyles: { fillColor: [255, 193, 7], textColor: [0, 0, 0] },
      });

      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Summary
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Summary', 14, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.text(`Total Unpaid Houses: ${data.unpaidHouses.length}`, 14, yPosition);
    yPosition += 6;
    doc.text(`Total Partially Paid Houses: ${data.partialHouses.length}`, 14, yPosition);
    yPosition += 6;
    const totalOutstanding = [...data.unpaidHouses, ...data.partialHouses].reduce((sum, h) => sum + h.balance, 0);
    doc.text(`Total Outstanding: ${formatCurrency(totalOutstanding)}`, 14, yPosition);

    doc.save(`outstanding-rent-${new Date().toISOString().split('T')[0]}.pdf`);
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

  // Show empty state for new landlords
  if (properties.length === 0 || houses.length === 0) {
    return (
      <MainLayout>
        <EmptyDashboard 
          hasProperties={properties.length > 0}
          hasHouses={houses.length > 0}
          onAddProperty={() => setAddPropertyOpen(true)}
          onAddHouse={() => setAddHouseOpen(true)}
        />
        
        <PropertyFormDialog
          open={addPropertyOpen}
          onOpenChange={setAddPropertyOpen}
          onSave={handleAddProperty}
        />
        
        <HouseFormDialog
          open={addHouseOpen}
          onOpenChange={setAddHouseOpen}
          onSave={handleAddHouse}
          properties={properties}
          tenants={availableTenants}
        />
      </MainLayout>
    );
  }

  const stats = data?.stats || {
    totalHouses: 0,
    occupiedHouses: 0,
    vacantHouses: 0,
    totalExpected: 0,
    totalCollected: 0,
    totalOutstanding: 0,
    paidHouses: 0,
    partialHouses: 0,
    unpaidHouses: 0,
  };

  const unpaidHouses = data?.unpaidHouses || [];
  const partialHouses = data?.partialHouses || [];
  const paidHouses = data?.paidHouses || [];

  return (
    <MainLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Landlord Dashboard</h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })} rent collection overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Houses"
            value={stats.totalHouses}
            subtitle="Active properties"
            icon={Home}
            variant="default"
          />
          <StatCard
            title="Fully Paid"
            value={stats.paidHouses}
            subtitle={stats.totalHouses > 0 ? `${Math.round((stats.paidHouses / stats.totalHouses) * 100)}% of total` : '0% of total'}
            icon={CheckCircle}
            variant="success"
          />
          <div onClick={() => scrollToTabs('partial')} className="cursor-pointer">
            <StatCard
              title="Partially Paid"
              value={stats.partialHouses}
              subtitle="Pending balance"
              icon={AlertCircle}
              variant="warning"
            />
          </div>
          <div onClick={() => scrollToTabs('unpaid')} className="cursor-pointer">
            <StatCard
              title="Unpaid"
              value={stats.unpaidHouses}
              subtitle="No payments received"
              icon={XCircle}
              variant="danger"
            />
          </div>
        </div>

        {/* Financial Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard
            title="Total Expected"
            value={formatCurrency(stats.totalExpected)}
            icon={Banknote}
            variant="default"
          />
          <StatCard
            title="Total Collected"
            value={formatCurrency(stats.totalCollected)}
            icon={Banknote}
            variant="success"
          />
          <StatCard
            title="Outstanding Balance"
            value={formatCurrency(stats.totalOutstanding)}
            icon={Banknote}
            variant="danger"
          />
        </div>

        <div className="stat-card animate-slide-up" ref={tabsRef}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">House Payment Status</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePrintStatements}
              className="gap-2"
              disabled={unpaidHouses.length === 0 && partialHouses.length === 0}
            >
              <Printer className="h-4 w-4" />
              <span className="hidden sm:inline">Print Statement</span>
            </Button>
          </div>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3 h-auto">
              <TabsTrigger value="unpaid" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-1 md:px-3">
                <XCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Unpaid</span> ({unpaidHouses.length})
              </TabsTrigger>
              <TabsTrigger value="partial" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-1 md:px-3">
                <AlertCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Partial</span> ({partialHouses.length})
              </TabsTrigger>
              <TabsTrigger value="paid" className="flex items-center gap-1 md:gap-2 text-xs md:text-sm py-2 px-1 md:px-3">
                <CheckCircle className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Paid</span> ({paidHouses.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="unpaid" className="mt-4">
              {unpaidHouses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No unpaid houses</p>
              ) : (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="min-w-[500px] md:min-w-0 px-4 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>House</TableHead>
                          <TableHead className="hidden sm:table-cell">Tenant</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="text-right">Amount Due</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unpaidHouses.map((house) => (
                          <TableRow key={house.houseId}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                                <div>
                                  <span>{house.houseNo}</span>
                                  <p className="sm:hidden text-xs text-muted-foreground">{house.tenantName || 'Vacant'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {house.tenantName || 'Vacant'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {house.tenantPhone ? (
                                <div className="flex items-center gap-2 md:gap-3">
                                  <a href={`tel:${house.tenantPhone}`} className="text-primary hover:underline" title="Call">
                                    <Phone className="h-4 w-4" />
                                  </a>
                                  <a href={`https://wa.me/${house.tenantPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-success hover:opacity-80" title="WhatsApp">
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                  <a href={`sms:${house.tenantPhone}`} className="text-primary hover:opacity-80" title="SMS">
                                    <MessageSquare className="h-4 w-4" />
                                  </a>
                                  <span className="text-xs md:text-sm hidden md:inline">{house.tenantPhone}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-destructive font-medium text-sm">
                              {formatCurrency(house.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="partial" className="mt-4">
              {partialHouses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No partially paid houses</p>
              ) : (
                <div className="overflow-x-auto -mx-4 md:mx-0">
                  <div className="min-w-[500px] md:min-w-0 px-4 md:px-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>House</TableHead>
                          <TableHead className="hidden sm:table-cell">Tenant</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Balance</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {partialHouses.map((house) => (
                          <TableRow key={house.houseId}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 text-warning flex-shrink-0" />
                                <div>
                                  <span>{house.houseNo}</span>
                                  <p className="sm:hidden text-xs text-muted-foreground">{house.tenantName || 'Vacant'}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                {house.tenantName || 'Vacant'}
                              </div>
                            </TableCell>
                            <TableCell>
                              {house.tenantPhone ? (
                                <div className="flex items-center gap-2 md:gap-3">
                                  <a href={`tel:${house.tenantPhone}`} className="text-primary hover:underline" title="Call">
                                    <Phone className="h-4 w-4" />
                                  </a>
                                  <a href={`https://wa.me/${house.tenantPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-success hover:opacity-80" title="WhatsApp">
                                    <MessageCircle className="h-4 w-4" />
                                  </a>
                                  <a href={`sms:${house.tenantPhone}`} className="text-primary hover:opacity-80" title="SMS">
                                    <MessageSquare className="h-4 w-4" />
                                  </a>
                                  <span className="text-xs md:text-sm hidden md:inline">{house.tenantPhone}</span>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right text-success text-sm">
                              {formatCurrency(house.paidAmount)}
                            </TableCell>
                            <TableCell className="text-right text-warning font-medium text-sm">
                              {formatCurrency(house.balance)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="paid" className="mt-4">
              <div className="flex flex-wrap gap-3">
                {paidHouses.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No fully paid houses</p>
                ) : (
                  paidHouses.map((house) => (
                    <div key={house.houseId} className="flex items-center gap-2 p-3 rounded-lg border border-success/30 bg-success/5">
                      <CheckCircle className="h-4 w-4 text-success" />
                      <div>
                        <p className="font-medium text-sm">{house.houseNo}</p>
                        <p className="text-xs text-muted-foreground">{house.tenantName || 'Vacant'}</p>
                        <p className="text-xs text-success font-medium">{formatCurrency(house.paidAmount)} paid</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <PropertyFormDialog
        open={addPropertyOpen}
        onOpenChange={setAddPropertyOpen}
        onSave={handleAddProperty}
      />
      
      <HouseFormDialog
        open={addHouseOpen}
        onOpenChange={setAddHouseOpen}
        onSave={handleAddHouse}
        properties={properties}
        tenants={availableTenants}
      />
    </MainLayout>
  );
};

export default Dashboard;
