import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

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
    // Fetch the current authenticated user directly to avoid stale context state
    // right after a fresh signIn (the useAuth context may not have updated yet).
    const { data: { user: currentUser } } = await supabase.auth.getUser();
    const activeUser = currentUser ?? user;

    if (!activeUser) {
      setIsSuperAdmin(false);
      setLoading(false);
      return false;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', activeUser.id)
        .eq('role', 'SUPER_ADMIN')
        .maybeSingle();

      if (error) {
        console.error('Error checking super admin role:', error);
        setIsSuperAdmin(false);
        setLoading(false);
        return false;
      }

      const isAdmin = !!data;
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
