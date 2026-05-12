# Board Members & Sharing — Design Spec
**Date:** 2026-05-12  
**Status:** Approved

## Overview

Add Trello-like board membership to Esperia Trello. Any `@esperiastudio.com` user can be invited to a board with a role (Admin, Member, Observer). Shared boards appear in the invitee's home page. The feature is accessible from inside the board view, not just from `/collaborators`.

---

## 1. Database & Data Model

### New Tables

```sql
-- One row per board (replaces the per-user JSONB blob in app_boards)
CREATE TABLE public.boards (
  id TEXT PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Membership junction table
CREATE TABLE public.board_members (
  board_id TEXT REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'observer')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);
```

### RLS Policies

**boards:**
- SELECT: `owner_id = auth.uid()` OR exists in `board_members`
- INSERT: `owner_id = auth.uid()`
- UPDATE: owner OR member with role `admin` or `member`
- DELETE: `owner_id = auth.uid()` only

**board_members:**
- SELECT: any user who can access the board (owner OR any member) — needed to render the Members Panel
- INSERT: owner OR existing admin member
- UPDATE: owner OR existing admin member (for role changes)
- DELETE: owner, admin, OR `user_id = auth.uid()` (leave board)

### Migration

On `BoardContext` startup, if `app_boards` has data and `boards` has none for the current user, all boards are batch-inserted into `boards` automatically. A `migrated_to_boards_v2` flag in localStorage prevents re-running. `app_boards` is left untouched as a backup.

---

## 2. BoardContext & Data Access Layer

**Loading:**  
Two parallel queries merged into a single boards array:
1. `SELECT * FROM boards WHERE owner_id = user.id`
2. `SELECT boards.* FROM boards JOIN board_members ON boards.id = board_members.board_id WHERE board_members.user_id = user.id`

**Saving:**  
Each board saves to its own row: `UPDATE boards SET data = $1, updated_at = NOW() WHERE id = $2`. Debounced 1s as today.

**Creating:**  
`INSERT INTO boards (id, owner_id, data)`.

**Deleting/archiving:**  
Only available when `owner_id = user.id`.

**Role helper:**  
`getBoardRole(boardId)` → `'owner' | 'admin' | 'member' | 'observer' | null`. Derived from loaded boards + membership data. Exposed via BoardContext.

**Realtime:**  
Subscribe to Supabase Realtime on `boards` table filtered to accessible board IDs (re-subscribed when membership changes).

---

## 3. Board Member Management UI

### BoardView Header

Next to the board title and star button:
- Stacked member avatars (up to 4 shown, `+N` overflow badge). Each avatar has a tooltip with name + role.
- Clicking the avatars opens the **Members Panel**.
- **"+ Invite"** button — visible to owner and admins only. Opens the **Invite Modal**.
- Also accessible via the existing board options menu (`⋯`) with a "Members" item.

### Invite Modal

- Debounced search input queries `app_users` by name or email.
- Results: avatar + display name + email. Already-added members grayed out and non-selectable.
- Selecting a user shows a role picker (Admin / Member / Observer) before confirming.
- Confirm → `INSERT INTO board_members`.

### Members Panel

- Lists all members: avatar, name, email, role badge.
- Owner row labeled "Owner" — not editable.
- Admins and owner can change any member's role (dropdown) or remove them (× button).
- Any non-owner member sees a "Leave board" option for themselves.

---

## 4. Home Page

Two labeled sections:

- **Your Boards** — boards where `owner_id = user.id` (existing behavior)
- **Shared with You** — boards where the user is in `board_members`. Each card shows a "Shared by [Owner Name]" label beneath the board title.

Starred boards section only includes owned boards. Board creation unchanged.

---

## 5. Roles & Permissions

| Action | Owner | Admin | Member | Observer |
|---|---|---|---|---|
| View board | ✓ | ✓ | ✓ | ✓ |
| Edit cards & lists | ✓ | ✓ | ✓ | ✗ |
| Invite members | ✓ | ✓ | ✗ | ✗ |
| Change member roles | ✓ | ✓ | ✗ | ✗ |
| Remove members | ✓ | ✓ | ✗ | ✗ |
| Leave board | — | ✓ | ✓ | ✓ |
| Archive / delete board | ✓ | ✗ | ✗ | ✗ |

**Observer enforcement:** Edit controls (drag-drop, add card/list, inline title editing) are hidden at the UI level when `getBoardRole()` returns `observer`. RLS denies `UPDATE` on `boards` for observers at the DB level.

**Out of scope:** Ownership transfer, board-level public sharing, email notifications for invites.

---

## 6. Files to Create / Modify

| File | Change |
|---|---|
| `supabase-boards-members.sql` | New migration: boards + board_members tables + RLS |
| `src/context/BoardContext.jsx` | Full rewrite: load/save individual rows, migration logic, role helper |
| `src/pages/Home.jsx` | Two sections: owned boards + shared boards |
| `src/pages/BoardView.jsx` | Add member avatars, Invite button, options menu item |
| `src/components/BoardMembersPanel.jsx` | New: members list with role management |
| `src/components/InviteMemberModal.jsx` | New: user search + role picker + invite action |
| `src/components/BoardCard.jsx` | Add "Shared by" label for shared boards |
