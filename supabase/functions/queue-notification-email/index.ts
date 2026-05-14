import { createClient } from 'npm:@supabase/supabase-js@2'

interface CardData {
  id: string
  number?: number
}

interface ListData {
  cards?: CardData[]
}

interface BoardData {
  key?: string
  lists?: ListData[]
}

interface NotificationRecord {
  id: string
  user_email: string
  title: string
  body: string
  board_id: string | null
  card_id: string | null
  email_type: 'assigned' | 'comment' | 'mention' | null
  created_at: string
}

interface WebhookPayload {
  type: 'INSERT'
  table: string
  record: NotificationRecord
  schema: string
  old_record: null
}

const SEND_DELAY_MS = 5 * 60 * 1000
const BASE_URL = 'https://esperia-trello.pages.dev'

function dedupKey(n: NotificationRecord): string {
  const minute = n.created_at.slice(0, 16)
  if (n.email_type === 'assigned') return `assigned:${n.card_id}:${n.user_email}`
  if (n.email_type === 'comment') return `comment:${n.card_id}:${n.user_email}:${minute}`
  if (n.email_type === 'mention') return `mention:${n.card_id}:${n.user_email}:${minute}`
  return ''
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function emailHtml(heading: string, body: string, ctaUrl: string, ctaLabel: string): string {
  const h = escapeHtml(heading)
  const b = escapeHtml(body)
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);"><tr><td style="background:#18181b;padding:24px 32px;"><span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.5px;">Esperia Trello</span></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">${h}</p><p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">${b}</p><a href="${ctaUrl}" style="display:inline-block;background:#18181b;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">${ctaLabel}</a></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f4f4f5;"><p style="margin:0;font-size:12px;color:#a1a1aa;">You&rsquo;re receiving this because you&rsquo;re a member of an Esperia Trello workspace.</p></td></tr></table></td></tr></table></body></html>`
}

function buildEmail(
  n: NotificationRecord,
  cardUrl: string
): { subject: string; body_html: string } {
  switch (n.email_type) {
    case 'assigned':
      return {
        subject: `You've been assigned: ${n.title}`,
        body_html: emailHtml("You've been assigned to a card", n.body, cardUrl, 'Open Card'),
      }
    case 'comment':
      return {
        subject: `New comment: ${n.title}`,
        body_html: emailHtml('New comment on your card', n.body, cardUrl, 'View Comment'),
      }
    case 'mention':
      return {
        subject: `You were mentioned: ${n.title}`,
        body_html: emailHtml('You were mentioned in a comment', n.body, cardUrl, 'Open Card'),
      }
    default:
      return { subject: '', body_html: '' }
  }
}

Deno.serve(async (req) => {
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (secret && req.headers.get('x-webhook-secret') !== secret) {
    return new Response('unauthorized', { status: 401 })
  }
  try {
    const payload: WebhookPayload = await req.json()
    const n = payload.record

    if (!n.email_type) return new Response('skipped', { status: 200 })

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Board data (key, lists, cards) is stored as JSON in boards.data
    let cardUrl = `${BASE_URL}/boards`
    if (n.board_id) {
      const { data: boardRow } = await supabase
        .from('boards')
        .select('data')
        .eq('id', n.board_id)
        .single()

      const boardData = boardRow?.data as BoardData | null
      if (boardData?.key) {
        cardUrl = `${BASE_URL}/boards/${boardData.key}`
        if (n.card_id) {
          for (const list of boardData.lists ?? []) {
            const card = (list.cards ?? []).find((c) => c.id === n.card_id)
            if (card?.number != null) {
              cardUrl += `/${card.number}`
              break
            }
          }
        }
      }
    }

    const { subject, body_html } = buildEmail(n, cardUrl)
    const dedup_key = dedupKey(n)
    const send_after = new Date(Date.now() + SEND_DELAY_MS).toISOString()

    const { error } = await supabase
      .from('pending_email_queue')
      .upsert(
        { dedup_key, recipient_email: n.user_email, subject, body_html, send_after },
        { onConflict: 'dedup_key' }
      )

    if (error) {
      console.error('queue_email_failed', error)
      return new Response('error', { status: 500 })
    }

    return new Response('queued', { status: 200 })
  } catch (err) {
    console.error('queue_email_exception', err)
    return new Response('error', { status: 500 })
  }
})
