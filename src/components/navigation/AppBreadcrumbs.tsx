import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { useProperties } from '@/hooks/useProperties';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Home } from 'lucide-react';

interface BreadcrumbConfig {
  label: string;
  href?: string;
}

const routeConfig: Record<string, BreadcrumbConfig> = {
  '/': { label: 'Landlord Dashboard' },
  '/properties': { label: 'Properties', href: '/properties' },
  '/property': { label: 'Property Details' }, // Dynamic
  '/houses': { label: 'Houses', href: '/houses' },
  '/tenants': { label: 'Tenants', href: '/tenants' },
  '/payments': { label: 'Payments', href: '/payments' },
  '/reports': { label: 'Reports', href: '/reports' },
  '/email-logs': { label: 'Email Logs', href: '/email-logs' },
  '/settings': { label: 'Settings', href: '/settings' },
};

export const AppBreadcrumbs = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { properties } = useProperties();
  
  const propertyId = searchParams.get('property');
  const selectedProperty = properties.find(p => p.id === propertyId);

  const getBreadcrumbs = (): BreadcrumbConfig[] => {
    const breadcrumbs: BreadcrumbConfig[] = [
      { label: 'Landlord Dashboard', href: '/' },
    ];

    const path = location.pathname;

    // Handle property-specific routes
    if (propertyId && selectedProperty) {
      breadcrumbs.push({ label: 'Properties', href: '/properties' });
      
      if (path === '/property') {
        breadcrumbs.push({ label: selectedProperty.name });
      } else {
        breadcrumbs.push({ 
          label: selectedProperty.name, 
          href: `/property?property=${propertyId}` 
        });
        
        // Add current page
        if (path === '/houses') {
          breadcrumbs.push({ label: 'Houses' });
        } else if (path === '/tenants') {
          breadcrumbs.push({ label: 'Tenants' });
        } else if (path === '/payments') {
          breadcrumbs.push({ label: 'Payments' });
        }
      }
    } else {
      // Standard routes without property context
      if (path === '/') {
        return [{ label: 'Landlord Dashboard' }];
      }

      const config = routeConfig[path];
      if (config) {
        breadcrumbs.push({ label: config.label });
      }
    }

    return breadcrumbs;
  };

  const breadcrumbs = getBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null;
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <BreadcrumbItem key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              {isLast ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={crumb.href || '/'} className="flex items-center gap-1.5">
                    {isFirst && <Home className="h-3.5 w-3.5" />}
                    {crumb.label}
                  </Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
