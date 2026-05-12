import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { logError, logInfo } from '../lib/logger';

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
      })
      .catch(err => logError('getSession failed', err));

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

    supabase
      .from('app_users')
      .upsert(
        {
          id: user.id,
          email: user.email,
          display_name: displayName,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .then(({ error }) => {
        if (error) logError('Failed to sync app_user', { message: error.message });
        else logInfo('app_user_synced', { userId: user.id });
      });
  }, [session]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { logError('sign_in_failed', { message: error.message }); throw error; }
    logInfo('sign_in_success', { userId: data.user?.id });
    return data;
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { logError('sign_up_failed', { message: error.message }); throw error; }
    logInfo('sign_up_success', { userId: data.user?.id });
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) { logError('sign_out_failed', { message: error.message }); throw error; }
    logInfo('sign_out_success');
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
    }),
    [session, loading, signIn, signUp, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
