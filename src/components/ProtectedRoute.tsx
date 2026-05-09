import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import { useImpersonation } from '@/hooks/useImpersonation';
import { useAccountStatus } from '@/hooks/useAccountStatus';
import AccountSuspended from '@/pages/AccountSuspended';

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const { isSuperAdmin, loading: superAdminLoading } = useSuperAdmin();
  const { impersonating } = useImpersonation();
  const { isSuspended, isPending, loading: statusLoading } = useAccountStatus();
  const location = useLocation();

  if (loading || superAdminLoading || statusLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (isSuspended && !isSuperAdmin && !impersonating) {
    return <AccountSuspended />;
  }

  // New signups must choose a subscription plan before accessing the app.
  if (isPending && !isSuperAdmin && !impersonating && location.pathname !== '/subscribe') {
    return <Navigate to="/subscribe" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
