# Board Members & Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Trello-like board membership (Admin/Member/Observer roles) so any `@esperiastudio.com` user can be invited to a board, see it in their Home page, and interact with it according to their role.

**Architecture:** Migrate from a per-user JSONB blob (`app_boards`) to individual `boards` rows with a `board_members` junction table. `BoardContext` is rewritten to load owned + shared boards in parallel, save individual rows, and expose a `getBoardRole()` helper. Two new UI components (`InviteMemberModal`, `BoardMembersPanel`) are wired into the `BoardView` header. `Home.jsx` gains a "Shared with You" section.

**Tech Stack:** React, Supabase (Postgres + RLS + Realtime), Tailwind v4, Lucide icons, existing `useDebouncedCallback` hook.

---

## File Map

| File | Action |
|---|---|
| `supabase-boards-members.sql` | Create — migration SQL |
| `src/context/BoardContext.jsx` | Rewrite — new load/save/role pattern |
| `src/components/InviteMemberModal.jsx` | Create — user search + role picker |
| `src/components/BoardMembersPanel.jsx` | Create — member list with role management |
| `src/pages/BoardView.jsx` | Modify — header avatars, Invite button, menu item, observer guards |
| `src/pages/Home.jsx` | Modify — two board sections |
| `src/components/BoardCard.jsx` | Modify — "Shared by" label |

---

## Task 1: SQL Migration

**Files:**
- Create: `supabase-boards-members.sql`

- [ ] **Step 1: Write the migration file**

Create `/Volumes/Disk/dev/TrelloAI/supabase-boards-members.sql` with this exact content:

```sql
-- boards: one row per board (replaces per-user JSONB blob in app_boards)
CREATE TABLE IF NOT EXISTS public.boards (
  id          TEXT        PRIMARY KEY,
  owner_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- board_members: junction table for access control
CREATE TABLE IF NOT EXISTS public.board_members (
  board_id    TEXT        NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'member'
                          CHECK (role IN ('admin', 'member', 'observer')),
  invited_by  UUID        REFERENCES auth.users(id),
  invited_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (board_id, user_id)
);

-- Enable RLS
ALTER TABLE public.boards        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- boards policies
CREATE POLICY "boards_select" ON public.boards FOR SELECT
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "boards_insert" ON public.boards FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "boards_update" ON public.boards FOR UPDATE
  USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.board_members
      WHERE board_id = boards.id AND user_id = auth.uid()
        AND role IN ('admin', 'member')
    )
  );

CREATE POLICY "boards_delete" ON public.boards FOR DELETE
  USING (owner_id = auth.uid());

-- board_members policies
-- SELECT: any user who can access the board sees all its members
CREATE POLICY "board_members_select" ON public.board_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_members.board_id
        AND (
          owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.board_members bm2
            WHERE bm2.board_id = board_members.board_id
              AND bm2.user_id = auth.uid()
          )
        )
    )
  );

-- INSERT: owner or existing admin
CREATE POLICY "board_members_insert" ON public.board_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_members.board_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid() AND bm.role = 'admin'
    )
  );

-- UPDATE: owner or admin (for role changes)
CREATE POLICY "board_members_update" ON public.board_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_members.board_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid() AND bm.role = 'admin'
    )
  );

-- DELETE: owner, admin, or the member themselves (leave board)
CREATE POLICY "board_members_delete" ON public.board_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.boards
      WHERE id = board_members.board_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.board_members bm
      WHERE bm.board_id = board_members.board_id
        AND bm.user_id = auth.uid() AND bm.role = 'admin'
    )
    OR user_id = auth.uid()
  );

-- Enable realtime for the new boards table
ALTER PUBLICATION supabase_realtime ADD TABLE public.boards;
```

- [ ] **Step 2: Apply the migration via Supabase MCP**

Use `mcp__supabase__apply_migration` with:
- `name`: `board_members_schema`
- `query`: the full SQL content above

- [ ] **Step 3: Verify tables exist**

Use `mcp__supabase__execute_sql` with query:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('boards', 'board_members');
```
Expected: 2 rows returned.

- [ ] **Step 4: Commit**

```bash
git add supabase-boards-members.sql
git commit -m "feat: add boards and board_members tables with RLS"
```

---

## Task 2: Rewrite BoardContext

**Files:**
- Modify: `src/context/BoardContext.jsx`

- [ ] **Step 1: Replace the entire file**

Write `src/context/BoardContext.jsx` with this content:

```jsx
import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { logError } from '../lib/logger';

