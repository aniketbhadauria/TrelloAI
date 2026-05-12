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

  const addBoard = useCallback(async (title, gradient, backgroundImage = null, lists = []) => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const boardData = { id, title, gradient, backgroundImage, starred: false, archived: false, createdAt: now, lists };
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
