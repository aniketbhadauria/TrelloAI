import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/logger';
import type { Profile } from '@/types/profile';

interface ProfileContextValue {
  profile: Profile | null;
  loading: boolean;
  isComplete: boolean;
  saveProfile: (data: Partial<Omit<Profile, 'id' | 'email' | 'updated_at'>>) => Promise<void>;
  uploadAvatar: (file: File) => Promise<string>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('app_users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      logError('profile_fetch_failed', { message: error.message, userId });
    }
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const saveProfile = useCallback(async (
    data: Partial<Omit<Profile, 'id' | 'email' | 'updated_at'>>,
  ) => {
    if (!user?.id) throw new Error('Not authenticated');
    const { error } = await supabase
      .from('app_users')
      .update({ ...data, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    if (error) {
      logError('profile_save_failed', { message: error.message });
      throw error;
    }
    await fetchProfile(user.id);
  }, [user?.id, fetchProfile]);

  const uploadAvatar = useCallback(async (file: File): Promise<string> => {
    if (!user?.id) throw new Error('Not authenticated');
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) {
      logError('avatar_upload_failed', { message: error.message });
      throw error;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }, [user?.id]);

  const value = useMemo<ProfileContextValue>(() => ({
    profile,
    loading,
    isComplete: profile?.onboarding_completed === true,
    saveProfile,
    uploadAvatar,
  }), [profile, loading, saveProfile, uploadAvatar]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