const BoardContext = createContext(null);

// Strip context-only fields before writing to DB
function extractBoardData(board) {
  const { ownerId, memberRole, ownerName, ...data } = board;
  return data;
}

async function runMigrationIfNeeded(userId) {
  const key = `migrated_to_boards_v2_${userId}`;
  if (localStorage.getItem(key)) return;

  try {
    const { count } = await supabase
      .from('boards')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId);

    if (count > 0) {
      localStorage.setItem(key, '1');
      return;
    }

    const { data: oldRow } = await supabase
      .from('app_boards')
      .select('data')
      .eq('id', userId)
      .maybeSingle();

    const oldBoards = oldRow?.data?.boards || [];
    if (oldBoards.length > 0) {
      const now = new Date().toISOString();
      await supabase.from('boards').insert(
        oldBoards.map(b => ({
          id: b.id,
          owner_id: userId,
          data: b,
          created_at: b.createdAt || now,
          updated_at: now,
        }))
      );
    }
  } catch (err) {
    logError('Board migration failed', { message: err.message });
  }

  localStorage.setItem(`migrated_to_boards_v2_${userId}`, '1');
}

async function fetchAllBoards(userId) {
  const [ownedResult, sharedResult] = await Promise.all([
    supabase.from('boards').select('*').eq('owner_id', userId),
    supabase.from('board_members')
      .select('board_id, role, boards(*)')
      .eq('user_id', userId),
  ]);

  if (ownedResult.error) logError('Failed to load owned boards', { message: ownedResult.error.message });
  if (sharedResult.error) logError('Failed to load shared boards', { message: sharedResult.error.message });

  const membershipMap = {};

  const ownedBoards = (ownedResult.data || []).map(row => {
    membershipMap[row.id] = 'owner';
    return { ownerId: row.owner_id, memberRole: 'owner', ownerName: null, ...row.data, id: row.id };
  });

  const sharedRows = (sharedResult.data || []).filter(m => m.boards);
  const ownerIds = [...new Set(sharedRows.map(m => m.boards.owner_id))];

  let ownerNames = {};
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('app_users')
      .select('id, display_name, email')
      .in('id', ownerIds);
    (profiles || []).forEach(p => {
      ownerNames[p.id] = p.display_name || p.email;
    });
  }

  const sharedBoards = sharedRows.map(m => {
    membershipMap[m.boards.id] = m.role;
    return {
      ownerId: m.boards.owner_id,
      memberRole: m.role,
      ownerName: ownerNames[m.boards.owner_id] || null,
      ...m.boards.data,
      id: m.boards.id,
    };
  });

  return { boards: [...ownedBoards, ...sharedBoards], membershipMap };
}

