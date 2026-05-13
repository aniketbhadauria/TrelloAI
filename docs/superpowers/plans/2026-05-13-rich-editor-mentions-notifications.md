# Rich Text Editor, @Mentions, Activity Log & Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Tiptap-powered rich text editing to card descriptions and comments, @mention support with in-app notification delivery, a per-card activity log in Supabase, and fully wired notifications for all key board events.

**Architecture:** A shared `RichTextEditor` component (Tiptap, `forwardRef`) is used for both the description editor and the comment input. Comments and activity live in new Supabase tables (`card_comments`, `card_activity`). All notification and activity writes are fire-and-forget calls co-located with UI handlers in `CardDetailModal` and `CardDescription`. The `sendNotification` function already exists in `NotificationContext` and requires no changes. Board member emails are resolved via the already-fetched `boardMembers` list in `CardDetailModal`.

**Tech Stack:** Tiptap (`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-mention`, `@tiptap/extension-placeholder`, `@tiptap/html`), `tippy.js` (mention dropdown), Vitest (unit tests for pure utils), Supabase (two new tables + RLS)

---

## File Map

| File                                             | Action  | Responsibility                                                                                                 |
| ------------------------------------------------ | ------- | -------------------------------------------------------------------------------------------------------------- |
| `supabase/migrations/card_comments_activity.sql` | Create  | DB tables + RLS                                                                                                |
| `src/types/board.ts`                             | Modify  | Add `ActivityEntry`, `CardComment`, `ActivityType`; make `Card.comments` optional                              |
| `src/context/BoardContext.tsx`                   | Modify  | Remove `comments: []` from `addCard`                                                                           |
| `src/features/cards/activityUtils.ts`            | Create  | Pure utils: `parseDescription`, `extractMentions`, `diffMentions`, `extractPlainText`, `formatActivityMessage` |
| `src/features/cards/activityUtils.test.ts`       | Create  | Vitest unit tests                                                                                              |
| `vitest.config.ts`                               | Create  | Vitest config                                                                                                  |
| `src/api/comments.ts`                            | Create  | `apiAddComment`, `apiFetchComments`, `apiDeleteComment`                                                        |
| `src/api/activity.ts`                            | Create  | `apiInsertActivity`, `apiFetchActivity`                                                                        |
| `src/features/cards/MentionList.tsx`             | Create  | Tiptap mention suggestion dropdown                                                                             |
| `src/features/cards/RichTextEditor.tsx`          | Create  | Shared Tiptap editor with toolbar, mention support, `forwardRef`                                               |
| `src/features/cards/CardDescription.tsx`         | Rewrite | Click-to-edit Tiptap description                                                                               |
| `src/features/cards/CardDetailModal.tsx`         | Modify  | Comment editor, merged feed, activity inserts, notifications                                                   |
| `src/features/board-view/BoardViewPage.tsx`      | Modify  | Card-move activity + notification                                                                              |
| `src/index.css`                                  | Modify  | Tiptap prose + mention chip styles                                                                             |

---

## Task 1: Install dependencies + add test script

**Files:**

- Modify: `package.json`

- [ ] **Step 1: Install Tiptap and tippy.js**

```bash
npm install @tiptap/react @tiptap/starter-kit @tiptap/extension-mention @tiptap/extension-placeholder @tiptap/html tippy.js
```

Expected: no errors. `package.json` dependencies updated.

- [ ] **Step 2: Install Vitest**

```bash
npm install --save-dev vitest
```

- [ ] **Step 3: Add test scripts to package.json**

In `package.json`, inside `"scripts"`, add after `"lint"`:

```json
"test": "vitest",
"test:run": "vitest run",
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 5: Verify Vitest runs (no tests yet)**

```bash
npm run test:run
```

Expected output: `No test files found` or `0 tests passed` — not an error exit.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: install tiptap, tippy.js, and vitest"
```

---

## Task 2: DB migration

**Files:**

- Create: `supabase/migrations/card_comments_activity.sql`

- [ ] **Step 1: Create the SQL migration file**

```sql
-- supabase/migrations/card_comments_activity.sql

-- card_comments: stores rich-text comments per card
create table if not exists card_comments (
  id           uuid primary key default gen_random_uuid(),
  board_id     text not null,
  card_id      text not null,
  author_email text not null,
  author_name  text not null,
  content      jsonb not null,
  created_at   timestamptz not null default now()
);

alter table card_comments enable row level security;

create policy "board members can view comments"
  on card_comments for select
  using (
    exists (
      select 1 from board_members
      where board_members.board_id = card_comments.board_id
        and board_members.user_id = auth.uid()
    )
  );

create policy "board members can insert comments"
  on card_comments for insert
  with check (
    exists (
      select 1 from board_members
      where board_members.board_id = card_comments.board_id
        and board_members.user_id = auth.uid()
    )
  );

create policy "authors can delete own comments"
  on card_comments for delete
  using (author_email = auth.email());

alter publication supabase_realtime add table card_comments;

-- card_activity: append-only event log per card
create table if not exists card_activity (
  id          uuid primary key default gen_random_uuid(),
  board_id    text not null,
  card_id     text not null,
  actor_email text not null,
  actor_name  text not null,
  type        text not null,
  payload     jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table card_activity enable row level security;

create policy "board members can view activity"
  on card_activity for select
  using (
    exists (
      select 1 from board_members
      where board_members.board_id = card_activity.board_id
        and board_members.user_id = auth.uid()
    )
  );

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

- [ ] **Step 2: Apply migration via Supabase MCP**

Use the `mcp__supabase__apply_migration` tool with:

- `name`: `card_comments_activity`
- `query`: the full SQL above

Verify: both tables appear in the Supabase dashboard under Table Editor.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/card_comments_activity.sql
git commit -m "feat: add card_comments and card_activity tables with RLS"
```

---

## Task 3: Update types and BoardContext

**Files:**

- Modify: `src/types/board.ts`
- Modify: `src/context/BoardContext.tsx:257-282`

- [ ] **Step 1: Update src/types/board.ts**

Replace the entire file:

```typescript
export type BoardRole = 'owner' | 'admin' | 'member' | 'observer'

export type ActivityType =
  | 'member_assigned'
  | 'member_unassigned'
  | 'comment_added'
  | 'moved'
  | 'due_date_set'
  | 'due_date_changed'
  | 'due_date_removed'
  | 'archived'
  | 'description_updated'

export interface ActivityEntry {
  id: string
  boardId: string
  cardId: string
  actorEmail: string
  actorName: string
  type: ActivityType
  payload: Record<string, string>
  createdAt: string
}

export interface CardComment {
  id: string
  boardId: string
  cardId: string
  authorEmail: string
  authorName: string
  content: object
  createdAt: string
}

export interface Label {
  id: string
  text: string
  color: string
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface CardMember {
  id: string
  name: string
}

export interface Attachment {
  id: string
  name: string
  url?: string
  fileData?: string
  fileName?: string
  addedAt: string
}

export interface Card {
  id: string
  number?: number
  title: string
  description: string
  labels: Label[]
  checklist: ChecklistItem[]
  members: CardMember[]
  comments?: never[]
  attachments: Attachment[]
  dueDate: string | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
}

export interface List {
  id: string
  title: string
  cards: Card[]
}

export interface Board {
  id: string
  key?: string
  title: string
  gradient: string
  backgroundImage: string | null
  starred: boolean
  archived: boolean
  archivedAt: string | null
  createdAt: string
  lists: List[]
  nextCardNumber?: number
  ownerId?: string
  memberRole?: BoardRole
  ownerName?: string | null
}

export interface ArchivedCard extends Card {
  boardId: string
  boardTitle: string
  listId: string
  listTitle: string
}
```

