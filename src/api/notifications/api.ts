import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logger'

export async function cancelPendingEmail(dedupKey: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_pending_email', { p_dedup_key: dedupKey })
  if (error) logError('cancel_pending_email_failed', { dedupKey, message: error.message })
}
