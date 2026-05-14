# Resend Email Integration & Notification Emails

**Date:** 2026-05-14
**Status:** Approved

## Overview

Two distinct concerns solved together:

1. **Auth emails** — replace Supabase's rate-limited shared SMTP with Resend as a custom SMTP provider. Fixes the "email rate limit exceeded" error on signup/password reset. Zero code changes.
2. **Notification emails** — send email for the three highest-value in-app notification events (assignment, comment, mention) via a delayed, cancellable queue backed by Supabase Edge Functions and Resend.

## Part 1 — Auth Emails (Supabase SMTP)

**Setup:** Supabase Dashboard → Project Settings → Auth → SMTP Settings

| Field          | Value                       |
| -------------- | --------------------------- |
| Host           | `smtp.resend.com`           |
| Port           | `465`                       |
| Username       | `resend`                    |
| Password       | Resend API key              |
| Sender address | `noreply@esperiastudio.com` |

Auth email templates are customized in Supabase Dashboard → Authentication → Email Templates (HTML editor). Two templates:

| Template       | Subject                               |
| -------------- | ------------------------------------- |
| Confirm signup | `Confirm your Esperia Trello account` |
| Password reset | `Reset your Esperia Trello password`  |

Both share the same branded layout (Esperia Trello header, CTA button, footer). No code required — templates live in the Supabase dashboard.

## Part 2 — Notification Emails

### Email triggers

Only three event types trigger emails. All other notification types are in-app only.

| `email_type` | When                                        | Cancellable                                      |
| ------------ | ------------------------------------------- | ------------------------------------------------ |
| `assigned`   | User is assigned to a card                  | Yes — unassigning within 5 min cancels the email |
| `comment`    | Comment posted on a card you're assigned to | No                                               |
| `mention`    | You are @mentioned in a comment             | No                                               |

5-minute send delay on all three to allow for quick corrections.

### Database schema

**Migration 1 — extend `notifications` table:**

```sql
alter table notifications
  add column email_type text check (email_type in ('assigned', 'comment', 'mention'));
```

Nullable — existing rows and new in-app-only notifications leave it null.

**Migration 2 — new `pending_email_queue` table:**

```sql
create table pending_email_queue (
  id            uuid primary key default gen_random_uuid(),
  dedup_key     text not null unique,
  recipient_email text not null,
  subject       text not null,
  body_html     text not null,
  send_after    timestamptz not null,
  created_at    timestamptz not null default now()
);

-- Service role only; no user access
alter table pending_email_queue enable row level security;
```

`dedup_key` format per type:

- `assigned:{card_id}:{recipient_email}` — upsert resets timer on re-assignment within window
- `comment:{card_id}:{recipient_email}:{created_at_minute}` — prevents exact duplicate
- `mention:{card_id}:{recipient_email}:{created_at_minute}`

**Migration 3 — cancellation RPC:**

```sql
create or replace function cancel_pending_email(p_dedup_key text)
returns void
language sql
security definer
as $$
  delete from pending_email_queue where dedup_key = p_dedup_key;
$$;
```

`SECURITY DEFINER` lets the frontend trigger cancellation without direct table access.

### Edge Functions

**`supabase/functions/queue-notification-email/index.ts`**

Triggered by a Supabase DB webhook on `notifications` INSERT.

1. If `email_type` is null → exit immediately
2. Build `subject`, `body_html`, and `dedup_key` from the notification row + `email_type`
3. Upsert into `pending_email_queue` with `send_after = now() + 5 minutes`
   - Upsert (on conflict `dedup_key` → update `send_after`) means a re-assignment within the window resets the 5-minute timer rather than sending two emails

**`supabase/functions/process-email-queue/index.ts`**

Scheduled via `Deno.cron`, runs every minute.

1. Select up to 50 rows where `send_after <= now()`
2. For each row: call Resend API (`POST /emails`) with `from`, `to`, `subject`, `html`
3. Delete the row regardless of send outcome — on failure, log to Axiom and drop (no retry loop to avoid runaway sends)

Limit of 50/run keeps well within Resend's free tier (100 emails/day).

### Email templates

All five emails (3 notification + 2 auth) share the same HTML layout:

- Esperia Trello branded header
- Single CTA button
- Minimal footer with unsubscribe note

Notification email templates are inline HTML inside `queue-notification-email`. Auth templates live in the Supabase dashboard.

| `email_type` | Subject                                   | CTA          |
| ------------ | ----------------------------------------- | ------------ |
| `assigned`   | `You've been assigned to "{card title}"`  | Open card    |
| `comment`    | `New comment on "{card title}"`           | View comment |
| `mention`    | `{actor} mentioned you in "{card title}"` | Open card    |

CTA deep-link format: `https://esperia-trello.pages.dev/boards/{boardSlug}/{cardNumber}`

### Frontend changes

**`src/context/NotificationContext.tsx`**

`SendNotificationParams` gets an optional field:

```ts
email_type?: 'assigned' | 'comment' | 'mention'
```

Passed through to the `notifications` insert. Omitted = in-app only.

**`src/api/notifications/api.ts`** (new file)

```ts
export async function cancelPendingEmail(dedupKey: string): Promise<void>
```

Calls the `cancel_pending_email` RPC. Exported from `src/api/index.ts`.

**`src/features/cards/CardDetailModal.tsx`** — 3 targeted updates:

1. `handleAddComment` → `notifyAssignedMembers(…)` updated internally to pass `email_type: 'comment'`
2. `@mention` loop → `sendNotification({ …, email_type: 'mention' })`
3. Member assign handler → `sendNotification({ …, email_type: 'assigned' })`
4. Member unassign handler → `cancelPendingEmail('assigned:{cardId}:{email}')`

No new components or pages.

### Supabase DB webhook

Configure in Supabase Dashboard → Database → Webhooks:

- Table: `notifications`
- Event: `INSERT`
- Target: Edge Function `queue-notification-email`

## Build sequence

1. Configure Resend SMTP in Supabase dashboard (immediate fix for auth rate limit)
2. Customize auth email templates in Supabase dashboard
3. Run DB migrations (add `email_type` column, create queue table, create RPC)
4. Deploy `queue-notification-email` Edge Function
5. Deploy `process-email-queue` Edge Function (with Deno.cron)
6. Configure DB webhook in Supabase dashboard
7. Update frontend (`NotificationContext`, `CardDetailModal`, new `cancelPendingEmail`)
8. Smoke test: sign up, assign card, verify 5-min delay, verify cancellation on unassign
