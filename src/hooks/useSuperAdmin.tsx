import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiClient } from '@/lib/api';

interface SuperAdminContextType {
  isSuperAdmin: boolean;
  loading: boolean;
  checkSuperAdmin: () => Promise<boolean>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const checkSuperAdmin = async (): Promise<boolean> => {
    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return false;
    }

    try {
      const data = await apiClient.get<{ is_super_admin: boolean }>('/api/auth/check-super-admin');
      const isAdmin = data.is_super_admin;
      setIsSuperAdmin(isAdmin);
      setLoading(false);
      return isAdmin;
    } catch (error) {
      console.error('Error checking super admin role:', error);
      setIsSuperAdmin(false);
      setLoading(false);
      return false;
    }
  };

  useEffect(() => {
    checkSuperAdmin();
  }, [user]);

  return (
    <SuperAdminContext.Provider value={{ isSuperAdmin, loading, checkSuperAdmin }}>
      {children}
    </SuperAdminContext.Provider>
  );
};

export const useSuperAdmin = () => {
  const context = useContext(SuperAdminContext);
  if (context === undefined) {
    throw new Error('useSuperAdmin must be used within a SuperAdminProvider');
  }
  return context;
};
