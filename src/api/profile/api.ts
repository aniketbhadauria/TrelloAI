import { supabase } from '@/lib/supabase'
import { logError, logInfo } from '@/lib/logger'
import type { Profile } from '@/types/profile'

export async function apiFetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from('app_users').select('*').eq('id', userId).single()
  if (error && error.code !== 'PGRST116') {
    logError('profile_fetch_failed', { message: error.message, userId })
  } else if (data) {
    logInfo('profile_fetched', { userId })
  }
  return (data as Profile) ?? null
}

export async function apiSaveProfile(
  userId: string,
  updates: Partial<Omit<Profile, 'id' | 'email' | 'updated_at'>>
): Promise<void> {
  const { error } = await supabase
    .from('app_users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
  if (error) {
    logError('profile_save_failed', { message: error.message, userId })
    throw error
  }
  logInfo('profile_saved', { userId })
}

export async function apiUploadAvatar(userId: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar.${ext}`
  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (error) {
    logError('avatar_upload_failed', { message: error.message, userId })
    throw error
  }
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  logInfo('avatar_uploaded', { userId, path })
  return data.publicUrl
}
