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
  // Optimistic concurrency guard — last updated_at seen from the server.
  const lastServerUpdatedAtRef = useRef(null);
  // Snapshot of the last payload we persisted — skip saves when unchanged.
  const lastSavedSerializedRef = useRef('');

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
        .select('data, updated_at')
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
        const nowIso = new Date().toISOString();
        const { data: upserted, error: upsertError } = await supabase
          .from('app_boards')
          .upsert(
            { id: boardRowId, data: EMPTY_DATA, updated_at: nowIso },
            { onConflict: 'id' }
          )
          .select('updated_at')
          .maybeSingle();
        if (upsertError) {
          console.error('Failed to create board row:', upsertError.message);
        }
        setData(EMPTY_DATA);
        lastServerUpdatedAtRef.current = upserted?.updated_at || nowIso;
        lastSavedSerializedRef.current = JSON.stringify(EMPTY_DATA);
      } else {
        const loadedData = row.data || EMPTY_DATA;
        setData(loadedData);
        lastServerUpdatedAtRef.current = row.updated_at || null;
        lastSavedSerializedRef.current = JSON.stringify(loadedData);
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
            lastServerUpdatedAtRef.current = payload.new.updated_at || null;
            lastSavedSerializedRef.current = JSON.stringify(payload.new.data);
            setData(payload.new.data);
            setTimeout(() => { isInitialLoad.current = false; }, 150);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, boardRowId]);

  // Save to Supabase (debounced, with no-op skip + optimistic concurrency)
  const saveToSupabase = useDebouncedCallback(async (boardData) => {
    const serialized = JSON.stringify(boardData);

    // 1. Skip if nothing actually changed since the last successful save.
    if (serialized === lastSavedSerializedRef.current) {
      setIsSavingBoards(false);
      return;
    }

    const newUpdatedAt = new Date().toISOString();
    const guard = lastServerUpdatedAtRef.current;

    // 2. Optimistic concurrency: only write if the row hasn't been changed
    //    by another client since we last saw it.
    let query = supabase
      .from('app_boards')
      .update({ data: boardData, updated_at: newUpdatedAt })
      .eq('id', boardRowId);
    if (guard) query = query.eq('updated_at', guard);

    const { data: updated, error } = await query.select('updated_at').maybeSingle();

    if (error) {
      console.error('Failed to save boards:', error.message);
      setIsSavingBoards(false);
      return;
    }

    if (!updated) {
      // Someone else wrote first. Refetch latest and drop our in-flight save;
      // realtime will also sync us, but an explicit pull avoids races.
      console.warn('Board save skipped: stale timestamp, pulling latest.');
      const { data: fresh } = await supabase
        .from('app_boards')
        .select('data, updated_at')
        .eq('id', boardRowId)
        .maybeSingle();
      if (fresh?.data) {
        isInitialLoad.current = true;
        lastServerUpdatedAtRef.current = fresh.updated_at || null;
        lastSavedSerializedRef.current = JSON.stringify(fresh.data);
        setData(fresh.data);
        setTimeout(() => { isInitialLoad.current = false; }, 150);
      }
      setIsSavingBoards(false);
      return;
    }

    lastServerUpdatedAtRef.current = updated.updated_at;
    lastSavedSerializedRef.current = serialized;
    setLastSavedAt(new Date());
    setIsSavingBoards(false);
  }, 1000);

  useEffect(() => {
    if (isInitialLoad.current) return;
    if (!isAuthenticated) return;
    setIsSavingBoards(true);
    saveToSupabase.run(data);
  }, [data, saveToSupabase, isAuthenticated]);

  const refreshBoards = useCallback(async () => {
    const { data: row, error } = await supabase
      .from('app_boards')
      .select('data, updated_at')
      .eq('id', boardRowId)
      .single();
    if (!error && row?.data) {
      isInitialLoad.current = true;
      lastServerUpdatedAtRef.current = row.updated_at || null;
      lastSavedSerializedRef.current = JSON.stringify(row.data);
      setData(row.data);
      setTimeout(() => { isInitialLoad.current = false; }, 100);
    }
  }, [boardRowId]);

  const persistBoardsNow = useCallback(async () => {
    if (!isAuthenticated) return;
    saveToSupabase.cancel();

    const serialized = JSON.stringify(data);
    if (serialized === lastSavedSerializedRef.current) return;

    setIsSavingBoards(true);
    const newUpdatedAt = new Date().toISOString();
    const guard = lastServerUpdatedAtRef.current;

    let query = supabase
      .from('app_boards')
      .update({ data, updated_at: newUpdatedAt })
      .eq('id', boardRowId);
    if (guard) query = query.eq('updated_at', guard);

    const { data: updated, error } = await query.select('updated_at').maybeSingle();

    if (error) {
      setIsSavingBoards(false);
      console.error('Failed to persist boards immediately:', error.message);
      throw error;
    }

    if (!updated) {
      // Stale timestamp — drop our save; the next load/realtime push wins.
      console.warn('persistBoardsNow skipped: stale timestamp.');
      setIsSavingBoards(false);
      return;
    }

    lastServerUpdatedAtRef.current = updated.updated_at;
    lastSavedSerializedRef.current = serialized;
    setLastSavedAt(new Date());
    setIsSavingBoards(false);
  }, [data, isAuthenticated, boardRowId, saveToSupabase]);

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
