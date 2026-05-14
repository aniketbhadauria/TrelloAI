# Resend Email Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire Resend as Supabase SMTP for auth emails and build a 5-minute delayed, cancellable notification email system for card assignments, comments, and @mentions.

**Architecture:** Supabase DB webhook fires `queue-notification-email` on `notifications` INSERT; the function writes to `pending_email_queue` with `send_after = now() + 5min`. A `Deno.cron` Edge Function runs every minute to send due emails via Resend. Reversals (unassign) call a `SECURITY DEFINER` RPC to delete the matching pending row before it sends. Board data is stored as JSON in `boards.data` — the Edge Function parses it to build deep-link URLs.

**Tech Stack:** Supabase Edge Functions (Deno), Resend SDK (`npm:resend`), Supabase DB webhooks, Supabase MCP / CLI, Vite + React frontend

---

## File Map

**New files:**

- `supabase/functions/queue-notification-email/index.ts` — webhook handler, queues emails
- `supabase/functions/process-email-queue/index.ts` — Deno.cron, sends due emails via Resend
- `src/api/notifications/api.ts` — `cancelPendingEmail` RPC call
- `src/api/notifications/index.ts` — barrel export

**Modified files:**

- `src/context/NotificationContext.tsx` — add `email_type` to `SendNotificationParams` and insert
- `src/api/index.ts` — add notifications export
- `src/features/cards/CardDetailModal.tsx` — wire `email_type` on assign/comment/mention; call `cancelPendingEmail` on unassign

---

## Task 1: Configure Resend SMTP

Manual setup. No code. This immediately fixes the auth email rate limit.

- [ ] Create a Resend account at resend.com if you don't have one.
- [ ] In Resend: add and verify domain `esperiastudio.com` (Domains → Add domain → follow DNS instructions).
- [ ] In Resend: create an API key (API Keys → Create API Key). Save it — you'll need it in Task 7.
- [ ] In Supabase Dashboard → Project Settings → Auth → SMTP Settings:
  - Enable Custom SMTP: **ON**
  - Host: `smtp.resend.com`
  - Port: `465`
  - Username: `resend`
  - Password: _(your Resend API key)_
  - Sender name: `Esperia Trello`
  - Sender email: `noreply@esperiastudio.com`
- [ ] Save.
- [ ] Smoke-test: attempt signup at `/signup` — confirm confirmation email arrives with no rate limit error.

---

## Task 2: Run DB migrations

Run all three SQL statements via the Supabase MCP tool or Supabase Dashboard → SQL Editor.

- [ ] **Migration 1 — add `email_type` to `notifications`:**

```sql
alter table notifications
  add column if not exists email_type text
  check (email_type in ('assigned', 'comment', 'mention'));
```

- [ ] **Migration 2 — create `pending_email_queue`:**

```sql
create table if not exists pending_email_queue (
  id              uuid primary key default gen_random_uuid(),
  dedup_key       text not null unique,
  recipient_email text not null,
  subject         text not null,
  body_html       text not null,
  send_after      timestamptz not null,
  created_at      timestamptz not null default now()
);

alter table pending_email_queue enable row level security;
```

- [ ] **Migration 3 — create cancellation RPC:**

```sql
create or replace function cancel_pending_email(p_dedup_key text)
returns void
language sql
security definer
set search_path = public
as $$
  delete from pending_email_queue where dedup_key = p_dedup_key;
$$;
```

- [ ] Verify: `select * from pending_email_queue;` — returns empty, no error.

---

## Task 3: Configure auth email templates

Manual setup in Supabase Dashboard → Authentication → Email Templates. No code.

- [ ] Select **Confirm signup** → set Subject to `Confirm your Esperia Trello account` → replace body HTML with:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>
  <body
    style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
  >
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table
            width="560"
            cellpadding="0"
            cellspacing="0"
            style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);"
          >
            <tr>
              <td style="background:#18181b;padding:24px 32px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.5px;"
                  >Esperia Trello</span
                >
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">
                  Confirm your account
                </p>
                <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                  Click the button below to confirm your email address and get started.
                </p>
                <a
                  href="{{ .ConfirmationURL }}"
                  style="display:inline-block;background:#18181b;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;"
                  >Confirm Email</a
                >
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #f4f4f5;">
                <p style="margin:0;font-size:12px;color:#a1a1aa;">
                  If you didn&rsquo;t create an account, you can ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

