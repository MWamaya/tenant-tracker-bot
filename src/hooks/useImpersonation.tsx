import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const STORAGE_KEY = 'kodipap_impersonation';

interface ImpersonatedLandlord {
  id: string;
  name: string;
  company: string | null;
}

interface ImpersonationContextType {
  impersonating: ImpersonatedLandlord | null;
  startImpersonation: (landlord: ImpersonatedLandlord) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  effectiveLandlordId: string | null;
}

const ImpersonationContext = createContext<ImpersonationContextType | undefined>(undefined);

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [impersonating, setImpersonating] = useState<ImpersonatedLandlord | null>(null);

  // Load from sessionStorage on mount
  useEffect(() => {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setImpersonating(JSON.parse(stored));
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Clear impersonation if the actual user signs out
  useEffect(() => {
    if (!user && impersonating) {
      sessionStorage.removeItem(STORAGE_KEY);
      setImpersonating(null);
    }
  }, [user, impersonating]);

  const startImpersonation = useCallback(
    async (landlord: ImpersonatedLandlord) => {
      if (!user) {
        toast.error('You must be signed in to impersonate');
        return;
      }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(landlord));
      setImpersonating(landlord);

      // Audit log
      await supabase.from('audit_logs').insert({
        admin_id: user.id,
        action: 'START_IMPERSONATION',
        entity_type: 'profile',
        entity_id: landlord.id,
        new_values: { landlord_name: landlord.name },
      });

      // Refetch all landlord-scoped data
      queryClient.invalidateQueries();
      toast.success(`Now viewing as ${landlord.name}`);
    },
    [user, queryClient],
  );

  const stopImpersonation = useCallback(async () => {
    if (impersonating && user) {
      await supabase.from('audit_logs').insert({
        admin_id: user.id,
        action: 'STOP_IMPERSONATION',
        entity_type: 'profile',
        entity_id: impersonating.id,
        new_values: { landlord_name: impersonating.name },
      });
    }
    sessionStorage.removeItem(STORAGE_KEY);
    setImpersonating(null);
    queryClient.invalidateQueries();
  }, [impersonating, user, queryClient]);

  const effectiveLandlordId = impersonating?.id ?? user?.id ?? null;

  return (
    <ImpersonationContext.Provider
      value={{ impersonating, startImpersonation, stopImpersonation, effectiveLandlordId }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
};

export const useImpersonation = () => {
  const ctx = useContext(ImpersonationContext);
  if (!ctx) throw new Error('useImpersonation must be used within ImpersonationProvider');
  return ctx;
};

/**
 * Returns the landlord ID whose data should be queried/written.
 * - Normal user: their own auth.uid()
 * - Super Admin impersonating: the impersonated landlord's ID
 */
export const useEffectiveLandlordId = (): string | null => {
  const { effectiveLandlordId } = useImpersonation();
  return effectiveLandlordId;
};
