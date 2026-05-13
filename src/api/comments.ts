import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logger'
import type { CardComment } from '@/types/board'
import type { JSONContent } from '@tiptap/core'

export async function apiAddComment(
  boardId: string,
  cardId: string,
  authorEmail: string,
  authorName: string,
  content: JSONContent,
  authorAvatar?: string
): Promise<CardComment | null> {
  const { data, error } = await supabase
    .from('card_comments')
    .insert({
      board_id: boardId,
      card_id: cardId,
      author_email: authorEmail,
      author_name: authorName,
      author_avatar: authorAvatar,
      content,
    })
    .select()
    .single()
  if (error) {
    logError('comment_add_failed', { boardId, cardId, message: error.message })
    return null
  }
  return {
    id: data.id as string,
    boardId: data.board_id as string,
    cardId: data.card_id as string,
    authorEmail: data.author_email as string,
    authorName: data.author_name as string,
    authorAvatar: data.author_avatar as string,
    content: data.content as Record<string, unknown>,
    createdAt: data.created_at as string,
  }
}

export async function apiFetchComments(boardId: string, cardId: string): Promise<CardComment[]> {
  const { data, error } = await supabase
    .from('card_comments')
    .select('*')
    .eq('board_id', boardId)
    .eq('card_id', cardId)
    .order('created_at', { ascending: true })
  if (error) {
    logError('comments_fetch_failed', { boardId, cardId, message: error.message })
    return []
  }
  return (data || []).map((row) => ({
    id: row.id as string,
    boardId: row.board_id as string,
    cardId: row.card_id as string,
    authorEmail: row.author_email as string,
    authorName: row.author_name as string,
    authorAvatar: row.author_avatar as string,
    content: row.content as Record<string, unknown>,
    createdAt: row.created_at as string,
  }))
}

export async function apiDeleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('card_comments').delete().eq('id', commentId)
  if (error) logError('comment_delete_failed', { commentId, message: error.message })
}

export async function apiUpdateComment(commentId: string, content: JSONContent): Promise<void> {
  const { error } = await supabase.from('card_comments').update({ content }).eq('id', commentId)
  if (error) logError('comment_update_failed', { commentId, message: error.message })
}
