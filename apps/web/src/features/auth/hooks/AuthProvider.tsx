import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { refreshSession, setSessionLostHandler } from '@/lib/apiClient';
import { tokenStore } from '@/lib/tokenStore';
import type { User } from '@/types/api';
import { authApi } from '../api/authApi';

interface AuthState {
  user: User | null;
  status: 'cargando' | 'autenticado' | 'anonimo';
  setSession: (token: string, user: User) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthState['status']>('cargando');
  const queryClient = useQueryClient();

  // Al abrir la app se intenta recuperar la sesión con la cookie httpOnly.
  useEffect(() => {
    refreshSession().then((data) => {
      if (data) {
        setUser(data.user as User);
        setStatus('autenticado');
      } else {
        setStatus('anonimo');
      }
    });
    setSessionLostHandler(() => {
      setUser(null);
      setStatus('anonimo');
      queryClient.clear();
    });
  }, [queryClient]);

  const setSession = useCallback((token: string, nextUser: User) => {
    tokenStore.set(token);
    setUser(nextUser);
    setStatus('autenticado');
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => undefined);
    tokenStore.set(null);
    setUser(null);
    setStatus('anonimo');
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(() => ({ user, status, setSession, logout }), [user, status, setSession, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return context;
}

export const homeFor = (role?: string) => (role === 'ADMIN' ? '/panel' : role === 'REPARTIDOR' ? '/repartidor' : '/app');
