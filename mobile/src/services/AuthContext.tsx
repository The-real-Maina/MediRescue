
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

import { authStorage, type AuthUser } from '@/services/authStorage';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    try {
      const [savedToken, savedUser] = await Promise.all([
        authStorage.getToken(),
        authStorage.getUser(),
      ]);

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(savedUser);
      } else {
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Unable to restore MediRescue session:', error);
      setToken(null);
      setUser(null);
    }
  }, []);

  const signOut = useCallback(async () => {
    await authStorage.clearSession();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const initializeSession = async () => {
      try {
        await refreshSession();
      } finally {
        setLoading(false);
      }
    };

    initializeSession();
  }, [refreshSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        refreshSession,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }

  return context;
}
