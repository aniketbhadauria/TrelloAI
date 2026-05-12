import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import type { Session, User } from '@supabase/supabase-js';

export interface AuthResult {
  user: User | null;
  session: Session | null;
}

export async function apiSignIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { logError('sign_in_failed', { message: error.message }); throw error; }
  logInfo('sign_in_success', { userId: data.user?.id });
  return data;
}

export async function apiSignUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) { logError('sign_up_failed', { message: error.message }); throw error; }
  logInfo('sign_up_success', { userId: data.user?.id });
  return data;
}

export async function apiSignOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) { logError('sign_out_failed', { message: error.message }); throw error; }
  logInfo('sign_out_success');
}

export async function apiSyncAppUser(userId: string, email: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from('app_users')
    .upsert(
      { id: userId, email, display_name: displayName, updated_at: new Date().toISOString() },
      { onConflict: 'id' },
    );
  if (error) logError('app_user_sync_failed', { message: error.message, userId });
  else logInfo('app_user_synced', { userId });
}
