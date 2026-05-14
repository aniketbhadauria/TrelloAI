import { createClient } from 'npm:@supabase/supabase-js@2'
import { Resend } from 'npm:resend'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const resend = new Resend(Deno.env.get('RESEND_API_KEY')!)

Deno.cron('process email queue', '* * * * *', async () => {
  const { data: rows, error } = await supabase
    .from('pending_email_queue')
    .select('*')
    .lte('send_after', new Date().toISOString())
    .limit(50)

  if (error) {
    console.error('fetch_queue_failed', error)
    return
  }

  if (!rows?.length) return

  for (const row of rows) {
    try {
      await resend.emails.send({
        from: 'Esperia Trello <noreply@esperiastudio.com>',
        to: row.recipient_email,
        subject: row.subject,
        html: row.body_html,
      })
    } catch (err) {
      console.error('send_email_failed', { id: row.id, error: err })
    }
    // Delete regardless of send outcome — no retry loop to prevent runaway sends
    await supabase.from('pending_email_queue').delete().eq('id', row.id)
  }
})

// HTTP handler required for Edge Function deployment
Deno.serve(() => new Response('ok'))
