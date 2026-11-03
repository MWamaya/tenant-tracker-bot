import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface SuperAdminContextType {
  isSuperAdmin: boolean;
  hasAdminRole: boolean;
  loading: boolean;
  checkSuperAdmin: () => Promise<boolean>;
}

const SuperAdminContext = createContext<SuperAdminContextType | undefined>(undefined);

export const SuperAdminProvider = ({ children }: { children: ReactNode }) => {
  const { user, session } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestSequence = useRef(0);

  const refreshAuthorization = useCallback(async (blocking: boolean): Promise<boolean> => {
    const request = ++requestSequence.current;
    if (blocking) setLoading(true);
    try {
      // Read current identity directly: auth context may lag a fresh sign-in.
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      let isAdmin = false;
      let authorized = false;
      if (currentUser) {
        const { data, error } = await supabase.from('user_roles').select('role')
          .eq('user_id', currentUser.id).eq('role', 'SUPER_ADMIN').maybeSingle();
        if (error) throw error;
        isAdmin = !!data;
        if (isAdmin) {
          const result = await supabase.rpc('has_role', { _user_id: currentUser.id, _role: 'SUPER_ADMIN' });
          authorized = !result.error && result.data === true;
        }
      }
      // Sign-out/session replacement must win over older network responses.
      if (request === requestSequence.current) {
        setHasAdminRole(isAdmin);
        setIsSuperAdmin(authorized);
        setLoading(false);
      }
      return isAdmin;
    } catch (error) {
      console.error('Error checking super admin authorization:', error);
      if (request === requestSequence.current) {
        setIsSuperAdmin(false);
        setHasAdminRole(false);
        setLoading(false);
      }
      return false;
    }
  }, []);

  const checkSuperAdmin = useCallback(() => refreshAuthorization(true), [refreshAuthorization]);

  useEffect(() => {
    void checkSuperAdmin();
    // Approval can expire or be revoked while the account ID stays unchanged.
    // Background checks preserve the current page while awaiting the server.
    const refresh = () => { void refreshAuthorization(false); };
    const timer = user?.id ? setInterval(refresh, 60_000) : undefined;
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
      // Invalidate the latest request generation; this ref is not a DOM node.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      requestSequence.current++;
    };
  }, [user?.id, session?.access_token, checkSuperAdmin, refreshAuthorization]);

  return (
    <SuperAdminContext.Provider value={{ isSuperAdmin, hasAdminRole, loading, checkSuperAdmin }}>
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
