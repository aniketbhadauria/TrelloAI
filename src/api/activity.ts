import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logger'
import type { ActivityEntry, ActivityType } from '@/types/board'

interface InsertActivityParams {
  boardId: string
  cardId: string
  actorEmail: string
  actorName: string
  actorAvatar?: string
  type: ActivityType
  payload?: Record<string, string>
}

export async function apiInsertActivity(params: InsertActivityParams): Promise<void> {
  const { error } = await supabase.from('card_activity').insert({
    board_id: params.boardId,
    card_id: params.cardId,
    actor_email: params.actorEmail,
    actor_name: params.actorName,
    actor_avatar: params.actorAvatar,
    type: params.type,
    payload: params.payload ?? {},
  })
  if (error) logError('activity_insert_failed', { type: params.type, message: error.message })
}

export async function apiFetchActivity(boardId: string, cardId: string): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from('card_activity')
    .select('*')
    .eq('board_id', boardId)
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })
  if (error) {
    logError('activity_fetch_failed', { boardId, cardId, message: error.message })
    return []
  }
  return (data || []).map((row) => ({
    id: row.id as string,
    boardId: row.board_id as string,
    cardId: row.card_id as string,
    actorEmail: row.actor_email as string,
    actorName: row.actor_name as string,
    actorAvatar: row.actor_avatar as string,
    type: row.type as ActivityType,
    payload: row.payload as Record<string, string>,
    createdAt: row.created_at as string,
  }))
}
