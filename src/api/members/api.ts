import { supabase } from '@/lib/supabase'
import { logError, logInfo } from '@/lib/logger'
import type { BoardRole, BoardMember } from '@/types/board'

export type { BoardMember }

export interface AppUserResult {
  id: string
  display_name: string | null
  first_name: string | null
  last_name: string | null
  email: string | null
  avatar_url: string | null
}

export async function apiSearchUsers(query: string): Promise<AppUserResult[]> {
  const q = query.trim()
  if (!q) return []
  const { data, error } = await supabase
    .from('app_users')
    .select('id, display_name, first_name, last_name, email, avatar_url')
    .or(
      `display_name.ilike.%${q}%,email.ilike.%${q}%,first_name.ilike.%${q}%,last_name.ilike.%${q}%`
    )
    .limit(10)
  if (error) {
    logError('members_search_failed', { message: error.message, query: q })
    return []
  }
  logInfo('members_searched', { query: q, count: (data || []).length })
  return (data || []).map((u) => {
    const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ')
    return { ...u, display_name: fullName || u.display_name || u.email || 'Unknown User' }
  })
}

export async function apiInviteMember(
  boardId: string,
  userId: string,
  role: BoardRole
): Promise<void> {
  const { error } = await supabase
    .from('board_members')
    .insert({ board_id: boardId, user_id: userId, role })
  if (error) {
    logError('member_invite_failed', { boardId, userId, message: error.message })
    throw error
  }
  logInfo('member_invited', { boardId, userId, role })
}

export async function apiFetchBoardMembers(boardId: string): Promise<BoardMember[]> {
  const [{ data: boardRow }, { data: memberRows, error }] = await Promise.all([
    supabase.from('boards').select('owner_id').eq('id', boardId).maybeSingle(),
    supabase.from('board_members').select('user_id, role').eq('board_id', boardId),
  ])

  if (error) {
    logError('members_fetch_failed', { boardId, message: error.message })
    return []
  }

  const userIds = (memberRows || []).map((m) => m.user_id as string)
  if (boardRow?.owner_id) userIds.push(boardRow.owner_id)

  const { data: profiles } = await supabase
    .from('app_users')
    .select('id, display_name, first_name, last_name, email, avatar_url')
    .in('id', userIds)

  const profileMap: Record<
    string,
    { display_name: string | null; email: string | null; avatar_url: string | null }
  > = {}
  ;(profiles || []).forEach((p) => {
    const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ')
    profileMap[p.id] = {
      display_name: fullName || p.display_name || p.email || 'Unknown User',
      email: p.email,
      avatar_url: p.avatar_url,
    }
  })

  const members: BoardMember[] = (memberRows || []).map((row) => {
    const p = profileMap[row.user_id as string]
    return {
      userId: row.user_id as string,
      role: row.role as BoardRole,
      display_name: p?.display_name || null,
      email: p?.email || null,
      avatar_url: p?.avatar_url || null,
    }
  })

  if (boardRow?.owner_id && !members.some((m) => m.userId === boardRow.owner_id)) {
    const p = profileMap[boardRow.owner_id]
    members.unshift({
      userId: boardRow.owner_id,
      role: 'owner',
      display_name: p?.display_name || null,
      email: p?.email || null,
      avatar_url: p?.avatar_url || null,
    })
  }

  return members
}

export async function apiRemoveMember(boardId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId)
  if (error) {
    logError('member_remove_failed', { boardId, userId, message: error.message })
    throw error
  }
  logInfo('member_removed', { boardId, userId })
}

export async function apiUpdateMemberRole(
  boardId: string,
  userId: string,
  role: BoardRole
): Promise<void> {
  const { error } = await supabase
    .from('board_members')
    .update({ role })
    .eq('board_id', boardId)
    .eq('user_id', userId)
  if (error) {
    logError('member_role_update_failed', { boardId, userId, role, message: error.message })
    throw error
  }
  logInfo('member_role_updated', { boardId, userId, role })
}
