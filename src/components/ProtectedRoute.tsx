import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
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
  const { isSuspended, loading: statusLoading } = useAccountStatus();

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

  // Suspended landlords see the payment instructions gate.
  // Super Admins bypass it (including while impersonating) so they can investigate.
  if (isSuspended && !isSuperAdmin && !impersonating) {
    return <AccountSuspended />;
  }

  // Note: Super Admins are also allowed here when impersonating (or just browsing
  // a landlord's view). The ImpersonationBanner makes the mode explicit.
  return <>{children}</>;
};

export default ProtectedRoute;