- [ ] Select **Reset Password** → set Subject to `Reset your Esperia Trello password` → replace body HTML with:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  </head>
  <body
    style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"
  >
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
      <tr>
        <td align="center">
          <table
            width="560"
            cellpadding="0"
            cellspacing="0"
            style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);"
          >
            <tr>
              <td style="background:#18181b;padding:24px 32px;">
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.5px;"
                  >Esperia Trello</span
                >
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">
                  Reset your password
                </p>
                <p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">
                  Click the button below to reset your password. This link expires in 1 hour.
                </p>
                <a
                  href="{{ .ConfirmationURL }}"
                  style="display:inline-block;background:#18181b;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;"
                  >Reset Password</a
                >
              </td>
            </tr>
            <tr>
              <td style="padding:16px 32px;border-top:1px solid #f4f4f5;">
                <p style="margin:0;font-size:12px;color:#a1a1aa;">
                  If you didn&rsquo;t request a password reset, you can ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
```

- [ ] Save both templates.

---

## Task 4: Initialize Supabase CLI and create function directories

- [ ] Check if `supabase/` already exists: `ls supabase/` — if it does, skip the init step.
- [ ] If not present: `pnpm dlx supabase init`
- [ ] Link to your project (get the ref from Supabase Dashboard → Project Settings → General → Reference ID):
  ```bash
  pnpm dlx supabase link --project-ref <YOUR_PROJECT_REF>
  ```
- [ ] Create Edge Function directories:
  ```bash
  mkdir -p supabase/functions/queue-notification-email
  mkdir -p supabase/functions/process-email-queue
  ```

---

## Task 5: Create `queue-notification-email` Edge Function

**Create:** `supabase/functions/queue-notification-email/index.ts`

Note: board data including `key`, `lists`, and `cards[].number` is stored as JSON in `boards.data` — not as normalized SQL tables. The function parses this blob to build the card deep-link URL.

- [ ] Create `supabase/functions/queue-notification-email/index.ts`:

```typescript
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

