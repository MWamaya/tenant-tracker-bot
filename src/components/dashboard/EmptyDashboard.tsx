import { Building2, Home, Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

interface EmptyDashboardProps {
  hasProperties: boolean;
  hasHouses: boolean;
  onAddProperty: () => void;
  onAddHouse: () => void;
}

export const EmptyDashboard = ({ 
  hasProperties, 
  hasHouses, 
  onAddProperty,
  onAddHouse 
}: EmptyDashboardProps) => {
  const navigate = useNavigate();

  if (!hasProperties) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-6 rounded-full bg-primary/10 mb-6">
          <Building2 className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Welcome to Your Dashboard!</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Get started by adding your first property. A property represents a building or complex 
          where you manage rental units.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" onClick={onAddProperty} className="gap-2">
            <Plus className="h-5 w-5" />
            Add Your First Property
          </Button>
        </div>
        
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full">
          <Card className="text-left">
            <CardHeader className="pb-2">
              <div className="p-2 rounded-lg bg-primary/10 w-fit mb-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">1. Add Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Create properties for each building or complex you manage.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="text-left">
            <CardHeader className="pb-2">
              <div className="p-2 rounded-lg bg-primary/10 w-fit mb-2">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-lg">2. Add Houses/Units</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Add individual rental units to each property with rent amounts.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card className="text-left">
            <CardHeader className="pb-2">
              <div className="p-2 rounded-lg bg-success/10 w-fit mb-2">
                <ArrowRight className="h-5 w-5 text-success" />
              </div>
              <CardTitle className="text-lg">3. Track Payments</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Monitor rent collection and tenant payments in real-time.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!hasHouses) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
        <div className="p-6 rounded-full bg-primary/10 mb-6">
          <Home className="h-16 w-16 text-primary" />
        </div>
        <h2 className="text-2xl md:text-3xl font-bold mb-3">Property Created!</h2>
        <p className="text-muted-foreground max-w-md mb-8">
          Great start! Now add houses or units to your property to begin tracking rent payments.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button size="lg" onClick={() => navigate('/properties')} className="gap-2">
            <Building2 className="h-5 w-5" />
            Go to Properties
          </Button>
          <Button size="lg" variant="outline" onClick={onAddHouse} className="gap-2">
            <Plus className="h-5 w-5" />
            Add Houses
          </Button>
        </div>
      </div>
    );
  }

  return null;
};