Note: `comments?: never[]` is intentional — it keeps type compatibility with any JSONB data that has `comments: []` while preventing new writes. TypeScript will error if any code tries to write a real `Comment[]` to it, prompting cleanup.

- [ ] **Step 2: Remove `comments: []` from addCard in BoardContext.tsx**

In `src/context/BoardContext.tsx`, find the `addCard` callback (around line 258–282). Change:

```typescript
const newCard: Card = {
  id: uuidv4(),
  number: nextNum,
  title,
  description: '',
  labels: [],
  checklist: [],
  members: [],
  comments: [],
  attachments: [],
  dueDate: null,
  archived: false,
  archivedAt: null,
  createdAt: new Date().toISOString(),
}
```

To:

```typescript
const newCard: Card = {
  id: uuidv4(),
  number: nextNum,
  title,
  description: '',
  labels: [],
  checklist: [],
  members: [],
  attachments: [],
  dueDate: null,
  archived: false,
  archivedAt: null,
  createdAt: new Date().toISOString(),
}
```

- [ ] **Step 3: Verify no TypeScript errors**

```bash
npx tsc --noEmit
```

Expected: 0 errors. If errors appear related to `comments`, they point to code that writes to `card.comments` — remove those writes.

- [ ] **Step 4: Commit**

```bash
git add src/types/board.ts src/context/BoardContext.tsx
git commit -m "feat: add ActivityEntry, CardComment types; deprecate Card.comments"
```

---

## Task 4: Utility functions + Vitest tests

**Files:**

- Create: `src/features/cards/activityUtils.ts`
- Create: `src/features/cards/activityUtils.test.ts`

- [ ] **Step 1: Write the failing tests first**

Create `src/features/cards/activityUtils.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import {
  parseDescription,
  extractMentions,
  diffMentions,
  extractPlainText,
  formatActivityMessage,
} from './activityUtils'

describe('parseDescription', () => {
  it('wraps plain text as a paragraph doc', () => {
    expect(parseDescription('Hello world')).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    })
  })

  it('returns empty paragraph doc for empty string', () => {
    expect(parseDescription('')).toEqual({ type: 'doc', content: [{ type: 'paragraph' }] })
  })

  it('returns valid Tiptap JSON unchanged', () => {
    const json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Rich' }] }],
    }
    expect(parseDescription(JSON.stringify(json))).toEqual(json)
  })

  it('wraps non-doc JSON object as plain text', () => {
    const result = parseDescription('{"foo":"bar"}')
    expect(result.type).toBe('doc')
    expect((result.content?.[0] as { content?: Array<{ text?: string }> }).content?.[0].text).toBe(
      '{"foo":"bar"}'
    )
  })
})

describe('extractMentions', () => {
  it('extracts mention nodes from content', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            { type: 'mention', attrs: { id: 'user1', label: 'Alice' } },
          ],
        },
      ],
    }
    expect(extractMentions(content)).toEqual([{ id: 'user1', label: 'Alice' }])
  })

  it('returns empty array when no mentions', () => {
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
    }
    expect(extractMentions(content)).toEqual([])
  })

  it('extracts multiple mentions', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
            { type: 'text', text: ' and ' },
            { type: 'mention', attrs: { id: 'u2', label: 'Bob' } },
          ],
        },
      ],
    }
    expect(extractMentions(content)).toEqual([
      { id: 'u1', label: 'Alice' },
      { id: 'u2', label: 'Bob' },
    ])
  })
})

describe('diffMentions', () => {
  it('returns only newly added mentions', () => {
    const prev = [{ id: 'u1', label: 'Alice' }]
    const next = [
      { id: 'u1', label: 'Alice' },
      { id: 'u2', label: 'Bob' },
    ]
    expect(diffMentions(prev, next)).toEqual([{ id: 'u2', label: 'Bob' }])
  })

  it('returns all mentions when prev is empty', () => {
    const next = [{ id: 'u1', label: 'Alice' }]
    expect(diffMentions([], next)).toEqual(next)
  })

  it('returns empty when no new mentions added', () => {
    const both = [{ id: 'u1', label: 'Alice' }]
    expect(diffMentions(both, both)).toEqual([])
  })
})

describe('extractPlainText', () => {
  it('extracts text from paragraph', () => {
    const content = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }],
    }
    expect(extractPlainText(content)).toBe('Hello world')
  })

  it('renders @mention label in plain text', () => {
    const content = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hi ' },
            { type: 'mention', attrs: { id: 'u1', label: 'Alice' } },
          ],
        },
      ],
    }
    expect(extractPlainText(content)).toBe('Hi @Alice')
  })
})

describe('formatActivityMessage', () => {
  it('formats member_assigned', () => {
    expect(formatActivityMessage('member_assigned', 'Alice', { userName: 'Bob' })).toBe(
      'Alice assigned Bob to this card'
    )
  })

  it('formats member_unassigned', () => {
    expect(formatActivityMessage('member_unassigned', 'Alice', { userName: 'Bob' })).toBe(
      'Alice removed Bob from this card'
    )
  })

  it('formats moved', () => {
    expect(formatActivityMessage('moved', 'Alice', { from: 'Backlog', to: 'In Progress' })).toBe(
      'Alice moved this from Backlog to In Progress'
    )
  })

  it('formats due_date_set', () => {
    expect(formatActivityMessage('due_date_set', 'Alice', { date: 'Jun 3' })).toBe(
      'Alice set the due date to Jun 3'
    )
  })

  it('formats due_date_changed', () => {
    expect(
      formatActivityMessage('due_date_changed', 'Alice', { from: 'Jun 3', to: 'Jun 10' })
    ).toBe('Alice changed the due date to Jun 10')
  })

  it('formats due_date_removed', () => {
    expect(formatActivityMessage('due_date_removed', 'Alice', {})).toBe(
      'Alice removed the due date'
    )
  })

  it('formats archived', () => {
    expect(formatActivityMessage('archived', 'Alice', {})).toBe('Alice archived this card')
  })

  it('formats description_updated', () => {
    expect(formatActivityMessage('description_updated', 'Alice', {})).toBe(
      'Alice updated the description'
    )
  })
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm run test:run
```

Expected: multiple `cannot find module './activityUtils'` errors.

- [ ] **Step 3: Create src/features/cards/activityUtils.ts**

