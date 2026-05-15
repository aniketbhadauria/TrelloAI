import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logger'

export interface Notification {
  id: string
  user_email: string
  title: string
  body: string
  board_id: string | null
  card_id: string | null
  read: boolean
  created_at: string
}

export interface SendNotificationParams {
  userEmail: string
  title: string
  body?: string
  boardId?: string | null
  cardId?: string | null
  email_type?: 'assigned' | 'comment' | 'mention'
}

export async function apiFetchNotifications(userEmail: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_email', userEmail)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) {
    logError('Failed to load notifications', { message: error.message })
    return []
  }
  return (data as Notification[]) || []
}

export async function apiMarkNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) logError('Failed to mark notification read', { message: error.message })
}

export async function apiMarkAllNotificationsRead(userEmail: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_email', userEmail)
    .eq('read', false)
  if (error) logError('Failed to mark all notifications read', { message: error.message })
}

export async function apiClearAllNotifications(userEmail: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('user_email', userEmail)
  if (error) logError('Failed to clear notifications', { message: error.message })
}

export async function sendNotification({
  userEmail,
  title,
  body = '',
  boardId = null,
  cardId = null,
  email_type,
}: SendNotificationParams): Promise<void> {
  const { error } = await supabase.from('notifications').insert({
    user_email: userEmail,
    title,
    body,
    board_id: boardId,
    card_id: cardId,
    email_type: email_type ?? null,
  })
  if (error) logError('Failed to send notification', { message: error.message })
}

export async function cancelPendingEmail(dedupKey: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_pending_email', { p_dedup_key: dedupKey })
  if (error) logError('cancel_pending_email_failed', { dedupKey, message: error.message })
}
