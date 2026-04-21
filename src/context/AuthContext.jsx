import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const user = session?.user;
    if (!user?.id || !user?.email) return;

    const displayName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.user_metadata?.preferred_username ||
      user.email.split('@')[0];

    supabase
      .from('app_users')
      .upsert(
        {
          id: user.id,
          email: user.email,
          display_name: displayName,
          avatar_url: user.user_metadata?.avatar_url || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .then(({ error }) => {
        if (error) console.error('Failed to sync app user:', error.message);
      });
  }, [session]);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const signInWithGitHub = useCallback(async (nextPath = '/boards') => {
    const path = typeof nextPath === 'string' && nextPath.startsWith('/') ? nextPath : '/boards';
    const redirectTo = `${window.location.origin}${path}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo },
    });
    if (error) throw error;
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGitHub,
    }),
    [session, loading, signIn, signUp, signOut, signInWithGitHub]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