```typescript
import type { JSONContent } from '@tiptap/core'
import type { ActivityType } from '@/types/board'

export function parseDescription(raw: string): JSONContent {
  if (!raw) return { type: 'doc', content: [{ type: 'paragraph' }] }
  try {
    const parsed = JSON.parse(raw) as unknown
    if (parsed && typeof parsed === 'object' && (parsed as { type?: unknown }).type === 'doc') {
      return parsed as JSONContent
    }
  } catch {
    // not JSON — treat as plain text
  }
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: raw }] }],
  }
}

export function extractMentions(content: JSONContent): Array<{ id: string; label: string }> {
  const mentions: Array<{ id: string; label: string }> = []
  function traverse(node: JSONContent) {
    if (node.type === 'mention' && node.attrs?.id) {
      mentions.push({ id: node.attrs.id as string, label: (node.attrs.label as string) ?? '' })
    }
    node.content?.forEach(traverse)
  }
  traverse(content)
  return mentions
}

export function diffMentions(
  prev: Array<{ id: string }>,
  next: Array<{ id: string; label: string }>
): Array<{ id: string; label: string }> {
  const prevIds = new Set(prev.map((m) => m.id))
  return next.filter((m) => !prevIds.has(m.id))
}

export function extractPlainText(content: JSONContent): string {
  let text = ''
  function traverse(node: JSONContent) {
    if (node.type === 'text') text += (node.text as string | undefined) ?? ''
    else if (node.type === 'mention') text += `@${(node.attrs?.label as string | undefined) ?? ''}`
    else if (node.type === 'hardBreak') text += ' '
    node.content?.forEach(traverse)
  }
  traverse(content)
  return text.trim()
}

export function formatActivityMessage(
  type: ActivityType,
  actorName: string,
  payload: Record<string, string>
): string {
  switch (type) {
    case 'member_assigned':
      return `${actorName} assigned ${payload.userName} to this card`
    case 'member_unassigned':
      return `${actorName} removed ${payload.userName} from this card`
    case 'comment_added':
      return `${actorName} commented: ${payload.preview}`
    case 'moved':
      return `${actorName} moved this from ${payload.from} to ${payload.to}`
    case 'due_date_set':
      return `${actorName} set the due date to ${payload.date}`
    case 'due_date_changed':
      return `${actorName} changed the due date to ${payload.to}`
    case 'due_date_removed':
      return `${actorName} removed the due date`
    case 'archived':
      return `${actorName} archived this card`
    case 'description_updated':
      return `${actorName} updated the description`
    default:
      return ''
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
npm run test:run
```

Expected: `17 tests passed` (all green).

- [ ] **Step 5: Commit**

```bash
git add src/features/cards/activityUtils.ts src/features/cards/activityUtils.test.ts vitest.config.ts package.json
git commit -m "feat: add activityUtils with parseDescription, mentions, activity formatting"
```

---

## Task 5: Create src/api/comments.ts

**Files:**

- Create: `src/api/comments.ts`

- [ ] **Step 1: Create the file**

```typescript
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logger'
import type { CardComment } from '@/types/board'
import type { JSONContent } from '@tiptap/core'

export async function apiAddComment(
  boardId: string,
  cardId: string,
  authorEmail: string,
  authorName: string,
  content: JSONContent
): Promise<CardComment | null> {
  const { data, error } = await supabase
    .from('card_comments')
    .insert({
      board_id: boardId,
      card_id: cardId,
      author_email: authorEmail,
      author_name: authorName,
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
    content: data.content as object,
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
    content: row.content as object,
    createdAt: row.created_at as string,
  }))
}

export async function apiDeleteComment(commentId: string): Promise<void> {
  const { error } = await supabase.from('card_comments').delete().eq('id', commentId)
  if (error) logError('comment_delete_failed', { commentId, message: error.message })
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/comments.ts
git commit -m "feat: add apiAddComment, apiFetchComments, apiDeleteComment"
```

---

## Task 6: Create src/api/activity.ts

**Files:**

- Create: `src/api/activity.ts`

- [ ] **Step 1: Create the file**

```typescript
import { supabase } from '@/lib/supabase'
import { logError } from '@/lib/logger'
import type { ActivityEntry, ActivityType } from '@/types/board'

interface InsertActivityParams {
  boardId: string
  cardId: string
  actorEmail: string
  actorName: string
  type: ActivityType
  payload?: Record<string, string>
}

export async function apiInsertActivity(params: InsertActivityParams): Promise<void> {
  const { error } = await supabase.from('card_activity').insert({
    board_id: params.boardId,
    card_id: params.cardId,
    actor_email: params.actorEmail,
    actor_name: params.actorName,
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
    type: row.type as ActivityType,
    payload: row.payload as Record<string, string>,
    createdAt: row.created_at as string,
  }))
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/api/activity.ts
git commit -m "feat: add apiInsertActivity, apiFetchActivity"
```

---

## Task 7: Create MentionList.tsx

**Files:**

- Create: `src/features/cards/MentionList.tsx`

This component renders the @mention suggestion dropdown and wires keyboard navigation. It uses `tippy.js` for the floating popup.

- [ ] **Step 1: Create the file**

```typescript
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import { ReactRenderer } from '@tiptap/react'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion'

export interface MentionMember {
  userId: string
  display_name: string | null
  email: string | null
  avatar_url: string | null
}

export interface MentionListRef {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean
}

interface MentionListProps {
  items: MentionMember[]
  command: (attrs: { id: string; label: string }) => void
}

const AVATAR_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
]

function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

const MentionListDropdown = forwardRef<MentionListRef, MentionListProps>((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = (index: number) => {
    const item = props.items[index]
    if (item) {
      props.command({ id: item.userId, label: item.display_name || item.email || item.userId })
    }
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown({ event }: SuggestionKeyDownProps) {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((i) => (i + props.items.length - 1) % props.items.length)
        return true
      }
      if (event.key === 'ArrowDown') {
        setSelectedIndex((i) => (i + 1) % props.items.length)
        return true
      }
      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }
      return false
    },
  }))

  if (!props.items.length) {
    return (
      <div className="bg-popover border border-border rounded-xl shadow-lg py-2 px-3 text-sm text-muted-foreground min-w-[160px]">
        No members found
      </div>
    )
  }

  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg py-1 min-w-[200px] max-w-[280px]">
      {props.items.map((item, index) => {
        const name = item.display_name || item.email || 'Unknown'
        const initials = name
          .split(' ')
          .map((w) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
        return (
          <button
            key={item.userId}
            type="button"
            onClick={() => selectItem(index)}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              index === selectedIndex ? 'bg-secondary' : 'hover:bg-secondary/60'
            }`}
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
              style={{ backgroundColor: avatarColor(item.userId) }}
            >
              {initials}
            </div>
            <div className="text-left min-w-0">
              <div className="font-medium truncate">{name}</div>
              {item.email && (
                <div className="text-xs text-muted-foreground truncate">{item.email}</div>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
})

MentionListDropdown.displayName = 'MentionListDropdown'

