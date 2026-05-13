# Rich Text Editor, @Mentions, Activity Log & Notifications — Design Spec

**Date:** 2026-05-13
**Status:** Approved

---

## Overview

Add Trello-style rich text editing to card descriptions and comments, @mention support in both, a real activity log per card, and a fully wired notification system for all key board events.

---

## 1. Rich Text Editor

### Library

**Tiptap** (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-mention`, `@tiptap/extension-placeholder`)

### Description Editor (`CardDescription.tsx` — full rewrite)

- **Mode:** Click-to-edit. Clicking the description area enters edit mode; a formatting toolbar appears above the content.
- **Toolbar:** Bold, Italic, Strikethrough, `Code`, Heading 2, Heading 3, Bullet list, Ordered list, Blockquote, Code block.
- **Markdown shortcuts:** Inline shortcuts work (`**bold**`, `- list`, `## heading`).
- **Exit:** Save / Cancel buttons below the editor. Save serializes to Tiptap JSON and calls `updateCard({ description })`. Cancel discards and collapses to read view.
- **Read view:** Rendered via Tiptap's `generateHTML()` — no second renderer needed.
- **Backward compatibility:** On load, if `card.description` is a plain string (not Tiptap JSON), wrap it as:
  ```json
  {
    "type": "doc",
    "content": [{ "type": "paragraph", "content": [{ "type": "text", "text": "..." }] }]
  }
  ```

### Comment Editor (in `CardDetailModal.tsx`)

- Same Tiptap extensions, but heading buttons excluded (comments are inline-focused).
- Always-visible input — no read/edit mode toggle.
- Submit on button click or `Cmd/Ctrl+Enter`.
- Existing comments fetched from `card_comments` table, rendered via `generateHTML()`.

---

## 2. @Mentions

### Trigger & Dropdown

- Typing `@` in description or comment editors opens a floating suggestion dropdown.
- Board members fetched via `apiFetchBoardMembers(boardId)` on first `@` and cached for the session.
- Filtered client-side as the user types.
- Each row: avatar initial + display name + email.
- Keyboard navigation: ↑↓ Enter to select, Escape to dismiss.

### Storage

Mention stored as a Tiptap node:

```json
{ "type": "mention", "attrs": { "id": "<userId>", "label": "<displayName>" } }
```

Rendered in read view as a styled `@displayName` chip (blue-tinted, slightly bold).

### Notification on Save/Submit

- Extract all mention nodes from Tiptap JSON.
- Diff against previous content's mentions — only notify **newly added** mentions.
- For each new mention:
  ```
  sendNotification({
    userEmail: mentionedUser.email,
    title: '@mention on [Card Title]',
    body:  '[ActorName] mentioned you in [Card Title]',
    boardId,
    cardId
  })
  ```
- **Email resolution:** The mention node stores `{ id: userId }`. Resolve the email by looking up the cached board members list (returned by `apiFetchBoardMembers`, which joins `board_members` with `app_users` and includes `email`).
- Skip if mentioned user === actor (no self-notifications).

### Scope

Board members only — dropdown is limited to `board_members` for the current board.

---

## 3. Activity Log

### New Table: `card_activity`

```sql
create table card_activity (
  id          uuid primary key default gen_random_uuid(),
  board_id    text not null,
  card_id     text not null,
  actor_email text not null,
  actor_name  text not null,
  type        text not null,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

-- RLS
alter table card_activity enable row level security;
-- SELECT: any board member
create policy "board members can view activity"
  on card_activity for select
  using (
    exists (
      select 1 from board_members
      where board_members.board_id = card_activity.board_id
        and board_members.user_id = auth.uid()
    )
  );
-- INSERT: any board member
create policy "board members can insert activity"
  on card_activity for insert
  with check (
    exists (
      select 1 from board_members
      where board_members.board_id = card_activity.board_id
        and board_members.user_id = auth.uid()
    )
  );

alter publication supabase_realtime add table card_activity;
```

### Event Types

| `type`                | `payload`                                    | Human-readable display                      |
| --------------------- | -------------------------------------------- | ------------------------------------------- |
| `member_assigned`     | `{ userId, userName }`                       | "[Actor] assigned [userName] to this card"  |
| `member_unassigned`   | `{ userId, userName }`                       | "[Actor] removed [userName] from this card" |
| `comment_added`       | `{ preview }` (first 60 chars of plain text) | "[Actor] commented: [preview]"              |
| `moved`               | `{ from, to }` (list names)                  | "[Actor] moved this from [from] to [to]"    |
| `due_date_set`        | `{ date }`                                   | "[Actor] set the due date to [date]"        |
| `due_date_changed`    | `{ from, to }`                               | "[Actor] changed the due date to [to]"      |
| `due_date_removed`    | `{}`                                         | "[Actor] removed the due date"              |
| `archived`            | `{}`                                         | "[Actor] archived this card"                |
| `description_updated` | `{}`                                         | "[Actor] updated the description"           |

### Where Entries Are Written

All card mutations flow through `BoardContext`. Activity inserts are co-located with each mutation handler. Comment entries are written at submit time in the modal. All inserts are fire-and-forget (non-blocking).

### Display in Card Detail

- Activity entries and comments merged into one feed, sorted by `created_at` ascending (oldest first).
- Activity entries: clock icon + plain-text sentence + relative timestamp.
- Comments: avatar + author name + rich text body + delete button (own comments only, calls `apiDeleteComment`).
- Feed fetched fresh when card modal opens; Supabase realtime subscription keeps it live.

---

## 4. New Table: `card_comments`

```sql
create table card_comments (
  id           uuid primary key default gen_random_uuid(),
  board_id     text not null,
  card_id      text not null,
  author_email text not null,
  author_name  text not null,
  content      jsonb not null,   -- Tiptap JSON
  created_at   timestamptz not null default now()
);

-- RLS
alter table card_comments enable row level security;
-- SELECT: any board member
create policy "board members can view comments"
  on card_comments for select
  using (
    exists (
      select 1 from board_members
      where board_members.board_id = card_comments.board_id
        and board_members.user_id = auth.uid()
    )
  );
-- INSERT: any board member
create policy "board members can insert comments"
  on card_comments for insert
  with check (
    exists (
      select 1 from board_members
      where board_members.board_id = card_comments.board_id
        and board_members.user_id = auth.uid()
    )
  );
-- DELETE: own comments only
create policy "authors can delete own comments"
  on card_comments for delete
  using (author_email = auth.email());

alter publication supabase_realtime add table card_comments;
```

**Note:** Comments are not editable after submission (no UPDATE policy).

---

## 5. Notifications

`sendNotification()` already exists in `NotificationContext`. `NotificationContext` requires no changes.

### Trigger Map

| Event                            | Who gets notified                       | Where called                      |
| -------------------------------- | --------------------------------------- | --------------------------------- |
| @mention in description          | Mentioned users                         | `CardDescription` on Save         |
| @mention in comment              | Mentioned users                         | Comment submit handler            |
| Assigned to card                 | Assigned user                           | `BoardContext.handleToggleMember` |
| Unassigned from card             | Removed user                            | `BoardContext.handleToggleMember` |
| Comment added                    | All assigned members (except commenter) | Comment submit handler            |
| Card moved to different list     | All assigned members                    | `BoardContext.moveCard`           |
| Due date set / changed / removed | All assigned members                    | `BoardContext.updateCard`         |
| Card archived                    | All assigned members                    | `BoardContext.archiveCard`        |

### Rules

- Never notify the actor (skip if `targetEmail === actorEmail`).
- @mention notification fires in addition to any other event notification.
- `title` format: `[Card Title] — [Board Name]`
- `body` format: human-readable sentence per event (see trigger map above).
- **Member email resolution:** `card.members` only stores `{ id, name }`. For events that notify all assigned members, resolve emails by calling `apiFetchBoardMembers(boardId)` and cross-referencing `card.members` by `userId`. This call can be cached per card modal session.

---

## 6. Type Changes

```typescript
// board.ts additions
interface ActivityEntry {
  id: string
  boardId: string
  cardId: string
  actorEmail: string
  actorName: string
  type: ActivityType
  payload: Record<string, string>
  createdAt: string
}

type ActivityType =
  | 'member_assigned'
  | 'member_unassigned'
  | 'comment_added'
  | 'moved'
  | 'due_date_set'
  | 'due_date_changed'
  | 'due_date_removed'
  | 'archived'
  | 'description_updated'

interface CardComment {
  id: string
  boardId: string
  cardId: string
  authorEmail: string
  authorName: string
  content: object // Tiptap JSON
  createdAt: string
}

// Comment is removed from the Card type
// card.description changes from string to string (Tiptap JSON-encoded)
```

---

## 7. New API Functions

| Function                                                           | File                  | Purpose                       |
| ------------------------------------------------------------------ | --------------------- | ----------------------------- |
| `apiAddComment(boardId, cardId, authorEmail, authorName, content)` | `src/api/comments.ts` | Insert into `card_comments`   |
| `apiFetchComments(boardId, cardId)`                                | `src/api/comments.ts` | Fetch all comments for a card |
| `apiDeleteComment(commentId)`                                      | `src/api/comments.ts` | Delete own comment            |
| `apiInsertActivity(entry)`                                         | `src/api/activity.ts` | Insert into `card_activity`   |
| `apiFetchActivity(boardId, cardId)`                                | `src/api/activity.ts` | Fetch all activity for a card |

---

## 8. Files Changed / Created

| File                                             | Change                                                                 |
| ------------------------------------------------ | ---------------------------------------------------------------------- |
| `supabase/migrations/card_comments_activity.sql` | New — creates both tables with RLS                                     |
| `src/api/comments.ts`                            | New — comment CRUD                                                     |
| `src/api/activity.ts`                            | New — activity insert/fetch                                            |
| `src/features/cards/CardDescription.tsx`         | Rewrite — Tiptap editor                                                |
| `src/features/cards/RichTextEditor.tsx`          | New — shared Tiptap editor component                                   |
| `src/features/cards/MentionList.tsx`             | New — mention suggestion dropdown                                      |
| `src/features/cards/CardDetailModal.tsx`         | Update — replace comment textarea, add activity feed                   |
| `src/context/BoardContext.tsx`                   | Update — insert activity on mutations, call sendNotification           |
| `src/types/board.ts`                             | Update — add ActivityEntry, CardComment, remove Comment.text as string |

---

## Out of Scope

- Email notifications
- Comment editing
- Mention notifications to users outside the board
- Activity log for board-level events (list created, board renamed)