function emailHtml(heading: string, body: string, ctaUrl: string, ctaLabel: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);"><tr><td style="background:#18181b;padding:24px 32px;"><span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:-0.5px;">Esperia Trello</span></td></tr><tr><td style="padding:32px;"><p style="margin:0 0 8px;font-size:20px;font-weight:600;color:#18181b;">${heading}</p><p style="margin:0 0 24px;font-size:14px;color:#71717a;line-height:1.6;">${body}</p><a href="${ctaUrl}" style="display:inline-block;background:#18181b;color:#ffffff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">${ctaLabel}</a></td></tr><tr><td style="padding:16px 32px;border-top:1px solid #f4f4f5;"><p style="margin:0;font-size:12px;color:#a1a1aa;">You&rsquo;re receiving this because you&rsquo;re a member of an Esperia Trello workspace.</p></td></tr></table></td></tr></table></body></html>`
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
```

- [ ] Deploy:

  ```bash
  pnpm dlx supabase functions deploy queue-notification-email --no-verify-jwt
  ```

  Expected: `Deployed Function queue-notification-email`

- [ ] Commit:
  ```bash
  git add supabase/functions/queue-notification-email/
  git commit -m "feat: add queue-notification-email Edge Function"
  ```

---

## Task 6: Create `process-email-queue` Edge Function

**Create:** `supabase/functions/process-email-queue/index.ts`

- [ ] Create `supabase/functions/process-email-queue/index.ts`:

```typescript
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
```

- [ ] Deploy:

  ```bash
  pnpm dlx supabase functions deploy process-email-queue --no-verify-jwt
  ```

  Expected: `Deployed Function process-email-queue`

- [ ] Commit:
  ```bash
  git add supabase/functions/process-email-queue/
  git commit -m "feat: add process-email-queue Edge Function with Deno.cron"
  ```

---

## Task 7: Set `RESEND_API_KEY` secret

- [ ] Set the secret (use the API key from Task 1):

  ```bash
  pnpm dlx supabase secrets set RESEND_API_KEY=<YOUR_RESEND_API_KEY>
  ```

  Expected: `Finished supabase secrets set`

- [ ] Verify:
  ```bash
  pnpm dlx supabase secrets list
  ```
  Expected: `RESEND_API_KEY` appears in the list.

---

## Task 8: Configure Supabase DB webhook

Manual setup. No code.

- [ ] Go to Supabase Dashboard → Database → Webhooks → Create a new webhook.
- [ ] Fill in:
  - Name: `on_notification_insert`
  - Table: `notifications`
  - Events: **Insert** only
  - Type: **Supabase Edge Functions**
  - Edge Function: `queue-notification-email`
  - HTTP Headers: `Authorization: Bearer <your Supabase anon key>` (from Project Settings → API → `anon` `public` key)
- [ ] Save.
- [ ] Confirm `on_notification_insert` appears as active in the webhook list.

---

## Task 9: Extend `sendNotification` with `email_type`

**Modify:** `src/context/NotificationContext.tsx`

- [ ] Update `SendNotificationParams` (currently at line 26):

```typescript
export interface SendNotificationParams {
  userEmail: string
  title: string
  body?: string
  boardId?: string | null
  cardId?: string | null
  email_type?: 'assigned' | 'comment' | 'mention'
}
```

- [ ] Update the `sendNotification` function (currently at line 132) to pass `email_type` into the insert:

```typescript
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
```

- [ ] Run: `pnpm tsc --noEmit` — expect no new errors.
- [ ] Commit:
  ```bash
  git add src/context/NotificationContext.tsx
  git commit -m "feat: add email_type to sendNotification"
  ```

---

## Task 10: Create `src/api/notifications/` domain

**Create:** `src/api/notifications/api.ts`, `src/api/notifications/index.ts`
**Modify:** `src/api/index.ts`

- [ ] Create `src/api/notifications/api.ts`:

```typescript
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logger'

