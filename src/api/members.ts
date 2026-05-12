import { supabase } from '@/lib/supabase';
import { logError, logInfo } from '@/lib/logger';
import type { BoardRole } from '@/types/board';

export interface AppUserResult {
  id: string;
  display_name: string | null;
  email: string | null;
}

export async function apiSearchUsers(query: string): Promise<AppUserResult[]> {
  const q = query.trim();
  if (!q) return [];
  const { data, error } = await supabase
    .from('app_users')
    .select('id, display_name, email')
    .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
    .limit(10);
  if (error) { logError('members_search_failed', { message: error.message, query: q }); return []; }
  logInfo('members_searched', { query: q, count: (data || []).length });
  return data || [];
}

export async function apiInviteMember(boardId: string, userId: string, role: BoardRole): Promise<void> {
  const { error } = await supabase.from('board_members').insert({ board_id: boardId, user_id: userId, role });
  if (error) {
    logError('member_invite_failed', { boardId, userId, message: error.message });
    throw error;
  }
  logInfo('member_invited', { boardId, userId, role });
}

export async function apiFetchBoardMembers(boardId: string): Promise<Array<{
  userId: string;
  role: BoardRole;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}>> {
  const { data, error } = await supabase
    .from('board_members')
    .select('user_id, role, app_users(display_name, email, avatar_url)')
    .eq('board_id', boardId);
  if (error) { logError('members_fetch_failed', { boardId, message: error.message }); return []; }
  return (data || []).map((row: Record<string, unknown>) => {
    const u = row.app_users as Record<string, unknown> | null;
    return {
      userId: row.user_id as string,
      role: row.role as BoardRole,
      display_name: u?.display_name as string | null,
      email: u?.email as string | null,
      avatar_url: u?.avatar_url as string | null,
    };
  });
}

export async function apiRemoveMember(boardId: string, userId: string): Promise<void> {
  const { error } = await supabase.from('board_members').delete().eq('board_id', boardId).eq('user_id', userId);
  if (error) { logError('member_remove_failed', { boardId, userId, message: error.message }); throw error; }
  logInfo('member_removed', { boardId, userId });
}
