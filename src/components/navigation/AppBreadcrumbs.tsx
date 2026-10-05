import React from 'react';
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
import { ROUTES } from '@/lib/routes';

interface BreadcrumbConfig {
  label: string;
  href?: string;
}

const routeConfig: Record<string, BreadcrumbConfig> = {
  [ROUTES.DASHBOARD]: { label: 'Landlord Dashboard' },
  [ROUTES.PROPERTIES]: { label: 'Properties', href: ROUTES.PROPERTIES },
  [ROUTES.PROPERTY]: { label: 'Property Details' }, // Dynamic
  [ROUTES.HOUSES]: { label: 'Houses', href: ROUTES.HOUSES },
  [ROUTES.TENANTS]: { label: 'Tenants', href: ROUTES.TENANTS },
  [ROUTES.PAYMENTS]: { label: 'Payments', href: ROUTES.PAYMENTS },
  [ROUTES.REPORTS]: { label: 'Reports', href: ROUTES.REPORTS },
  [ROUTES.EMAIL_LOGS]: { label: 'Email Logs', href: ROUTES.EMAIL_LOGS },
  [ROUTES.SETTINGS]: { label: 'Settings', href: ROUTES.SETTINGS },
};

export const AppBreadcrumbs = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { properties } = useProperties();
  
  const propertyId = searchParams.get('property');
  const selectedProperty = properties.find(p => p.id === propertyId);

  const getBreadcrumbs = (): BreadcrumbConfig[] => {
    const breadcrumbs: BreadcrumbConfig[] = [
      { label: 'Landlord Dashboard', href: ROUTES.DASHBOARD },
    ];

    const path = location.pathname;

    // Handle property-specific routes
    if (propertyId && selectedProperty) {
      breadcrumbs.push({ label: 'Properties', href: ROUTES.PROPERTIES });

      if (path === ROUTES.PROPERTY) {
        breadcrumbs.push({ label: selectedProperty.name });
      } else {
        breadcrumbs.push({
          label: selectedProperty.name,
          href: `${ROUTES.PROPERTY}?property=${propertyId}`
        });

        // Add current page
        if (path === ROUTES.HOUSES) {
          breadcrumbs.push({ label: 'Houses' });
        } else if (path === ROUTES.TENANTS) {
          breadcrumbs.push({ label: 'Tenants' });
        } else if (path === ROUTES.PAYMENTS) {
          breadcrumbs.push({ label: 'Payments' });
        }
      }
    } else {
      // Standard routes without property context
      if (path === ROUTES.DASHBOARD) {
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
            <React.Fragment key={index}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.href || ROUTES.DASHBOARD} className="flex items-center gap-1.5">
                      {isFirst && <Home className="h-3.5 w-3.5" />}
                      {crumb.label}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