export function buildMentionSuggestion(getMembersRef: () => MentionMember[]) {
  return {
    items: ({ query }: { query: string }) => {
      const members = getMembersRef()
      const q = query.toLowerCase()
      return members
        .filter((m) => {
          const name = (m.display_name || m.email || '').toLowerCase()
          return name.includes(q)
        })
        .slice(0, 8)
    },

    render: () => {
      let renderer: ReactRenderer<MentionListRef, MentionListProps>
      let popup: TippyInstance[]

      return {
        onStart(props: SuggestionProps) {
          renderer = new ReactRenderer(MentionListDropdown, {
            props: props as unknown as MentionListProps,
            editor: props.editor,
          })
          if (!props.clientRect) return
          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: renderer.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },
        onUpdate(props: SuggestionProps) {
          renderer.updateProps(props as unknown as MentionListProps)
          if (!props.clientRect) return
          popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect })
        },
        onKeyDown(props: SuggestionKeyDownProps) {
          if (props.event.key === 'Escape') {
            popup[0]?.hide()
            return true
          }
          return renderer.ref?.onKeyDown(props) ?? false
        },
        onExit() {
          popup[0]?.destroy()
          renderer.destroy()
        },
      }
    },
  }
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/cards/MentionList.tsx
git commit -m "feat: add MentionList dropdown with keyboard navigation"
```

---

## Task 8: Create RichTextEditor.tsx

**Files:**

- Create: `src/features/cards/RichTextEditor.tsx`

- [ ] **Step 1: Create the file**

```typescript
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import Placeholder from '@tiptap/extension-placeholder'
import type { JSONContent } from '@tiptap/core'
import {
  Bold, Code, Code2, Heading2, Heading3, Italic, List,
  ListOrdered, Quote, Strikethrough,
} from 'lucide-react'
import 'tippy.js/dist/tippy.css'
import type { MentionMember } from './MentionList'
import { buildMentionSuggestion } from './MentionList'

export interface RichTextEditorRef {
  getContent: () => JSONContent
  resetContent: (content: JSONContent | null) => void
  focus: () => void
}

interface RichTextEditorProps {
  content: JSONContent | null
  placeholder?: string
  members: MentionMember[]
  autoFocus?: boolean
  showHeadings?: boolean
  onSubmit?: (content: JSONContent) => void
}

interface ToolbarButtonProps {
  onClick: () => void
  active: boolean
  title: string
  children: React.ReactNode
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault()
        onClick()
      }}
      title={title}
      className={`p-1.5 rounded text-xs transition-colors ${
        active
          ? 'bg-primary/15 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
      }`}
    >
      {children}
    </button>
  )
}

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({ content, placeholder = 'Write something...', members, autoFocus = false, showHeadings = true, onSubmit }, ref) => {
    const membersRef = useRef<MentionMember[]>(members)
    useEffect(() => { membersRef.current = members }, [members])

    const editor = useEditor({
      extensions: [
        StarterKit,
        Placeholder.configure({ placeholder }),
        Mention.configure({
          HTMLAttributes: { class: 'mention' },
          suggestion: buildMentionSuggestion(() => membersRef.current),
        }),
      ],
      content: content ?? undefined,
      autofocus: autoFocus,
      editorProps: {
        handleKeyDown(_view, event) {
          if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && onSubmit) {
            const json = editor?.getJSON()
            if (json) onSubmit(json)
            return true
          }
          return false
        },
      },
    })

    useImperativeHandle(ref, () => ({
      getContent: () => editor?.getJSON() ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      resetContent: (newContent) => {
        editor?.commands.setContent(newContent ?? { type: 'doc', content: [{ type: 'paragraph' }] })
      },
      focus: () => { editor?.commands.focus() },
    }))

    if (!editor) return null

    return (
      <div className="border border-border/40 rounded-xl overflow-hidden bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border/30 bg-secondary/20">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold (⌘B)"
          >
            <Bold className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic (⌘I)"
          >
            <Italic className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleStrike().run()}
            active={editor.isActive('strike')}
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCode().run()}
            active={editor.isActive('code')}
            title="Inline code"
          >
            <Code className="w-3.5 h-3.5" />
          </ToolbarButton>
          <div className="w-px h-4 bg-border/50 mx-0.5" />
          {showHeadings && (
            <>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
                active={editor.isActive('heading', { level: 2 })}
                title="Heading 2"
              >
                <Heading2 className="w-3.5 h-3.5" />
              </ToolbarButton>
              <ToolbarButton
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
                active={editor.isActive('heading', { level: 3 })}
                title="Heading 3"
              >
                <Heading3 className="w-3.5 h-3.5" />
              </ToolbarButton>
              <div className="w-px h-4 bg-border/50 mx-0.5" />
            </>
          )}
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet list"
          >
            <List className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Ordered list"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Blockquote"
          >
            <Quote className="w-3.5 h-3.5" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            active={editor.isActive('codeBlock')}
            title="Code block"
          >
            <Code2 className="w-3.5 h-3.5" />
          </ToolbarButton>
        </div>
        {/* Editor area */}
        <EditorContent
          editor={editor}
          className="tiptap-content px-3 py-2 min-h-[100px] text-sm focus:outline-none"
        />
      </div>
    )
  },
)

RichTextEditor.displayName = 'RichTextEditor'

export default RichTextEditor
```

- [ ] **Step 2: Add Tiptap styles to src/index.css**

Add these rules at the bottom of `src/index.css`:

```css
/* Tiptap editor content */
.tiptap-content .ProseMirror {
  outline: none;
}