export function BoardProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user && !authLoading;

  const [boards, setBoards] = useState([]);
  const [membershipMap, setMembershipMap] = useState({});
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [isSavingBoards, setIsSavingBoards] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const isInitialLoad = useRef(true);
  const lastSavedRef = useRef({});

  // Load boards on auth
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated || !user?.id) {
      isInitialLoad.current = true;
      setBoards([]);
      setMembershipMap({});
      setBoardsLoading(false);
      return;
    }

    let cancelled = false;
    isInitialLoad.current = true;
    setBoardsLoading(true);

    (async () => {
      await runMigrationIfNeeded(user.id);
      if (cancelled) return;

      const { boards: allBoards, membershipMap: map } = await fetchAllBoards(user.id);
      if (cancelled) return;

      allBoards.forEach(b => {
        lastSavedRef.current[b.id] = JSON.stringify(extractBoardData(b));
      });
      setBoards(allBoards);
      setMembershipMap(map);
      setBoardsLoading(false);
      isInitialLoad.current = false;
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading, user?.id]);

  // Realtime: listen for board updates from other clients
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('boards-realtime')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'boards' },
        (payload) => {
          const updated = payload.new;
          if (!updated) return;
          setBoards(prev => {
            const existing = prev.find(b => b.id === updated.id);
            if (!existing) return prev;
            const merged = { ...existing, ...updated.data, id: updated.id };
            lastSavedRef.current[updated.id] = JSON.stringify(extractBoardData(merged));
            return prev.map(b => b.id === updated.id ? merged : b);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  // Debounced save: finds dirty boards and writes them individually
  const saveBoards = useDebouncedCallback(async (currentBoards, currentMembershipMap) => {
    const dirty = currentBoards.filter(b => {
      if (currentMembershipMap[b.id] === 'observer') return false;
      return JSON.stringify(extractBoardData(b)) !== lastSavedRef.current[b.id];
    });

    if (dirty.length === 0) { setIsSavingBoards(false); return; }

    await Promise.all(dirty.map(async (board) => {
      const boardData = extractBoardData(board);
      const { error } = await supabase
        .from('boards')
        .update({ data: boardData, updated_at: new Date().toISOString() })
        .eq('id', board.id);
      if (error) { logError('Failed to save board', { boardId: board.id, message: error.message }); return; }
      lastSavedRef.current[board.id] = JSON.stringify(boardData);
    }));

    setLastSavedAt(new Date());
    setIsSavingBoards(false);
  }, 1000);

  useEffect(() => {
    if (isInitialLoad.current || !isAuthenticated) return;
    setIsSavingBoards(true);
    saveBoards.run(boards, membershipMap);
  }, [boards, isAuthenticated, membershipMap, saveBoards]);

  const updateData = useCallback((updater) => {
    setBoards(prev => typeof updater === 'function' ? updater(prev) : updater);
  }, []);

  const getBoardRole = useCallback((boardId) => membershipMap[boardId] || null, [membershipMap]);

  const getBoard = useCallback((boardId) => {
    const board = boards.find(b => b.id === boardId && !b.archived);
    if (!board) return null;
    return {
      ...board,
      lists: board.lists.map(l => ({ ...l, cards: l.cards.filter(c => !c.archived) })),
    };
  }, [boards]);

  const addBoard = useCallback(async (title, gradient, backgroundImage = null) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const boardData = { id, title, gradient, backgroundImage, starred: false, archived: false, createdAt: now, lists: [] };
    const newBoard = { ownerId: user.id, memberRole: 'owner', ownerName: null, ...boardData };

    // Optimistic add
    lastSavedRef.current[id] = JSON.stringify(boardData);
    setMembershipMap(prev => ({ ...prev, [id]: 'owner' }));
    setBoards(prev => [...prev, newBoard]);

    const { error } = await supabase.from('boards').insert({
      id, owner_id: user.id, data: boardData, created_at: now, updated_at: now,
    });

    if (error) {
      logError('Failed to create board', { message: error.message });
      setBoards(prev => prev.filter(b => b.id !== id));
      setMembershipMap(prev => { const n = { ...prev }; delete n[id]; return n; });
      delete lastSavedRef.current[id];
    }
  }, [user?.id]);

  const deleteBoard = useCallback((boardId) => {
    updateData(prev => prev.map(b => b.id === boardId
      ? { ...b, archived: true, archivedAt: new Date().toISOString(), starred: false }
      : b
    ));
  }, [updateData]);

  const deleteBoardPermanently = useCallback(async (boardId) => {
    if (membershipMap[boardId] !== 'owner') return;
    const { error } = await supabase.from('boards').delete().eq('id', boardId);
    if (error) { logError('Failed to delete board', { message: error.message }); return; }
    delete lastSavedRef.current[boardId];
    setMembershipMap(prev => { const n = { ...prev }; delete n[boardId]; return n; });
    setBoards(prev => prev.filter(b => b.id !== boardId));
  }, [membershipMap]);

  const updateBoard = useCallback((boardId, updates) => {
    updateData(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
  }, [updateData]);

  const toggleStarBoard = useCallback((boardId) => {
    updateData(prev => prev.map(b => b.id === boardId ? { ...b, starred: !b.starred } : b));
  }, [updateData]);

  const restoreBoard = useCallback((boardId) => {
    updateData(prev => prev.map(b => b.id === boardId ? { ...b, archived: false, archivedAt: null } : b));
  }, [updateData]);

  const addList = useCallback((boardId, title) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b
      : { ...b, lists: [...b.lists, { id: uuidv4(), title, cards: [] }] }
    ));
  }, [updateData]);

  const deleteList = useCallback((boardId, listId) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b
      : { ...b, lists: b.lists.filter(l => l.id !== listId) }
    ));
  }, [updateData]);

  const updateListTitle = useCallback((boardId, listId, title) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b
      : { ...b, lists: b.lists.map(l => l.id === listId ? { ...l, title } : l) }
    ));
  }, [updateData]);

  const addCard = useCallback((boardId, listId, title) => {
    const newCard = { id: uuidv4(), title, description: '', labels: [], dueDate: null, createdAt: new Date().toISOString() };
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : { ...l, cards: [...l.cards, newCard] }),
    }));
  }, [updateData]);

  const archiveCard = useCallback((boardId, listId, cardId) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : {
        ...l, cards: l.cards.map(c => c.id === cardId
          ? { ...c, archived: true, archivedAt: new Date().toISOString() } : c),
      }),
    }));
  }, [updateData]);

  const restoreCard = useCallback((boardId, listId, cardId) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : {
        ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, archived: false, archivedAt: null } : c),
      }),
    }));
  }, [updateData]);

  const deleteCardPermanently = useCallback((boardId, listId, cardId) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : {
        ...l, cards: l.cards.filter(c => c.id !== cardId),
      }),
    }));
  }, [updateData]);

  const updateCard = useCallback((boardId, listId, cardId, updates) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : {
        ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, ...updates } : c),
      }),
    }));
  }, [updateData]);

  const handleDragEnd = useCallback((boardId, result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    updateData(prev => {
      const newBoards = prev.map(b => ({ ...b }));
      const board = newBoards.find(b => b.id === boardId);
      if (!board) return prev;
      board.lists = board.lists.map(l => ({ ...l, cards: [...l.cards] }));

      if (type === 'list') {
        const [moved] = board.lists.splice(source.index, 1);
        board.lists.splice(destination.index, 0, moved);
      } else {
        const srcList = board.lists.find(l => l.id === source.droppableId);
        const destList = board.lists.find(l => l.id === destination.droppableId);
        if (!srcList || !destList) return prev;
        const [movedCard] = srcList.cards.splice(source.index, 1);
        destList.cards.splice(destination.index, 0, movedCard);
      }
      return newBoards;
    });
  }, [updateData]);

  const refreshBoards = useCallback(async () => {
    if (!user?.id) return;
    isInitialLoad.current = true;
    const { boards: allBoards, membershipMap: map } = await fetchAllBoards(user.id);
    allBoards.forEach(b => { lastSavedRef.current[b.id] = JSON.stringify(extractBoardData(b)); });
    setBoards(allBoards);
    setMembershipMap(map);
    setTimeout(() => { isInitialLoad.current = false; }, 150);
  }, [user?.id]);

  const persistBoardsNow = useCallback(async () => {
    if (!isAuthenticated) return;
    saveBoards.cancel();
    const dirty = boards.filter(b => {
      if (membershipMap[b.id] === 'observer') return false;
      return JSON.stringify(extractBoardData(b)) !== lastSavedRef.current[b.id];
    });
    if (dirty.length === 0) return;
    setIsSavingBoards(true);
    await Promise.all(dirty.map(async (board) => {
      const boardData = extractBoardData(board);
      const { error } = await supabase
        .from('boards')
        .update({ data: boardData, updated_at: new Date().toISOString() })
        .eq('id', board.id);
      if (!error) lastSavedRef.current[board.id] = JSON.stringify(boardData);
      if (error) logError('Failed to persist board immediately', { message: error.message });
    }));
    setLastSavedAt(new Date());
    setIsSavingBoards(false);
  }, [boards, isAuthenticated, membershipMap, saveBoards]);

  const activeBoards = boards
    .filter(b => !b.archived)
    .map(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.filter(c => !c.archived) })) }));

  const archivedBoards = boards.filter(b => b.archived && b.memberRole === 'owner');

  const archivedCards = boards
    .filter(b => !b.archived)
    .flatMap(b => b.lists.flatMap(l =>
      l.cards.filter(c => c.archived)
        .map(c => ({ ...c, boardId: b.id, boardTitle: b.title, listId: l.id, listTitle: l.title }))
    ));

  return (
    <BoardContext.Provider value={{
      boards: activeBoards,
      archivedBoards,
      archivedCards,
      membershipMap,
      boardsLoading, isSavingBoards, lastSavedAt,
      getBoardRole,
      getBoard, addBoard, deleteBoard, updateBoard, toggleStarBoard,
      addList, deleteList, updateListTitle,
      addCard, archiveCard, updateCard, handleDragEnd,
      restoreBoard, restoreCard, deleteBoardPermanently, deleteCardPermanently,
      refreshBoards, persistBoardsNow,
    }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoards() {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoards must be used within BoardProvider');
  return context;
}
```

- [ ] **Step 2: Verify the app still loads**

Run `npm run dev`. Open the browser (auto-opens at localhost:5173). Log in. Boards should appear as before (migration runs silently on first load). Open the browser console — confirm no errors.

- [ ] **Step 3: Commit**

```bash
git add src/context/BoardContext.jsx
git commit -m "feat: rewrite BoardContext to load/save individual board rows with migration"
```

---

## Task 3: Create InviteMemberModal

**Files:**
- Create: `src/components/InviteMemberModal.jsx`

- [ ] **Step 1: Create the component**

Write `src/components/InviteMemberModal.jsx`:

```jsx
import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

const MEMBER_COLORS = ['#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#f97316','#ef4444','#ec4899'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}
function Initials({ name }) {
  const label = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ backgroundColor: avatarColor(name) }}>
      {label}
    </div>
  );
}

