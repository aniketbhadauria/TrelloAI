import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logInfo } from '../lib/logger';
import { apiSignIn, apiSignUp, apiSignOut, apiSyncAppUser } from '@/api/auth';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signUp: (email: string, password: string) => Promise<{ user: User | null; session: Session | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session: s } }) => {
        setSession(s);
        setLoading(false);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === 'SIGNED_IN') logInfo('auth_signed_in', { userId: s?.user.id });
      if (event === 'SIGNED_OUT') logInfo('auth_signed_out');
      if (event === 'TOKEN_REFRESHED') logInfo('auth_token_refreshed', { userId: s?.user.id });
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user?.id || !user?.email) return;

    const displayName =
      (user.user_metadata?.['full_name'] as string | undefined) ||
      (user.user_metadata?.['name'] as string | undefined) ||
      (user.user_metadata?.['preferred_username'] as string | undefined) ||
      user.email.split('@')[0];

    apiSyncAppUser(user.id, user.email, displayName);
  }, [session]);

  const signIn = useCallback(
    (email: string, password: string) => apiSignIn(email, password),
    [],
  );

  const signUp = useCallback(
    (email: string, password: string) => apiSignUp(email, password),
    [],
  );

  const signOut = useCallback(() => apiSignOut(), []);

  const value = useMemo(
    () => ({ session, user: session?.user ?? null, loading, signIn, signUp, signOut }),
    [session, loading, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
