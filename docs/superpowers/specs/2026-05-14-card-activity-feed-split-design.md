# CardDetailModal — Activity Feed Split

**Date:** 2026-05-14
**Status:** Approved

## Overview

`CardDetailModal.tsx` is 1,087 lines. The right column (activity feed + comment input) is a well-bounded unit that has grown to ~320 lines of JSX plus ~115 lines of handlers and state. Extracting it into `CardActivityFeed.tsx` reduces the modal to ~740 lines and produces a focused, independently-testable component.

No other splits are in scope. The quick action bar, members panel, and inline chips stay in `CardDetailModal.tsx`.

## New File

**`src/features/cards/CardActivityFeed.tsx`**

Self-contained component. Owns all comment-related state, the realtime Supabase subscription, all comment handlers, and the entire right-column JSX. Calls API functions and `sendNotification` directly — same pattern as `CardDescription.tsx`.

### Props

```typescript
import type { BoardMember } from '@/types/board'

interface CardActivityFeedProps {
  boardId: string
  cardId: string
  boardMembers: BoardMember[]
  actorEmail: string
  actorName: string
  actorAvatar?: string
  cardTitle: string
  boardTitle: string
}
```

### Internals (all currently in `CardDetailModal.tsx`)

**State:**

- `isCommenting: boolean`
- `editingCommentId: string | null`
- `commentToDeleteId: string | null`
- `prevCommentMentionsRef: React.MutableRefObject<Array<{ id: string; label: string }>>`
- `commentEditorRef: React.RefObject<RichTextEditorRef>`

**Hooks:**

- `useCardCommentsQuery(boardId, cardId)`
- `useCardActivityQuery(boardId, cardId)`
- `useCommentsCache(boardId, cardId)`
- `useQueryClient()`

**Realtime subscription:** The `useEffect` that creates a Supabase channel on `card_comments` and `card_activity`, invalidating the relevant caches on change, and removes the channel on cleanup.

**Handlers:**

- `handleAddComment()` — reads editor content, calls `apiAddComment`, patches comments cache, inserts activity, calls `notifyAssignedMembers` with `email_type: 'comment'`, extracts new @mentions and calls `sendNotification` with `email_type: 'mention'`, resets editor
- `handleUpdateComment(commentId, content)` — calls `apiUpdateComment`, patches cache, sends notifications for newly-added mentions
- `handleDeleteOwnComment(commentId)` — optimistic cache remove + `apiDeleteComment`

**Helpers:**

- `renderCommentHTML(content)` — `generateHTML` with StarterKit + Mention
- `notifyAssignedMembers(excludeEmail, title, body, email_type?)` — loops `card.members` and sends in-app + email notifications (moved from modal; needs `card.members` resolved from `boardMembers` prop — see Data Note below)

**Derived:**

- `FeedItem` union type
- `feed` — merged + sorted array of comments and activity entries

**JSX:**
The full right column (lines 891–1055 of the current modal):

- Scrollable feed rendering activity entries and comment items (with hover edit/delete)
- `RichTextEditor` for inline comment editing
- Comment input bar (`RichTextEditor` + Send button)
- `ConfirmModal` for delete confirmation

### Data Note

`notifyAssignedMembers` currently accesses `card.members` directly from the outer closure. After extraction, `CardActivityFeed` does not receive `card`. It resolves assigned members by cross-referencing `boardMembers` with a `cardMembers` prop.

Add one more prop:

```typescript
cardMembers: Array<{ id: string; name: string }> // card.members ?? []
```

Updated full props interface:

```typescript
interface CardActivityFeedProps {
  boardId: string
  cardId: string
  cardMembers: Array<{ id: string; name: string }>
  boardMembers: BoardMember[]
  actorEmail: string
  actorName: string
  actorAvatar?: string
  cardTitle: string
  boardTitle: string
}
```

`CardDetailModal` passes `cardMembers={card.members ?? []}`.

## Changes to `CardDetailModal.tsx`

1. **Remove** the local `BoardMember` interface (duplicate of `@/types/board` — import it from there instead).
2. **Remove** all comment-related state, refs, hooks, handlers, and the realtime subscription.
3. **Remove** the right-column JSX block and the `ConfirmModal` for comment deletion.
4. **Remove** imports that are now only used in `CardActivityFeed`: `MessageSquare`, `Send`, `RichTextEditor`, `useCardCommentsQuery`, `useCardActivityQuery`, `useCommentsCache`, `apiAddComment`, `apiDeleteComment`, `apiInsertActivity`, `activityKey`, `useQueryClient`, `supabase`, `extractPlainText`, `formatActivityMessage`, `extractMentions`, `diffMentions`, `generateHTML`, `StarterKit`, `Mention`, `JSONContent`, `ConfirmModal`.
5. **Add** `import CardActivityFeed from './CardActivityFeed'`.
6. **Replace** the right column with:

```tsx
<CardActivityFeed
  boardId={boardId}
  cardId={cardId}
  cardMembers={card.members ?? []}
  boardMembers={boardMembers}
  actorEmail={user?.email ?? ''}
  actorName={actorName}
  actorAvatar={profile?.avatar_url ?? undefined}
  cardTitle={card.title}
  boardTitle={board?.title ?? ''}
/>
```

## Expected outcome

| File                   | Before       | After      |
| ---------------------- | ------------ | ---------- |
| `CardDetailModal.tsx`  | ~1,087 lines | ~740 lines |
| `CardActivityFeed.tsx` | —            | ~320 lines |

## No new abstractions

- No new hooks, no new context, no new shared utilities.
- `CardActivityFeed` is a leaf component — nothing imports from it except `CardDetailModal`.
- `BoardMember` type already exists in `@/types/board`; we just start using it.
