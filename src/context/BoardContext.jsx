import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

const BoardContext = createContext(null);

const SHARED_BOARD_ROW_ID = import.meta.env.VITE_SUPABASE_BOARD_ROW_ID || 'shared';
const EMPTY_DATA = { boards: [] };

export function BoardProvider({ children }) {
  const { user, loading: authLoading } = useAuth();
  const isAuthenticated = !!user && !authLoading;
  const boardRowId = SHARED_BOARD_ROW_ID;

  const [data, setData] = useState(EMPTY_DATA);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const [isSavingBoards, setIsSavingBoards] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const isInitialLoad = useRef(true);

  // Load shared boards
  useEffect(() => {
    if (authLoading) return;

    if (!isAuthenticated) {
      isInitialLoad.current = true;
      setData(EMPTY_DATA);
      setBoardsLoading(false);
      return;
    }

    let cancelled = false;
    isInitialLoad.current = true;
    setBoardsLoading(true);

    (async () => {
      const { data: row, error } = await supabase
        .from('app_boards')
        .select('data')
        .eq('id', boardRowId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error('Failed to load boards:', error.message);
        setBoardsLoading(false);
        isInitialLoad.current = false;
        return;
      }

      if (!row) {
        // Create shared row if it doesn't exist
        const { error: upsertError } = await supabase
          .from('app_boards')
          .upsert(
            { id: boardRowId, data: EMPTY_DATA, updated_at: new Date().toISOString() },
            { onConflict: 'id' }
          );
        if (upsertError) {
          console.error('Failed to create board row:', upsertError.message);
        }
        setData(EMPTY_DATA);
      } else if (row.data) {
        setData(row.data);
      }

      if (!cancelled) {
        setBoardsLoading(false);
        isInitialLoad.current = false;
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, authLoading, boardRowId]);

  // Realtime subscription – sync changes from other users
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel('shared-boards')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'app_boards', filter: `id=eq.${boardRowId}` },
        (payload) => {
          if (payload.new?.data) {
            isInitialLoad.current = true;
            setData(payload.new.data);
            setTimeout(() => { isInitialLoad.current = false; }, 150);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, boardRowId]);

  // Save to Supabase (debounced)
  const saveToSupabase = useDebouncedCallback((boardData) => {
    supabase
      .from('app_boards')
      .upsert({ id: boardRowId, data: boardData, updated_at: new Date().toISOString() }, { onConflict: 'id' })
      .then(({ error }) => {
        if (error) {
          console.error('Failed to save boards:', error.message);
        } else {
          setLastSavedAt(new Date());
        }
        setIsSavingBoards(false);
      });
  }, 500);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!isAuthenticated) return;
    setIsSavingBoards(true);
    saveToSupabase(data);
  }, [data, saveToSupabase, isAuthenticated]);

  const refreshBoards = useCallback(async () => {
    const { data: row, error } = await supabase
      .from('app_boards')
      .select('data')
      .eq('id', boardRowId)
      .single();
    if (!error && row?.data) {
      isInitialLoad.current = true;
      setData(row.data);
      setTimeout(() => { isInitialLoad.current = false; }, 100);
    }
  }, [boardRowId]);

  const persistBoardsNow = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsSavingBoards(true);
    const { error } = await supabase
      .from('app_boards')
      .upsert({ id: boardRowId, data, updated_at: new Date().toISOString() }, { onConflict: 'id' });
    if (error) {
      setIsSavingBoards(false);
      console.error('Failed to persist boards immediately:', error.message);
      throw error;
    }
    setLastSavedAt(new Date());
    setIsSavingBoards(false);
  }, [data, isAuthenticated, boardRowId]);

  const updateData = useCallback((updater) => {
    setData(prev => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const getBoard = useCallback((boardId) => {
    return data.boards.find(b => b.id === boardId && !b.archived);
  }, [data]);

  const addBoard = useCallback((title, gradient, backgroundImage = null) => {
    updateData(prev => ({
      ...prev,
      boards: [...prev.boards, { id: uuidv4(), title, gradient, backgroundImage, starred: false, archived: false, createdAt: new Date().toISOString(), lists: [] }],
    }));
  }, [updateData]);

  const deleteBoard = useCallback((boardId) => {
    updateData(prev => ({
      ...prev,
      boards: prev.boards.map(b => (
        b.id === boardId
          ? { ...b, archived: true, archivedAt: new Date().toISOString(), starred: false }
          : b
      )),
    }));
  }, [updateData]);

  const updateBoard = useCallback((boardId, updates) => {
    updateData(prev => ({ ...prev, boards: prev.boards.map(b => b.id === boardId ? { ...b, ...updates } : b) }));
  }, [updateData]);

  const toggleStarBoard = useCallback((boardId) => {
    updateData(prev => ({ ...prev, boards: prev.boards.map(b => b.id === boardId ? { ...b, starred: !b.starred } : b) }));
  }, [updateData]);

  const addList = useCallback((boardId, title) => {
    updateData(prev => ({
      ...prev,
      boards: prev.boards.map(b => b.id !== boardId ? b : { ...b, lists: [...b.lists, { id: uuidv4(), title, cards: [] }] }),
    }));
  }, [updateData]);

  const deleteList = useCallback((boardId, listId) => {
    updateData(prev => ({
      ...prev,
      boards: prev.boards.map(b => b.id !== boardId ? b : { ...b, lists: b.lists.filter(l => l.id !== listId) }),
    }));
  }, [updateData]);

  const updateListTitle = useCallback((boardId, listId, title) => {
    updateData(prev => ({
      ...prev,
      boards: prev.boards.map(b => b.id !== boardId ? b : { ...b, lists: b.lists.map(l => l.id === listId ? { ...l, title } : l) }),
    }));
  }, [updateData]);

  const addCard = useCallback((boardId, listId, title) => {
    const newCard = { id: uuidv4(), title, description: '', labels: [], dueDate: null, createdAt: new Date().toISOString() };
    updateData(prev => ({
      ...prev,
      boards: prev.boards.map(b => b.id !== boardId ? b : {
        ...b, lists: b.lists.map(l => l.id !== listId ? l : { ...l, cards: [...l.cards, newCard] }),
      }),
    }));
  }, [updateData]);

  const deleteCard = useCallback((boardId, listId, cardId) => {
    updateData(prev => ({
      ...prev,
      boards: prev.boards.map(b => b.id !== boardId ? b : {
        ...b, lists: b.lists.map(l => l.id !== listId ? l : { ...l, cards: l.cards.filter(c => c.id !== cardId) }),
      }),
    }));
  }, [updateData]);

  const updateCard = useCallback((boardId, listId, cardId, updates) => {
    updateData(prev => ({
      ...prev,
      boards: prev.boards.map(b => b.id !== boardId ? b : {
        ...b, lists: b.lists.map(l => l.id !== listId ? l : {
          ...l, cards: l.cards.map(c => c.id === cardId ? { ...c, ...updates } : c),
        }),
      }),
    }));
  }, [updateData]);

  const handleDragEnd = useCallback((boardId, result) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    updateData(prev => {
      const newBoards = prev.boards.map(b => ({ ...b }));
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
      return { ...prev, boards: newBoards };
    });
  }, [updateData]);

  return (
    <BoardContext.Provider value={{ boards: data.boards.filter(b => !b.archived), boardsLoading, isSavingBoards, lastSavedAt, getBoard, addBoard, deleteBoard, updateBoard, toggleStarBoard, addList, deleteList, updateListTitle, addCard, deleteCard, updateCard, handleDragEnd, refreshBoards, persistBoardsNow }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoards() {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoards must be used within BoardProvider');
  return context;
}