export async function cancelPendingEmail(dedupKey: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_pending_email', { p_dedup_key: dedupKey })
  if (error) logError('cancel_pending_email_failed', { dedupKey, message: error.message })
}
```

- [ ] Create `src/api/notifications/index.ts`:

```typescript
export * from './api'
```

- [ ] Add to `src/api/index.ts` (after the existing `export * from './cards'` line):

```typescript
export * from './notifications'
```

- [ ] Run: `pnpm tsc --noEmit` — expect no errors.
- [ ] Commit:
  ```bash
  git add src/api/notifications/ src/api/index.ts
  git commit -m "feat: add cancelPendingEmail API"
  ```

---

## Task 11: Update `CardDetailModal.tsx` call sites

**Modify:** `src/features/cards/CardDetailModal.tsx`

Four changes in this file.

- [ ] **Change 1 — add `cancelPendingEmail` import** at the top of the file alongside the other `@/api` imports. The file already imports from `@/context/NotificationContext`; add:

```typescript
import { cancelPendingEmail } from '@/api'
```

- [ ] **Change 2 — update `notifyAssignedMembers`** (currently at line ~186) to accept and forward `email_type`:

Replace:

```typescript
const notifyAssignedMembers = (excludeEmail: string, title: string, body: string) => {
  for (const assignedMember of card.members ?? []) {
    const member = boardMembers.find((m) => m.userId === assignedMember.id)
    if (member?.email && member.email !== excludeEmail) {
      void sendNotification({ userEmail: member.email, title, body, boardId, cardId })
    }
  }
}
```

With:

```typescript
const notifyAssignedMembers = (
  excludeEmail: string,
  title: string,
  body: string,
  email_type?: 'comment' | 'mention'
) => {
  for (const assignedMember of card.members ?? []) {
    const member = boardMembers.find((m) => m.userId === assignedMember.id)
    if (member?.email && member.email !== excludeEmail) {
      void sendNotification({ userEmail: member.email, title, body, boardId, cardId, email_type })
    }
  }
}
```

- [ ] **Change 3 — pass `'comment'` to `notifyAssignedMembers`** in `handleAddComment` (currently at line ~238):

Replace:

```typescript
notifyAssignedMembers(
  actorEmail,
  `${cardTitle} — ${boardTitle}`,
  `${actorName} commented: ${plain.slice(0, 80)}`
)
```

With:

```typescript
notifyAssignedMembers(
  actorEmail,
  `${cardTitle} — ${boardTitle}`,
  `${actorName} commented: ${plain.slice(0, 80)}`,
  'comment'
)
```

- [ ] **Change 4 — add `email_type: 'mention'` to both @mention `sendNotification` calls.**

At line ~248 (new comment mentions):

```typescript
void sendNotification({
  userEmail: member.email,
  title: `@mention — ${boardTitle}`,
  body: `${actorName} mentioned you in a comment on ${cardTitle}`,
  boardId,
  cardId,
  email_type: 'mention',
})
```

At line ~297 (edited comment mentions):

```typescript
void sendNotification({
  userEmail: member.email,
  title: `@mention — ${boardTitle}`,
  body: `${actorName} mentioned you in an edited comment on ${cardTitle}`,
  boardId,
  cardId,
  email_type: 'mention',
})
```

- [ ] **Change 5 — wire `email_type: 'assigned'` on assign and `cancelPendingEmail` on unassign** (currently at lines ~503–523):

Replace:

```typescript
if (member.email && member.email !== actorEmail) {
  const boardTitle = board?.title ?? ''
  const cardTitle = card.title
  if (isAssigned) {
    void sendNotification({
      userEmail: member.email,
      title: `${cardTitle} — ${boardTitle}`,
      body: `${actorName} removed you from this card`,
      boardId,
      cardId,
    })
  } else {
    void sendNotification({
      userEmail: member.email,
      title: `${cardTitle} — ${boardTitle}`,
      body: `${actorName} assigned you to this card`,
      boardId,
      cardId,
    })
  }
}
```

With:

```typescript
if (member.email && member.email !== actorEmail) {
  const boardTitle = board?.title ?? ''
  const cardTitle = card.title
  if (isAssigned) {
    void cancelPendingEmail(`assigned:${cardId}:${member.email}`)
    void sendNotification({
      userEmail: member.email,
      title: `${cardTitle} — ${boardTitle}`,
      body: `${actorName} removed you from this card`,
      boardId,
      cardId,
    })
  } else {
    void sendNotification({
      userEmail: member.email,
      title: `${cardTitle} — ${boardTitle}`,
      body: `${actorName} assigned you to this card`,
      boardId,
      cardId,
      email_type: 'assigned',
    })
  }
}
```

- [ ] Run: `pnpm tsc --noEmit` — expect no errors.
- [ ] Run: `pnpm lint` — expect no errors.
- [ ] Commit:
  ```bash
  git add src/features/cards/CardDetailModal.tsx
  git commit -m "feat: wire email notifications in CardDetailModal"
  ```

---

## Task 12: Smoke test

- [ ] Start dev server: `pnpm dev`
- [ ] **Auth email**: Sign up with a real `@esperiastudio.com` address → confirm branded confirmation email arrives via Resend, no rate limit error.
- [ ] **Assignment email**: Assign a card to a teammate → wait 5 minutes → confirm they receive the "You've been assigned" email with a working deep-link to the card.
- [ ] **Cancellation**: Assign a card to a teammate, then immediately unassign them (within 5 minutes) → wait 5 minutes → confirm they do NOT receive any email. Verify `pending_email_queue` is empty via Supabase Dashboard → Table Editor.
- [ ] **Comment email**: Add a comment to a card that has other assigned members → wait 5 minutes → confirm assigned members (excluding the commenter) receive the "New comment" email.
- [ ] **@mention email**: @mention a board member in a comment → wait 5 minutes → confirm they receive the "You were mentioned" email.
- [ ] Check Resend Dashboard → Emails to confirm all sent emails show `Delivered` status.