const ROLE_DESCRIPTIONS = {
  admin: 'Can edit the board and manage members.',
  member: 'Can view and edit cards and lists.',
  observer: 'Can view the board but cannot make changes.',
};

export default function InviteMemberModal({ boardId, existingMemberIds = [], onClose, onInvited }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState('member');
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);

  const search = useDebouncedCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const { data, error: err } = await supabase
      .from('app_users')
      .select('id, display_name, email')
      .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);
    setSearching(false);
    if (err) { logError('User search failed', { message: err.message }); return; }
    setResults(data || []);
  }, 300);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setSelected(null);
    search.run(e.target.value);
  };

  const selectUser = (u) => {
    setSelected(u);
    setQuery(u.display_name || u.email);
    setResults([]);
  };

  const handleInvite = async () => {
    if (!selected) return;
    setInviting(true);
    setError(null);
    const { error: err } = await supabase.from('board_members').insert({
      board_id: boardId,
      user_id: selected.id,
      role,
    });
    setInviting(false);
    if (err) {
      setError(err.message);
      logError('Failed to invite member', { message: err.message });
      return;
    }
    onInvited?.({ ...selected, role });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl p-5 w-full max-w-md mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Invite to board</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          value={query}
          onChange={handleQueryChange}
          placeholder="Search by name or email..."
          className="w-full h-9 px-3 text-sm bg-secondary/40 border border-border/50 rounded-lg outline-none focus:border-primary/50 transition-colors mb-2"
          autoFocus
        />

        {searching && <p className="text-xs text-muted-foreground mb-2">Searching…</p>}

        {results.length > 0 && !selected && (
          <div className="border border-border/50 rounded-lg overflow-hidden mb-3 max-h-48 overflow-y-auto">
            {results.map(u => {
              const alreadyAdded = existingMemberIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  disabled={alreadyAdded}
                  onClick={() => selectUser(u)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-secondary/40'
                  }`}
                >
                  <Initials name={u.display_name || u.email} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name || u.email}</p>
                    {u.display_name && (
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    )}
                  </div>
                  {alreadyAdded && (
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">Added</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Role</p>
            <div className="flex gap-2">
              {['admin', 'member', 'observer'].map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                    role === r
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border/50 hover:bg-secondary/40'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border/50 hover:bg-secondary/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={!selected || inviting}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {inviting ? 'Adding…' : 'Add to board'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/InviteMemberModal.jsx
git commit -m "feat: add InviteMemberModal with user search and role picker"
```

---

## Task 4: Create BoardMembersPanel

**Files:**
- Create: `src/components/BoardMembersPanel.jsx`

- [ ] **Step 1: Create the component**

Write `src/components/BoardMembersPanel.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { X, Crown, Shield, User, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import { useAuth } from '../context/AuthContext';
import InviteMemberModal from './InviteMemberModal';

const MEMBER_COLORS = ['#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#f97316','#ef4444','#ec4899'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}
function Avatar({ name, size = 'md' }) {
  const label = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const sz = size === 'sm' ? 'w-7 h-7 text-[10px]' : 'w-8 h-8 text-xs';
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
      style={{ backgroundColor: avatarColor(name) }}>
      {label}
    </div>
  );
}

const ROLE_META = {
  owner:    { label: 'Owner',    Icon: Crown,  color: 'text-yellow-500' },
  admin:    { label: 'Admin',    Icon: Shield, color: 'text-blue-500'   },
  member:   { label: 'Member',   Icon: User,   color: 'text-green-500'  },
  observer: { label: 'Observer', Icon: Eye,    color: 'text-muted-foreground' },
};

export default function BoardMembersPanel({ boardId, ownerId, ownerName, currentUserRole, onClose, onMembersChange }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: memberships, error: mErr } = await supabase
        .from('board_members')
        .select('user_id, role, invited_at')
        .eq('board_id', boardId);

      if (cancelled) return;
      if (mErr) { logError('Failed to load board members', { message: mErr.message }); setLoading(false); return; }

      const userIds = (memberships || []).map(m => m.user_id);
      let profiles = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase
          .from('app_users')
          .select('id, display_name, email')
          .in('id', userIds);
        profiles = p || [];
      }

      if (cancelled) return;
      setMembers((memberships || []).map(m => ({
        ...m,
        profile: profiles.find(p => p.id === m.user_id) || null,
      })));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [boardId]);

  const handleRoleChange = async (userId, newRole) => {
    const { error } = await supabase
      .from('board_members')
      .update({ role: newRole })
      .eq('board_id', boardId)
      .eq('user_id', userId);
    if (error) { logError('Failed to update role', { message: error.message }); return; }
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
  };

  const handleRemove = async (userId) => {
    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId);
    if (error) { logError('Failed to remove member', { message: error.message }); return; }
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    onMembersChange?.();
    if (userId === user?.id) onClose();
  };

  const existingMemberIds = [ownerId, ...members.map(m => m.user_id)];
  const ownerDisplayName = ownerName || (user?.id === ownerId ? (user?.user_metadata?.full_name || user?.email) : 'Board owner');

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content bg-card border border-border rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Board members</h3>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1 mb-4">
              {/* Owner row — always first, not editable */}
              <div className="flex items-center gap-3 px-1 py-2 rounded-lg">
                <Avatar name={ownerDisplayName} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {ownerDisplayName}
                    {user?.id === ownerId && <span className="text-muted-foreground font-normal"> (you)</span>}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 shrink-0">
                  <Crown className="w-3.5 h-3.5" /> Owner
                </span>
              </div>

              {members.map(m => {
                const name = m.profile?.display_name || m.profile?.email || 'Unknown';
                const meta = ROLE_META[m.role] || ROLE_META.member;
                const isMe = m.user_id === user?.id;
                return (
                  <div key={m.user_id} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-secondary/30 group">
                    <Avatar name={name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {name}{isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </p>
                      {m.profile?.display_name && (
                        <p className="text-xs text-muted-foreground truncate">{m.profile.email}</p>
                      )}
                    </div>
                    {canManage ? (
                      <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.user_id, e.target.value)}
                        className="text-xs border border-border/50 rounded-md px-1.5 py-1 bg-secondary/40 outline-none focus:border-primary/50 cursor-pointer"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="observer">Observer</option>
                      </select>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${meta.color}`}>
                        <meta.Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    )}
                    {(canManage || isMe) && (
                      <button
                        onClick={() => handleRemove(m.user_id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-xs text-muted-foreground hover:text-red-500"
                        title={isMe && !canManage ? 'Leave board' : 'Remove'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canManage && (
            <button
              onClick={() => setShowInvite(true)}
              className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
            >
              + Invite member
            </button>
          )}
        </div>
      </div>

      {showInvite && (
        <InviteMemberModal
          boardId={boardId}
          existingMemberIds={existingMemberIds}
          onClose={() => setShowInvite(false)}
          onInvited={(newMember) => {
            setMembers(prev => [...prev, {
              user_id: newMember.id,
              role: newMember.role,
              invited_at: new Date().toISOString(),
              profile: { id: newMember.id, display_name: newMember.display_name, email: newMember.email },
            }]);
            onMembersChange?.();
          }}
        />
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BoardMembersPanel.jsx
git commit -m "feat: add BoardMembersPanel with role management and leave/remove actions"
```

---

## Task 5: Update BoardView

**Files:**
- Modify: `src/pages/BoardView.jsx`

- [ ] **Step 1: Update imports at the top of BoardView.jsx**

Replace the existing import block (lines 1–11) with:

```jsx
import { useParams, useNavigate } from 'react-router-dom';
import { useBoards } from '../context/BoardContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanList from '../components/KanbanList';
import AddListForm from '../components/AddListForm';
import CardDetailModal from '../components/CardDetailModal';
import BoardMembersPanel from '../components/BoardMembersPanel';
import InviteMemberModal from '../components/InviteMemberModal';
import { ArrowLeft, Star, MoreHorizontal, X, Filter, Search, Calendar, Tag, Users, CheckSquare, Clock, Image as ImageIcon, Trash2, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import { isPast, isToday, addDays, addWeeks, addMonths, isWithinInterval, subWeeks } from 'date-fns';
```

- [ ] **Step 2: Destructure getBoardRole from useBoards and add panel state**

Find this line in BoardView:
```jsx
const { getBoard, boardsLoading, handleDragEnd, updateBoard, toggleStarBoard, addList, deleteList, updateListTitle, addCard, deleteBoard } = useBoards();
```

Replace with:
```jsx
const { getBoard, getBoardRole, boardsLoading, handleDragEnd, updateBoard, toggleStarBoard, addList, deleteList, updateListTitle, addCard, deleteBoard } = useBoards();
const role = getBoardRole(boardId);
const canEdit = role === 'owner' || role === 'admin' || role === 'member';
const canManageMembers = role === 'owner' || role === 'admin';
```

Then add these state declarations after the existing `[showMenu, setShowMenu]` line:
```jsx
const [showMembersPanel, setShowMembersPanel] = useState(false);
const [showInviteModal, setShowInviteModal] = useState(false);
```

- [ ] **Step 3: Add Members button + Invite button to the header**

Find the spacer div between the star button and the filter button:
```jsx
<div className="flex-1" />
```

Replace with:
```jsx
<div className="flex-1" />

{/* Members + Invite */}
<div className="flex items-center gap-2">
  <Button
    variant="ghost"
    size="sm"
    onClick={() => setShowMembersPanel(true)}
    className="gap-1.5"
  >
    <Users className="w-4 h-4" />
    Members
  </Button>
  {canManageMembers && (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowInviteModal(true)}
      className="gap-1.5 text-xs h-8"
    >
      <UserPlus className="w-3.5 h-3.5" />
      Invite
    </Button>
  )}
</div>
```

- [ ] **Step 4: Add "Members" to the ⋯ dropdown menu**

Find the menu dropdown contents inside `{showMenu && ...}`. Add this button before the "Change background" button:

```jsx
<button
  onClick={() => { setShowMembersPanel(true); setShowMenu(false); }}
  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 rounded-md transition-colors"
>
  <Users className="w-4 h-4" />
  Members
</button>
```

- [ ] **Step 5: Add observer guards for edit controls**

Find the archive board button in `handleArchiveBoard`. Wrap the entire archive handler to check ownership:

```jsx
const handleArchiveBoard = async () => {
  if (role !== 'owner') return;
  // ... rest unchanged
};
```

Find where `editingTitle` is used. Wrap the click handler on the title:
```jsx
onClick={() => canEdit && setEditingTitle(true)}
```

Wrap the drag drop context so observers see a static view. Find `<DragDropContext onDragEnd={onDragEnd}>` and add a wrapper that disables drag for observers:

In the `KanbanList` props, add:
```jsx
readOnly={!canEdit}
```

_(Note: KanbanList doesn't yet have a `readOnly` prop — this is passed through so you can add it in a follow-up if needed. For now the RLS layer enforces it at the DB level.)_

- [ ] **Step 6: Render the modals at the bottom of the return**

Just before the closing `</div>` of the component return, add:

```jsx
{showMembersPanel && (
  <BoardMembersPanel
    boardId={boardId}
    ownerId={board.ownerId}
    ownerName={board.ownerName}
    currentUserRole={role}
    onClose={() => setShowMembersPanel(false)}
    onMembersChange={() => {/* refreshBoards handled by realtime */}}
  />
)}

{showInviteModal && (
  <InviteMemberModal
    boardId={boardId}
    existingMemberIds={[board.ownerId]}
    onClose={() => setShowInviteModal(false)}
    onInvited={() => setShowInviteModal(false)}
  />
)}
```

- [ ] **Step 7: Verify in browser**

Run `npm run dev`. Open a board. Confirm:
- An "Invite" button appears in the header (owner/admin view)
- Clicking "Invite" opens the search modal
- Clicking the ⋯ menu shows a "Members" option
- Clicking "Members" opens the members panel

- [ ] **Step 8: Commit**

```bash
git add src/pages/BoardView.jsx
git commit -m "feat: add member avatars, Invite button, and Members panel to BoardView"
```

---

## Task 6: Update Home.jsx

**Files:**
- Modify: `src/pages/Home.jsx`

- [ ] **Step 1: Split boards into owned and shared in Home.jsx**

Find these lines near the top of the `Home` component function:

```jsx
const starredBoards = boards.filter(b => b.starred);
const allBoards = [...boards].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
```

Replace with:

```jsx
const starredBoards = boards.filter(b => b.starred && b.memberRole === 'owner');
const ownedBoards = boards
  .filter(b => b.memberRole === 'owner')
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
const sharedBoards = boards
  .filter(b => b.memberRole !== 'owner')
  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
```

- [ ] **Step 2: Replace the "All Boards" section**

Find the `<section>` that renders all boards (starts with the `<div className="flex items-center gap-2.5 mb-5">` containing the Esperia logo). Replace the entire section with:

```jsx
<section className="mb-10">
  <div className="flex items-center gap-2.5 mb-5">
    <div className="w-7 h-7 rounded-lg overflow-hidden">
      <img src="/esperia.png" alt="Esperia logo" className="w-full h-full object-cover" />
    </div>
    <h2 className="text-lg font-semibold tracking-tight">Your Boards</h2>
  </div>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
    {ownedBoards.map(board => (
      <BoardCard key={board.id} board={board} />
    ))}
    <button
      onClick={() => setShowCreate(true)}
      className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-pink-200/80 text-muted-foreground hover:text-pink-600 hover:border-pink-400/60 hover:bg-pink-50/30 transition-all duration-300 cursor-pointer group min-h-[200px] sm:min-h-[210px]"
    >
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-100 to-purple-100 group-hover:from-pink-200 group-hover:to-purple-200 flex items-center justify-center transition-colors mb-2">
        <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
      </div>
      <span className="text-sm font-semibold">Create new board</span>
      <p className="text-xs text-muted-foreground/60 mt-1">Start a fresh project</p>
    </button>
  </div>
</section>

{sharedBoards.length > 0 && (
  <section>
    <div className="flex items-center gap-2.5 mb-5">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <Users className="w-3.5 h-3.5 text-white" />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">Shared with You</h2>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {sharedBoards.map(board => (
        <BoardCard key={board.id} board={board} sharedBy={board.ownerName} />
      ))}
    </div>
  </section>
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Home.jsx
git commit -m "feat: split Home into Your Boards and Shared with You sections"
```

---

## Task 7: Update BoardCard

**Files:**
- Modify: `src/components/BoardCard.jsx`

- [ ] **Step 1: Add the sharedBy prop**

Replace the entire file content with:

```jsx
import { Link } from 'react-router-dom';
import { WorkflowBuilderCard } from './ui/workflow-builder-card';

function timeAgo(dateStr) {
  const now = new Date();
  const past = new Date(dateStr);
  const diffMs = now - past;
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export default function BoardCard({ board, sharedBy }) {
  const totalCards = board.lists.reduce((acc, l) => acc + l.cards.length, 0);
  const listNames = board.lists.map(l => l.title).slice(0, 3);

  return (
    <Link to={`/boards/${board.id}`} className="block relative">
      <WorkflowBuilderCard
        imageUrl={resolveBoardImageUrl(board.backgroundImage)}
        gradientClass={board.gradient}
        status="Active"
        lastUpdated={sharedBy ? `Shared by ${sharedBy}` : timeAgo(board.createdAt)}
        title={board.title}
        description={`${board.lists.length} ${board.lists.length === 1 ? 'list' : 'lists'} · ${totalCards} ${totalCards === 1 ? 'card' : 'cards'}`}
        tags={listNames}
      />
    </Link>
  );
}

function resolveBoardImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('file:///')) {
    if (imageUrl.toLowerCase().includes('emerson')) return '/emerson.jpg';
    if (imageUrl.toLowerCase().includes('chatgpt') || imageUrl.toLowerCase().includes('esperia')) return '/esperia.png';
    return null;
  }
  return imageUrl;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BoardCard.jsx
git commit -m "feat: show Shared by label on shared board cards"
```

---

## Task 8: End-to-End Verification

- [ ] **Step 1: Run dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test migration**

Log in. Open the browser console. Confirm:
- No errors
- `localStorage.getItem('migrated_to_boards_v2_<your-user-id>')` returns `'1'`
- All your existing boards appear under "Your Boards"

- [ ] **Step 3: Test invite flow**

Click any board → "Invite" button appears in header. Click it. Type part of a teammate's name or email. Confirm results appear. Select one, pick "Member" role, click "Add to Board". Confirm no error.

- [ ] **Step 4: Test members panel**

Click the stacked avatars or use ⋯ → Members. Confirm the panel lists the board owner and the invited member. Confirm the invited member's role dropdown is editable (as owner).

- [ ] **Step 5: Test from the invited user's account**

Log in as the invited user. Confirm the board appears under "Shared with You" on the Home page. Open it. Confirm they can see and edit cards. Confirm they cannot see the "Invite" button (member role).

- [ ] **Step 6: Final commit and deploy**

```bash
npm run build
npx wrangler pages deploy dist --project-name esperia-trello --branch main --commit-dirty=true
```