.tiptap-content .ProseMirror p {
  margin: 0.25rem 0;
  line-height: 1.6;
}
.tiptap-content .ProseMirror h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.75rem 0 0.25rem;
}
.tiptap-content .ProseMirror h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
}
.tiptap-content .ProseMirror ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.tiptap-content .ProseMirror ol {
  list-style: decimal;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.tiptap-content .ProseMirror li {
  margin: 0.1rem 0;
}
.tiptap-content .ProseMirror code {
  background: hsl(var(--secondary));
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-size: 0.85em;
}
.tiptap-content .ProseMirror pre {
  background: hsl(var(--secondary));
  padding: 0.75rem 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.tiptap-content .ProseMirror pre code {
  background: none;
  padding: 0;
}
.tiptap-content .ProseMirror blockquote {
  border-left: 3px solid hsl(var(--border));
  padding-left: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin: 0.5rem 0;
}
.tiptap-content .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  color: hsl(var(--muted-foreground));
  pointer-events: none;
  float: left;
  height: 0;
}

/* Mention chips */
.mention {
  background-color: hsl(var(--primary) / 0.12);
  color: hsl(var(--primary));
  font-weight: 500;
  padding: 0.1em 0.35em;
  border-radius: 4px;
  font-size: 0.9em;
  cursor: default;
}

/* Read-only tiptap render (description view, comment display) */
.tiptap-render p {
  margin: 0.25rem 0;
  line-height: 1.6;
}
.tiptap-render h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0.75rem 0 0.25rem;
}
.tiptap-render h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
}
.tiptap-render ul {
  list-style: disc;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.tiptap-render ol {
  list-style: decimal;
  padding-left: 1.25rem;
  margin: 0.25rem 0;
}
.tiptap-render li {
  margin: 0.1rem 0;
}
.tiptap-render code {
  background: hsl(var(--secondary));
  padding: 0.1em 0.3em;
  border-radius: 4px;
  font-size: 0.85em;
}
.tiptap-render pre {
  background: hsl(var(--secondary));
  padding: 0.75rem 1rem;
  border-radius: 8px;
  overflow-x: auto;
  margin: 0.5rem 0;
}
.tiptap-render pre code {
  background: none;
  padding: 0;
}
.tiptap-render blockquote {
  border-left: 3px solid hsl(var(--border));
  padding-left: 0.75rem;
  color: hsl(var(--muted-foreground));
  margin: 0.5rem 0;
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/features/cards/RichTextEditor.tsx src/index.css
git commit -m "feat: add RichTextEditor component with toolbar and @mention support"
```

---

## Task 9: Rewrite CardDescription.tsx

**Files:**

- Rewrite: `src/features/cards/CardDescription.tsx`

- [ ] **Step 1: Replace the entire file**

```typescript
import { useRef } from 'react'
import { AlignLeft } from 'lucide-react'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import type { JSONContent } from '@tiptap/core'
import { Button } from '@/components/ui/button'
import RichTextEditor, { type RichTextEditorRef } from './RichTextEditor'
import type { MentionMember } from './MentionList'
import { parseDescription, extractMentions, diffMentions } from './activityUtils'
import { apiInsertActivity } from '@/api/activity'
import { sendNotification } from '@/context/NotificationContext'
import { useState } from 'react'

interface CardDescriptionProps {
  description: string
  boardId: string
  cardId: string
  boardTitle: string
  actorEmail: string
  actorName: string
  boardMembers: MentionMember[]
  onSave: (descriptionJson: string) => void
}

function renderToHTML(content: JSONContent): string {
  return generateHTML(content, [
    StarterKit,
    Mention.configure({ HTMLAttributes: { class: 'mention' } }),
  ])
}

export default function CardDescription({
  description,
  boardId,
  cardId,
  boardTitle,
  actorEmail,
  actorName,
  boardMembers,
  onSave,
}: CardDescriptionProps) {
  const [editing, setEditing] = useState(false)
  const editorRef = useRef<RichTextEditorRef>(null)
  const prevMentionsRef = useRef<Array<{ id: string; label: string }>>([])

  const currentContent = parseDescription(description)

  const handleClickArea = () => {
    prevMentionsRef.current = extractMentions(currentContent)
    setEditing(true)
  }

  const handleSave = async () => {
    const content = editorRef.current?.getContent()
    if (!content) return

    onSave(JSON.stringify(content))
    setEditing(false)

    void apiInsertActivity({ boardId, cardId, actorEmail, actorName, type: 'description_updated' })

    const newMentions = diffMentions(prevMentionsRef.current, extractMentions(content))
    for (const mention of newMentions) {
      const member = boardMembers.find((m) => m.userId === mention.id)
      if (member?.email && member.email !== actorEmail) {
        void sendNotification({
          userEmail: member.email,
          title: `@mention — ${boardTitle}`,
          body: `${actorName} mentioned you in a card description`,
          boardId,
          cardId,
        })
      }
    }
  }

  const handleCancel = () => {
    editorRef.current?.resetContent(currentContent)
    setEditing(false)
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlignLeft className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Description</span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <RichTextEditor
            ref={editorRef}
            content={currentContent}
            placeholder="Add a more detailed description..."
            members={boardMembers}
            autoFocus
            showHeadings
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleClickArea}
          className="w-full text-left min-h-[80px] rounded-xl p-4 text-sm cursor-pointer transition-colors bg-white hover:bg-gray-50 border border-border/40"
        >
          {description ? (
            <div
              className="tiptap-render"
              dangerouslySetInnerHTML={{ __html: renderToHTML(currentContent) }}
            />
          ) : (
            <span className="text-gray-500">Add a more detailed description...</span>
          )}
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update CardDetailModal.tsx to pass new props to CardDescription**

In `src/features/cards/CardDetailModal.tsx`, find the `<CardDescription>` call (around line 557–560) and update it. You will also need to update imports at the top of the file.

Add to imports:

```typescript
import type { MentionMember as MentionMemberType } from './MentionList'
```

The existing `BoardMember` interface at lines 53–57 already matches `MentionMemberType`. You can use it directly. Change the `<CardDescription>` usage from:

```tsx
<CardDescription
  description={card.description}
  onSave={(desc) => updateCard(boardId, listId, cardId, { description: desc })}
/>
```

To:

```tsx
<CardDescription
  description={card.description}
  boardId={boardId}
  cardId={cardId}
  boardTitle={board?.title ?? ''}
  actorEmail={user?.email ?? ''}
  actorName={
    user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? ''
  }
  boardMembers={boardMembers}
  onSave={(desc) => updateCard(boardId, listId, cardId, { description: desc })}
/>
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 4: Start dev server and smoke-test the description editor**

```bash
npm run dev
```

Open a card detail. Click the description area — the Tiptap toolbar should appear. Type text, bold something, try `@` — the member dropdown should appear. Click Save. The read view should render the formatted content.

- [ ] **Step 5: Commit**

```bash
git add src/features/cards/CardDescription.tsx src/features/cards/CardDetailModal.tsx
git commit -m "feat: rewrite CardDescription with Tiptap rich text editor and @mentions"
```

---

## Task 10: Update CardDetailModal — comment editor + feed state

This task replaces the old textarea comment input with `RichTextEditor` and sets up state for the merged comments+activity feed.

**Files:**

- Modify: `src/features/cards/CardDetailModal.tsx`

- [ ] **Step 1: Add new imports to CardDetailModal.tsx**

At the top of `src/features/cards/CardDetailModal.tsx`, add these imports after the existing ones:

```typescript
import { useRef } from 'react'
import type { JSONContent } from '@tiptap/core'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Mention from '@tiptap/extension-mention'
import RichTextEditor, { type RichTextEditorRef } from './RichTextEditor'
import { apiFetchComments, apiAddComment, apiDeleteComment } from '@/api/comments'
import { apiFetchActivity } from '@/api/activity'
import { supabase } from '@/lib/supabase'
import type { CardComment, ActivityEntry } from '@/types/board'
import {
  extractMentions,
  diffMentions,
  extractPlainText,
  formatActivityMessage,
} from './activityUtils'
import { sendNotification } from '@/context/NotificationContext'
import { apiInsertActivity } from '@/api/activity'
import { Clock } from 'lucide-react'
```

Note: `useState`, `useRef`, `useEffect` are already imported — just add `useCallback` if it's not there.

- [ ] **Step 2: Replace comment state and add feed state**

Find and remove these existing state declarations in `CardDetailModal`:

```typescript
const [newComment, setNewComment] = useState('')
```

And remove the existing `comments` derivation:

```typescript
const comments = card.comments ?? []
```

Replace with:

```typescript
const commentEditorRef = useRef<RichTextEditorRef>(null)
const [cardComments, setCardComments] = useState<CardComment[]>([])
const [cardActivity, setCardActivity] = useState<ActivityEntry[]>([])
const [feedLoading, setFeedLoading] = useState(true)
const prevCommentMentionsRef = useRef<Array<{ id: string; label: string }>>([])
```

- [ ] **Step 3: Add feed fetch + realtime subscription effects**

Add these `useEffect` blocks after the existing effects in `CardDetailModal`:

```typescript
// Fetch comments + activity when modal opens
useEffect(() => {
  let cancelled = false
  setFeedLoading(true)

  Promise.all([apiFetchComments(boardId, cardId), apiFetchActivity(boardId, cardId)]).then(
    ([comments, activity]) => {
      if (cancelled) return
      setCardComments(comments)
      setCardActivity(activity)
      setFeedLoading(false)
    }
  )

  return () => {
    cancelled = true
  }
}, [boardId, cardId])

// Realtime: new comments
useEffect(() => {
  const channel = supabase
    .channel(`card-comments-${cardId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'card_comments', filter: `card_id=eq.${cardId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown>
        setCardComments((prev) => [
          ...prev,
          {
            id: row.id as string,
            boardId: row.board_id as string,
            cardId: row.card_id as string,
            authorEmail: row.author_email as string,
            authorName: row.author_name as string,
            content: row.content as object,
            createdAt: row.created_at as string,
          },
        ])
      }
    )
    .on(
      'postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'card_comments', filter: `card_id=eq.${cardId}` },
      (payload) => {
        const row = payload.old as Record<string, unknown>
        setCardComments((prev) => prev.filter((c) => c.id !== (row.id as string)))
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'card_activity', filter: `card_id=eq.${cardId}` },
      (payload) => {
        const row = payload.new as Record<string, unknown>
        setCardActivity((prev) => [
          ...prev,
          {
            id: row.id as string,
            boardId: row.board_id as string,
            cardId: row.card_id as string,
            actorEmail: row.actor_email as string,
            actorName: row.actor_name as string,
            type: row.type as ActivityEntry['type'],
            payload: row.payload as Record<string, string>,
            createdAt: row.created_at as string,
          },
        ])
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, [cardId])
```

- [ ] **Step 4: Add handleAddComment**

Add this function **after `if (!card) return null`** (replaces the old `handleAddComment`). `actorEmail` and `actorName` are defined just below the null check in Task 12:

```typescript
const handleAddComment = async () => {
  const content = commentEditorRef.current?.getContent()
  if (!content) return
  const plain = extractPlainText(content)
  if (!plain) return

  const added = await apiAddComment(boardId, cardId, actorEmail, actorName, content)
  if (!added) return

  commentEditorRef.current?.resetContent(null)
  prevCommentMentionsRef.current = []
}
```

Note: `actorEmail` and `actorName` will be defined at the component level in Task 12. For now, declare them locally in this function until Task 12 adds them to the component scope.

- [ ] **Step 5: Add handleDeleteComment**

Add this function **after `if (!card) return null`** (replaces the old `handleDeleteComment`):

```typescript
const handleDeleteOwnComment = async (commentId: string) => {
  setCardComments((prev) => prev.filter((c) => c.id !== commentId))
  await apiDeleteComment(commentId)
}
```

- [ ] **Step 6: Remove old comment-related handlers**

Delete the old `handleAddComment` and `handleDeleteComment` functions (they wrote to `card.comments` via `updateCard`). Also remove the old `comments` variable derivation if it wasn't removed in Step 2.

- [ ] **Step 7: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/features/cards/CardDetailModal.tsx
git commit -m "feat: replace comment state with card_comments DB table and realtime feed"
```

---

## Task 11: Update CardDetailModal — merged feed display + comment input UI

**Files:**

- Modify: `src/features/cards/CardDetailModal.tsx`

- [ ] **Step 1: Add feed render helper**

Add this function inside `CardDetailModal` (before the return):

```typescript
function renderCommentHTML(content: object): string {
  return generateHTML(content as JSONContent, [
    StarterKit,
    Mention.configure({ HTMLAttributes: { class: 'mention' } }),
  ])
}
```

- [ ] **Step 2: Build the merged feed**

Add this derivation before the return statement:

```typescript
type FeedItem = { kind: 'comment'; data: CardComment } | { kind: 'activity'; data: ActivityEntry }

const feed: FeedItem[] = [
  ...cardComments.map((c) => ({ kind: 'comment' as const, data: c })),
  ...cardActivity.map((a) => ({ kind: 'activity' as const, data: a })),
].sort((a, b) => new Date(a.data.createdAt).getTime() - new Date(b.data.createdAt).getTime())
```

- [ ] **Step 3: Replace the comments section in the JSX**

Find the right column of the modal (currently contains the textarea comment input and old comment list, around lines 563–637). Replace the entire right column contents with:

```tsx
{
  /* Right Column — Activity + Comments */
}
;<div className="w-80 shrink-0 border-l border-border/30 flex flex-col overflow-hidden">
  <div className="px-4 pt-4 pb-2 shrink-0">
    <div className="flex items-center gap-2">
      <MessageSquare className="w-4 h-4 text-muted-foreground" />
      <span className="text-sm font-medium">Activity</span>
    </div>
  </div>

  {/* Feed */}
  <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-3">
    {feedLoading ? (
      <p className="text-xs text-muted-foreground py-2">Loading...</p>
    ) : feed.length === 0 ? (
      <p className="text-xs text-muted-foreground py-2">No activity yet.</p>
    ) : (
      feed.map((item) => {
        if (item.kind === 'activity') {
          const entry = item.data
          return (
            <div key={entry.id} className="flex items-start gap-2 text-xs text-muted-foreground">
              <Clock className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div className="min-w-0">
                <span>{formatActivityMessage(entry.type, entry.actorName, entry.payload)}</span>
                <span className="ml-1.5 text-muted-foreground/60">
                  {formatCommentTime(entry.createdAt)}
                </span>
              </div>
            </div>
          )
        }

        // Comment
        const comment = item.data
        const initials = comment.authorName
          .split(' ')
          .map((w: string) => w[0])
          .join('')
          .toUpperCase()
          .slice(0, 2)
        const isOwn = comment.authorEmail === user?.email

        return (
          <div key={comment.id} className="flex items-start gap-2">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0 mt-0.5"
              style={{ backgroundColor: getMemberColor(comment.authorName) }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-xs font-semibold">{comment.authorName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatCommentTime(comment.createdAt)}
                </span>
                {isOwn && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOwnComment(comment.id)}
                    className="ml-auto text-xs text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
              <div
                className="tiptap-render text-sm bg-secondary/30 rounded-xl px-3 py-2"
                dangerouslySetInnerHTML={{ __html: renderCommentHTML(comment.content) }}
              />
            </div>
          </div>
        )
      })
    )}
  </div>

  {/* Comment input */}
  <div className="px-4 pt-2 pb-4 border-t border-border/30 shrink-0 space-y-2">
    <RichTextEditor
      ref={commentEditorRef}
      content={null}
      placeholder="Write a comment... (⌘↵ to submit)"
      members={boardMembers}
      showHeadings={false}
      onSubmit={handleAddComment}
    />
    <div className="flex justify-end">
      <Button size="sm" onClick={handleAddComment}>
        <Send className="w-3.5 h-3.5 mr-1" />
        Comment
      </Button>
    </div>
  </div>
</div>
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 5: Smoke-test in the browser**

```bash
npm run dev
```

Open a card. The right column should show the activity feed and a Tiptap comment editor. Add a comment — it should appear in the feed. Refresh the page — the comment should persist (loaded from Supabase).

- [ ] **Step 6: Commit**

```bash
git add src/features/cards/CardDetailModal.tsx
git commit -m "feat: render merged activity+comment feed with Tiptap comment editor"
```

---

## Task 12: Wire activity inserts in CardDetailModal

**Files:**

- Modify: `src/features/cards/CardDetailModal.tsx`

All activity inserts are fire-and-forget (`void`). The actor name is derived the same way throughout: `user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? 'Unknown'`.

Add a helper at the top of the component body:

```typescript
const actorEmail = user?.email ?? ''
const actorName =
  user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? 'Unknown'
```

- [ ] **Step 1: Member assign/unassign activity — update handleToggleMember**

Find `handleToggleMember` (around line 228) and replace it:

```typescript
const handleToggleMember = (member: BoardMember) => {
  const currentMembers = card.members ?? []
  const isAssigned = currentMembers.some((m) => m.id === member.userId)
  const updated = isAssigned
    ? currentMembers.filter((m) => m.id !== member.userId)
    : [
        ...currentMembers,
        { id: member.userId, name: member.display_name || member.email || member.userId },
      ]
  updateCard(boardId, listId, cardId, { members: updated })

  const memberName = member.display_name || member.email || member.userId
  void apiInsertActivity({
    boardId,
    cardId,
    actorEmail,
    actorName,
    type: isAssigned ? 'member_unassigned' : 'member_assigned',
    payload: { userId: member.userId, userName: memberName },
  })
}
```

- [ ] **Step 2: Due date activity — update handleDueDateChange**

Find `handleDueDateChange` (around line 133) and replace it:

```typescript
const handleDueDateChange = (newDueDate: string | null) => {
  const formatted = newDueDate ? format(new Date(newDueDate), 'yyyy-MM-dd') : ''
  const prevDate = card.dueDate

  setDueDate(formatted)
  updateCard(boardId, listId, cardId, { dueDate: newDueDate })

  if (!newDueDate) {
    void apiInsertActivity({ boardId, cardId, actorEmail, actorName, type: 'due_date_removed' })
  } else if (!prevDate) {
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      type: 'due_date_set',
      payload: { date: format(new Date(newDueDate), 'MMM d, yyyy') },
    })
  } else {
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      type: 'due_date_changed',
      payload: {
        from: format(new Date(prevDate), 'MMM d, yyyy'),
        to: format(new Date(newDueDate), 'MMM d, yyyy'),
      },
    })
  }
}
```

- [ ] **Step 3: Archive activity — update handleDelete**

Find `handleDelete` (around line 237) and replace it:

```typescript
const handleDelete = () => {
  void apiInsertActivity({ boardId, cardId, actorEmail, actorName, type: 'archived' })
  archiveCard(boardId, listId, cardId)
  onClose()
}
```

- [ ] **Step 4: Comment activity — update handleAddComment**

Add the activity insert to `handleAddComment` (defined in Task 10). Replace it with:

```typescript
const handleAddComment = useCallback(async () => {
  const content = commentEditorRef.current?.getContent()
  if (!content) return
  const plain = extractPlainText(content)
  if (!plain) return

  const added = await apiAddComment(boardId, cardId, actorEmail, actorName, content)
  if (!added) return

  void apiInsertActivity({
    boardId,
    cardId,
    actorEmail,
    actorName,
    type: 'comment_added',
    payload: { preview: plain.slice(0, 60) },
  })

  commentEditorRef.current?.resetContent(null)
  prevCommentMentionsRef.current = []
}, [boardId, cardId, actorEmail, actorName])
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

- [ ] **Step 6: Smoke-test activity entries**

```bash
npm run dev
```

Assign a member → activity entry should appear in the feed. Change a due date → activity entry appears. Add a comment → activity entry appears. Archive a card → activity entry created (check Supabase table).

- [ ] **Step 7: Commit**

```bash
git add src/features/cards/CardDetailModal.tsx
git commit -m "feat: wire activity inserts for member, due date, archive, and comment events"
```

---

## Task 13: Wire notifications in CardDetailModal

**Files:**

- Modify: `src/features/cards/CardDetailModal.tsx`

All notifications are fire-and-forget (`void`). The `boardMembers` prop is already available in `CardDetailModal`.

Add this helper **after `if (!card) return null`** (alongside the other handlers). It uses `card.members` which is only safe after the null check:

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

- [ ] **Step 1: Member assign notification — update handleToggleMember**

In the `handleToggleMember` you updated in Task 12, add notification calls:

```typescript
const handleToggleMember = (member: BoardMember) => {
  const currentMembers = card.members ?? []
  const isAssigned = currentMembers.some((m) => m.id === member.userId)
  const updated = isAssigned
    ? currentMembers.filter((m) => m.id !== member.userId)
    : [
        ...currentMembers,
        { id: member.userId, name: member.display_name || member.email || member.userId },
      ]
  updateCard(boardId, listId, cardId, { members: updated })

  const memberName = member.display_name || member.email || member.userId
  void apiInsertActivity({
    boardId,
    cardId,
    actorEmail,
    actorName,
    type: isAssigned ? 'member_unassigned' : 'member_assigned',
    payload: { userId: member.userId, userName: memberName },
  })

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
}
```

- [ ] **Step 2: Due date notification — update handleDueDateChange**

In `handleDueDateChange` from Task 12, add notification calls after the activity inserts:

```typescript
const handleDueDateChange = (newDueDate: string | null) => {
  const formatted = newDueDate ? format(new Date(newDueDate), 'yyyy-MM-dd') : ''
  const prevDate = card.dueDate

  setDueDate(formatted)
  updateCard(boardId, listId, cardId, { dueDate: newDueDate })

  const boardTitle = board?.title ?? ''
  const cardTitle = card.title

  if (!newDueDate) {
    void apiInsertActivity({ boardId, cardId, actorEmail, actorName, type: 'due_date_removed' })
    notifyAssignedMembers(
      actorEmail,
      `${cardTitle} — ${boardTitle}`,
      `${actorName} removed the due date`
    )
  } else if (!prevDate) {
    const dateStr = format(new Date(newDueDate), 'MMM d, yyyy')
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      type: 'due_date_set',
      payload: { date: dateStr },
    })
    notifyAssignedMembers(
      actorEmail,
      `${cardTitle} — ${boardTitle}`,
      `${actorName} set the due date to ${dateStr}`
    )
  } else {
    const toStr = format(new Date(newDueDate), 'MMM d, yyyy')
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      type: 'due_date_changed',
      payload: { from: format(new Date(prevDate), 'MMM d, yyyy'), to: toStr },
    })
    notifyAssignedMembers(
      actorEmail,
      `${cardTitle} — ${boardTitle}`,
      `${actorName} changed the due date to ${toStr}`
    )
  }
}
```

- [ ] **Step 3: Archive notification — update handleDelete**

```typescript
const handleDelete = () => {
  const boardTitle = board?.title ?? ''
  const cardTitle = card.title
  notifyAssignedMembers(
    actorEmail,
    `${cardTitle} — ${boardTitle}`,
    `${actorName} archived this card`
  )
  void apiInsertActivity({ boardId, cardId, actorEmail, actorName, type: 'archived' })
  archiveCard(boardId, listId, cardId)
  onClose()
}
```

- [ ] **Step 4: Comment notification + mention notification — update handleAddComment**

Replace `handleAddComment` (defined in Task 10) with the full version. `actorEmail`, `actorName`, and `notifyAssignedMembers` are already in component scope:

```typescript
const handleAddComment = async () => {
  const content = commentEditorRef.current?.getContent()
  if (!content) return
  const plain = extractPlainText(content)
  if (!plain) return

  const added = await apiAddComment(boardId, cardId, actorEmail, actorName, content)
  if (!added) return

  void apiInsertActivity({
    boardId,
    cardId,
    actorEmail,
    actorName,
    type: 'comment_added',
    payload: { preview: plain.slice(0, 60) },
  })

  const boardTitle = board?.title ?? ''
  const cardTitle = card.title

  notifyAssignedMembers(
    actorEmail,
    `${cardTitle} — ${boardTitle}`,
    `${actorName} commented: ${plain.slice(0, 80)}`
  )

  const newMentions = diffMentions(prevCommentMentionsRef.current, extractMentions(content))
  for (const mention of newMentions) {
    const member = boardMembers.find((m) => m.userId === mention.id)
    if (member?.email && member.email !== actorEmail) {
      void sendNotification({
        userEmail: member.email,
        title: `@mention — ${boardTitle}`,
        body: `${actorName} mentioned you in a comment on ${cardTitle}`,
        boardId,
        cardId,
      })
    }
  }

  commentEditorRef.current?.resetContent(null)
  prevCommentMentionsRef.current = []
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/features/cards/CardDetailModal.tsx
git commit -m "feat: wire notifications for member assign, due date, archive, comment, and @mentions"
```

---

## Task 14: Card-move activity + notification in BoardViewPage

**Files:**

- Modify: `src/features/board-view/BoardViewPage.tsx`

- [ ] **Step 1: Add imports to BoardViewPage.tsx**

At the top of `src/features/board-view/BoardViewPage.tsx`, add:

```typescript
import type { DropResult } from '@hello-pangea/dnd'
import { apiInsertActivity } from '@/api/activity'
import { sendNotification } from '@/context/NotificationContext'
import { useAuth } from '@/context/AuthContext'
```

Also add `useAuth` to the existing imports if not present.

- [ ] **Step 2: Add useAuth hook call**

Inside the `BoardViewPage` component, near the top with the other hook calls, add:

```typescript
const { user } = useAuth()
```

- [ ] **Step 3: Replace the inline onDragEnd handler**

Find the `DragDropContext` usage (around line 151):

```tsx
<DragDropContext onDragEnd={(result) => handleDragEnd(boardId!, result)}>
```

Replace with a reference to a new handler:

```tsx
<DragDropContext onDragEnd={handleDragEndWithNotify}>
```

- [ ] **Step 4: Define handleDragEndWithNotify**

Add this function before the return statement in `BoardViewPage`:

```typescript
const handleDragEndWithNotify = (result: DropResult) => {
  const { source, destination, type } = result
  if (!destination) {
    handleDragEnd(boardId!, result)
    return
  }
  if (type !== 'card' || source.droppableId === destination.droppableId) {
    handleDragEnd(boardId!, result)
    return
  }

  // Capture state before the move
  const srcList = board.lists.find((l) => l.id === source.droppableId)
  const destList = board.lists.find((l) => l.id === destination.droppableId)
  const movedCard = srcList?.cards[source.index]

  handleDragEnd(boardId!, result)

  if (!movedCard || !srcList || !destList) return

  const actorEmail = user?.email ?? ''
  const actorName =
    user?.user_metadata?.display_name ?? user?.user_metadata?.full_name ?? user?.email ?? 'Unknown'

  void apiInsertActivity({
    boardId: boardId!,
    cardId: movedCard.id,
    actorEmail,
    actorName,
    type: 'moved',
    payload: { from: srcList.title, to: destList.title },
  })

  for (const assignedMember of movedCard.members ?? []) {
    const member = boardMembers.find((m) => m.userId === assignedMember.id)
    if (member?.email && member.email !== actorEmail) {
      void sendNotification({
        userEmail: member.email,
        title: `${movedCard.title} — ${board.title}`,
        body: `${actorName} moved this from ${srcList.title} to ${destList.title}`,
        boardId: boardId!,
        cardId: movedCard.id,
      })
    }
  }
}
```

- [ ] **Step 5: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6: Smoke-test card move**

```bash
npm run dev
```

Drag a card to a different list. Check the card's activity feed — "moved this from X to Y" should appear. If the card has assigned members, check their notifications panel.

- [ ] **Step 7: Final lint check**

```bash
npm run lint
```

Expected: 0 errors or warnings about the new code.

- [ ] **Step 8: Run all tests**

```bash
npm run test:run
```

Expected: all 17 tests pass.

- [ ] **Step 9: Commit**

```bash
git add src/features/board-view/BoardViewPage.tsx
git commit -m "feat: wire card-move activity log and notification on drag-and-drop"
```

---

## Final Checklist

- [ ] All 17 utility tests pass (`npm run test:run`)
- [ ] `npx tsc --noEmit` reports 0 errors
- [ ] `npm run lint` reports 0 errors
- [ ] Description editor: click to edit, toolbar works, markdown shortcuts work, Save/Cancel work
- [ ] Description read view renders formatted content with `@mention` chips
- [ ] @mentions dropdown opens on `@`, filters as you type, keyboard navigable, inserts chip
- [ ] Comment editor submits on button click and Cmd/Ctrl+Enter
- [ ] Comments persist across page refresh (loaded from `card_comments`)
- [ ] Activity feed shows merged entries in chronological order
- [ ] Member assign/unassign → activity entry + notification
- [ ] Due date set/change/remove → activity entry + notification
- [ ] Card archive → activity entry + notification for assigned members
- [ ] Comment added → activity entry + notification for assigned members
- [ ] @mention in description/comment → notification for mentioned user
- [ ] Card dragged to different list → activity entry + notification
- [ ] No self-notifications (actor never notified of own actions)
