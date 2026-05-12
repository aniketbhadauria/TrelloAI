import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  const qc = useQueryClient();

  const { data: profile = null, isLoading } = useQuery<Profile | null>({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user!.id)
        .single();
      if (error && error.code !== 'PGRST116') {
        logError('profile_fetch_failed', { message: error.message });
      }
      return (data as Profile) ?? null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const { mutateAsync: saveProfile } = useMutation({
    mutationFn: async (data: Partial<Omit<Profile, 'id' | 'email' | 'updated_at'>>) => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('app_users')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', user.id);
      if (error) {
        logError('profile_save_failed', { message: error.message });
        throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });

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
    loading: isLoading,
    isComplete: profile?.onboarding_completed === true,
    saveProfile,
    uploadAvatar,
  }), [profile, isLoading, saveProfile, uploadAvatar]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
