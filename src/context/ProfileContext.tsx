import { createContext, useCallback, useContext, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './AuthContext';
import { apiFetchProfile, apiSaveProfile, apiUploadAvatar } from '@/api/profile';
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
    queryFn: () => apiFetchProfile(user!.id),
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
  });

  const { mutateAsync: saveProfile } = useMutation({
    mutationFn: (data: Partial<Omit<Profile, 'id' | 'email' | 'updated_at'>>) =>
      apiSaveProfile(user!.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });

  const uploadAvatar = useCallback(
    (file: File) => apiUploadAvatar(user!.id, file),
    [user?.id],
  );

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      loading: isLoading,
      isComplete: profile?.onboarding_completed === true,
      saveProfile,
      uploadAvatar,
    }),
    [profile, isLoading, saveProfile, uploadAvatar],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
