import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { DropResult } from '@hello-pangea/dnd';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';
import { logError, logInfo } from '../lib/logger';
import type { Board, List, Card, ArchivedCard, BoardRole } from '../types/board';

interface BoardContextValue {
  boards: Board[];
  archivedBoards: Board[];
  archivedCards: ArchivedCard[];
  membershipMap: Record<string, BoardRole>;
  boardsLoading: boolean;
  isSavingBoards: boolean;
  lastSavedAt: Date | null;
  getBoardRole: (boardId: string) => BoardRole | null;
  getBoard: (boardId: string) => Board | null;
  addBoard: (title: string, gradient: string, backgroundImage?: string | null, lists?: List[]) => Promise<void>;
  deleteBoard: (boardId: string) => void;
  updateBoard: (boardId: string, updates: Partial<Board>) => void;
  toggleStarBoard: (boardId: string) => void;
  addList: (boardId: string, title: string) => void;
  deleteList: (boardId: string, listId: string) => void;
  updateListTitle: (boardId: string, listId: string, title: string) => void;
  addCard: (boardId: string, listId: string, title: string) => void;
  archiveCard: (boardId: string, listId: string, cardId: string) => void;
  updateCard: (boardId: string, listId: string, cardId: string, updates: Partial<Card>) => void;
  handleDragEnd: (boardId: string, result: DropResult) => void;
  restoreBoard: (boardId: string) => void;
  restoreCard: (boardId: string, listId: string, cardId: string) => void;
  deleteBoardPermanently: (boardId: string) => Promise<void>;
  deleteCardPermanently: (boardId: string, listId: string, cardId: string) => void;
  refreshBoards: () => Promise<void>;
  persistBoardsNow: () => Promise<void>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

// Strip context-only fields before writing to DB
function extractBoardData(board: Board): Omit<Board, 'ownerId' | 'memberRole' | 'ownerName'> {
  const { ownerId, memberRole, ownerName, ...data } = board;
  // suppress unused variable warnings for destructured context-only fields
  void ownerId; void memberRole; void ownerName;
  return data;
}

async function runMigrationIfNeeded(userId: string): Promise<void> {
  const key = `migrated_to_boards_v2_${userId}`;
  if (localStorage.getItem(key)) return;

  try {
    const { count } = await supabase
      .from('boards')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId);

    if (count && count > 0) {
      localStorage.setItem(key, '1');
      return;
    }

    const { data: oldRow } = await supabase
      .from('app_boards')
      .select('data')
      .eq('id', userId)
      .maybeSingle();

    const oldBoards = (oldRow?.data as { boards?: Board[] } | null)?.boards || [];
    if (oldBoards.length > 0) {
      const now = new Date().toISOString();
      await supabase.from('boards').insert(
        oldBoards.map((b: Board) => ({
          id: b.id,
          owner_id: userId,
          data: b,
          created_at: b.createdAt || now,
          updated_at: now,
        }))
      );
    }
  } catch (err) {
    logError('Board migration failed', { message: (err as Error).message });
  }

  localStorage.setItem(`migrated_to_boards_v2_${userId}`, '1');
}

interface FetchResult {
  boards: Board[];
  membershipMap: Record<string, BoardRole>;
}

