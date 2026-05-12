import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import type { BoardRole } from '@/types/board';

export interface AppUserResult {
  id: string;
  display_name: string | null;
  email: string | null;
}

export async function apiSearchUsers(query: string): Promise<AppUserResult[]> {
  const { data, error } = await supabase
    .from('app_users')
    .select('id, display_name, email')
    .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);
  if (error) {
    logError('member_search_failed', { message: error.message, query });
    return [];
  }
  logInfo('member_search', { query, resultCount: (data || []).length });
  return data || [];
}

export async function apiInviteMember(
  boardId: string,
  userId: string,
  role: BoardRole,
): Promise<void> {
  const { error } = await supabase
    .from('board_members')
    .insert({ board_id: boardId, user_id: userId, role });
  if (error) {
    logError('member_invite_failed', { boardId, userId, message: error.message });
    throw error;
  }
  logInfo('member_invited', { boardId, userId, role });
}
