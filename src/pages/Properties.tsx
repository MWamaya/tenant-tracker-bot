import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AppBreadcrumbs } from '@/components/navigation/AppBreadcrumbs';
import { useProperties, PropertyWithStats } from '@/hooks/useProperties';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
  Search, 
  Plus, 
  Building2, 
  Home, 
  Users, 
  Trash2, 
  Edit, 
  Loader2,
  MapPin 
} from 'lucide-react';
import { PropertyFormDialog } from '@/components/properties/PropertyFormDialog';
import { useNavigate } from 'react-router-dom';

const Properties = () => {
  const { propertiesWithStats, isLoading, addProperty, updateProperty, deleteProperty } = useProperties();
  const navigate = useNavigate();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyWithStats | null>(null);

  const filteredProperties = propertiesWithStats.filter(property =>
    property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.town?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddProperty = async (data: {
    name: string;
    address?: string;
    county?: string;
    town?: string;
    property_type?: string;
  }) => {
    await addProperty.mutateAsync(data);
  };

  const handleEditProperty = async (data: {
    name: string;
    address?: string;
    county?: string;
    town?: string;
    property_type?: string;
  }) => {
    if (selectedProperty) {
      await updateProperty.mutateAsync({ id: selectedProperty.id, data });
    }
  };

  const handleDeleteConfirm = async () => {
    if (selectedProperty) {
      await deleteProperty.mutateAsync(selectedProperty.id);
      setSelectedProperty(null);
      setDeleteDialogOpen(false);
    }
  };

  const handlePropertyClick = (property: PropertyWithStats) => {
    navigate(`/property?property=${property.id}`);
  };

  const getPropertyTypeLabel = (type: string | null) => {
    switch (type) {
      case 'residential': return 'Residential';
      case 'commercial': return 'Commercial';
      case 'mixed': return 'Mixed Use';
      default: return 'Residential';
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
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Properties</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Manage your rental properties and buildings
            </p>
          </div>
          <Button className="gap-2 w-full sm:w-auto" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-full sm:max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Properties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProperties.map((property) => (
            <Card 
              key={property.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handlePropertyClick(property)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{property.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        {property.town || property.county || 'No location set'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {getPropertyTypeLabel(property.property_type)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 pt-2 border-t">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                      <Home className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-semibold">{property.houses_count}</p>
                    <p className="text-xs text-muted-foreground">Units</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-success mb-1">
                      <Users className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-semibold text-success">{property.occupied_count}</p>
                    <p className="text-xs text-muted-foreground">Occupied</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-warning mb-1">
                      <Home className="h-3 w-3" />
                    </div>
                    <p className="text-lg font-semibold text-warning">{property.vacant_count}</p>
                    <p className="text-xs text-muted-foreground">Vacant</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-3 border-t">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProperty(property);
                      setEditDialogOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProperty(property);
                      setDeleteDialogOpen(true);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProperties.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium">No properties found</h3>
            <p className="text-muted-foreground">Add your first property to get started</p>
          </div>
        )}
      </div>

      {/* Add Property Dialog */}
      <PropertyFormDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSave={handleAddProperty}
      />

      {/* Edit Property Dialog */}
      <PropertyFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleEditProperty}
        editProperty={selectedProperty}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProperty?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this property. Houses under this property will become unassigned. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
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

export default Properties;