async function fetchAllBoards(userId: string): Promise<FetchResult> {
  const [ownedResult, sharedResult] = await Promise.all([
    supabase.from('boards').select('*').eq('owner_id', userId),
    supabase.from('board_members')
      .select('board_id, role, boards(*)')
      .eq('user_id', userId),
  ]);

  if (ownedResult.error) logError('Failed to load owned boards', { message: ownedResult.error.message });
  if (sharedResult.error) logError('Failed to load shared boards', { message: sharedResult.error.message });

  const membershipMap: Record<string, BoardRole> = {};

  const ownedBoards: Board[] = (ownedResult.data || []).map((row: Record<string, unknown>) => {
    membershipMap[row.id as string] = 'owner';
    return { ownerId: row.owner_id as string, memberRole: 'owner' as BoardRole, ownerName: null, ...(row.data as object), id: row.id as string } as Board;
  });

  const sharedRows = ((sharedResult.data || []).filter((m: Record<string, unknown>) => m.boards) as unknown) as Array<{
    board_id: string;
    role: BoardRole;
    boards: { id: string; owner_id: string; data: Partial<Board> };
  }>;
  const ownerIds = [...new Set(sharedRows.map(m => m.boards.owner_id))];

  const ownerNames: Record<string, string> = {};
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('app_users')
      .select('id, display_name, email')
      .in('id', ownerIds);
    (profiles || []).forEach((p: { id: string; display_name: string | null; email: string }) => {
      ownerNames[p.id] = p.display_name || p.email;
    });
  }

  const sharedBoards: Board[] = sharedRows.map(m => {
    membershipMap[m.boards.id] = m.role;
    return {
      ownerId: m.boards.owner_id,
      memberRole: m.role,
      ownerName: ownerNames[m.boards.owner_id] || null,
      ...m.boards.data,
      id: m.boards.id,
    } as Board;
  });

  return { boards: [...ownedBoards, ...sharedBoards], membershipMap };
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user && !authLoading;

  const [boards, setBoards] = useState<Board[]>([]);
  const [membershipMap, setMembershipMap] = useState<Record<string, BoardRole>>({});
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [isSavingBoards, setIsSavingBoards] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const isInitialLoad = useRef(true);
  const lastSavedRef = useRef<Record<string, string>>({});

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
      logInfo('boards_loaded', { userId: user.id, count: allBoards.length });
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
          const updated = payload.new as { id: string; data: Partial<Board> } | null;
          if (!updated) return;
          setBoards(prev => {
            const existing = prev.find(b => b.id === updated.id);
            if (!existing) return prev;
            const merged: Board = { ...existing, ...updated.data, id: updated.id };
            lastSavedRef.current[updated.id] = JSON.stringify(extractBoardData(merged));
            return prev.map(b => b.id === updated.id ? merged : b);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated]);

  // Debounced save: finds dirty boards and writes them individually
  const saveBoards = useDebouncedCallback(async (...args: unknown[]) => {
    const currentBoards = args[0] as Board[];
    const currentMembershipMap = args[1] as Record<string, BoardRole>;
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
      if (error) { logError('board_save_failed', { boardId: board.id, message: error.message }); return; }
      lastSavedRef.current[board.id] = JSON.stringify(boardData);
      logInfo('board_saved', { boardId: board.id });
    }));

    setLastSavedAt(new Date());
    setIsSavingBoards(false);
  }, 1000);

  useEffect(() => {
    if (isInitialLoad.current || !isAuthenticated) return;
    setIsSavingBoards(true);
    saveBoards.run(boards, membershipMap);
  }, [boards, isAuthenticated, membershipMap, saveBoards]);

  const updateData = useCallback((updater: Board[] | ((prev: Board[]) => Board[])) => {
    setBoards(prev => typeof updater === 'function' ? updater(prev) : updater);
  }, []);

  const getBoardRole = useCallback((boardId: string): BoardRole | null => membershipMap[boardId] || null, [membershipMap]);

  const getBoard = useCallback((boardId: string): Board | null => {
    const board = boards.find(b => b.id === boardId && !b.archived);
    if (!board) return null;
    return {
      ...board,
      lists: board.lists.map(l => ({ ...l, cards: l.cards.filter(c => !c.archived) })),
    };
  }, [boards]);

  const addBoard = useCallback(async (title: string, gradient: string, backgroundImage: string | null = null, lists: List[] = []): Promise<void> => {
    const id = uuidv4();
    const now = new Date().toISOString();
    const boardData: Board = { id, title, gradient, backgroundImage, starred: false, archived: false, archivedAt: null, createdAt: now, lists };
    const newBoard: Board = { ownerId: user!.id, memberRole: 'owner', ownerName: null, ...boardData };

    // Optimistic add
    lastSavedRef.current[id] = JSON.stringify(extractBoardData(boardData));
    setMembershipMap(prev => ({ ...prev, [id]: 'owner' }));
    setBoards(prev => [...prev, newBoard]);

    const { error } = await supabase.from('boards').insert({
      id, owner_id: user!.id, data: boardData, created_at: now, updated_at: now,
    });

    if (!error) {
      logInfo('board_created', { boardId: id, userId: user!.id });
    } else {
      logError('board_create_failed', { message: error.message });
      setBoards(prev => prev.filter(b => b.id !== id));
      setMembershipMap(prev => { const n = { ...prev }; delete n[id]; return n; });
      delete lastSavedRef.current[id];
    }
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const deleteBoard = useCallback((boardId: string) => {
    updateData(prev => prev.map(b => b.id === boardId
      ? { ...b, archived: true, archivedAt: new Date().toISOString(), starred: false }
      : b
    ));
  }, [updateData]);

  const deleteBoardPermanently = useCallback(async (boardId: string): Promise<void> => {
    if (membershipMap[boardId] !== 'owner') return;
    const { error } = await supabase.from('boards').delete().eq('id', boardId);
    if (error) { logError('board_delete_failed', { boardId, message: error.message }); return; }
    logInfo('board_deleted', { boardId });
    delete lastSavedRef.current[boardId];
    setMembershipMap(prev => { const n = { ...prev }; delete n[boardId]; return n; });
    setBoards(prev => prev.filter(b => b.id !== boardId));
  }, [membershipMap]);

  const updateBoard = useCallback((boardId: string, updates: Partial<Board>) => {
    updateData(prev => prev.map(b => b.id === boardId ? { ...b, ...updates } : b));
  }, [updateData]);

  const toggleStarBoard = useCallback((boardId: string) => {
    updateData(prev => prev.map(b => b.id === boardId ? { ...b, starred: !b.starred } : b));
  }, [updateData]);

  const restoreBoard = useCallback((boardId: string) => {
    updateData(prev => prev.map(b => b.id === boardId ? { ...b, archived: false, archivedAt: null } : b));
  }, [updateData]);

  const addList = useCallback((boardId: string, title: string) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b
      : { ...b, lists: [...b.lists, { id: uuidv4(), title, cards: [] }] }
    ));
  }, [updateData]);

  const deleteList = useCallback((boardId: string, listId: string) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b
      : { ...b, lists: b.lists.filter(l => l.id !== listId) }
    ));
  }, [updateData]);

  const updateListTitle = useCallback((boardId: string, listId: string, title: string) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b
      : { ...b, lists: b.lists.map(l => l.id === listId ? { ...l, title } : l) }
    ));
  }, [updateData]);

  const addCard = useCallback((boardId: string, listId: string, title: string) => {
    const newCard: Card = {
      id: uuidv4(),
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
    };
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : { ...l, cards: [...l.cards, newCard] }),
    }));
  }, [updateData]);

  const archiveCard = useCallback((boardId: string, listId: string, cardId: string) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : {
        ...l, cards: l.cards.map(c => c.id === cardId
          ? { ...c, archived: true, archivedAt: new Date().toISOString() } : c),
      }),
    }));
  }, [updateData]);

  const restoreCard = useCallback((boardId: string, listId: string, cardId: string) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : {
        ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, archived: false, archivedAt: null } : c),
      }),
    }));
  }, [updateData]);

  const deleteCardPermanently = useCallback((boardId: string, listId: string, cardId: string) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : {
        ...l, cards: l.cards.filter(c => c.id !== cardId),
      }),
    }));
  }, [updateData]);

  const updateCard = useCallback((boardId: string, listId: string, cardId: string, updates: Partial<Card>) => {
    updateData(prev => prev.map(b => b.id !== boardId ? b : {
      ...b, lists: b.lists.map(l => l.id !== listId ? l : {
        ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, ...updates } : c),
      }),
    }));
  }, [updateData]);

  const handleDragEnd = useCallback((boardId: string, result: DropResult) => {
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

  const refreshBoards = useCallback(async (): Promise<void> => {
    if (!user?.id) return;
    isInitialLoad.current = true;
    const { boards: allBoards, membershipMap: map } = await fetchAllBoards(user.id);
    allBoards.forEach(b => { lastSavedRef.current[b.id] = JSON.stringify(extractBoardData(b)); });
    setBoards(allBoards);
    setMembershipMap(map);
    setTimeout(() => { isInitialLoad.current = false; }, 150);
  }, [user?.id]);

  const persistBoardsNow = useCallback(async (): Promise<void> => {
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
      if (!error) {
        lastSavedRef.current[board.id] = JSON.stringify(boardData);
        logInfo('board_saved', { boardId: board.id });
      } else {
        logError('board_save_failed', { boardId: board.id, message: error.message });
      }
    }));
    setLastSavedAt(new Date());
    setIsSavingBoards(false);
  }, [boards, isAuthenticated, membershipMap, saveBoards]);

  const activeBoards = boards
    .filter(b => !b.archived)
    .map(b => ({ ...b, lists: b.lists.map(l => ({ ...l, cards: l.cards.filter(c => !c.archived) })) }));

  const archivedBoards = boards.filter(b => b.archived && b.memberRole === 'owner');

  const archivedCards: ArchivedCard[] = boards
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

export function useBoards(): BoardContextValue {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoards must be used within BoardProvider');
  return context;
}
