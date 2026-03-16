import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { apiClient } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name?: string;
  [key: string]: unknown;
}

interface Session {
  access_token: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, metadata: { full_name: string; company_name: string; phone: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      if (!apiClient.getToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const data = await apiClient.get<{ user: User }>('/api/auth/user');
        setUser(data.user);
      } catch {
        apiClient.removeToken();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchCurrentUser();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiClient.post<{ token: string; user: User }>('/api/auth/login', { email, password });
      apiClient.setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    metadata: { full_name: string; company_name: string; phone: string }
  ) => {
    try {
      const data = await apiClient.post<{ token: string; user: User }>('/api/auth/register', {
        email,
        password,
        ...metadata,
      });
      apiClient.setToken(data.token);
      setUser(data.user);
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      apiClient.removeToken();
      setUser(null);
    }
  };

  const token = apiClient.getToken();
  const session: Session | null = user && token ? { access_token: token } : null;

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
