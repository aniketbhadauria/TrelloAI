import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../lib/supabase';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

const BoardContext = createContext(null);

const ROW_ID = 'default';
const EMPTY_DATA = { boards: [] };

export function BoardProvider({ children }) {
  const [data, setData] = useState(EMPTY_DATA);
  const [boardsLoading, setBoardsLoading] = useState(true);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    isInitialLoad.current = true;
    setBoardsLoading(true);

    supabase
      .from('app_boards')
      .select('data')
      .eq('id', ROW_ID)
      .single()
      .then(({ data: row, error }) => {
        if (error) {
          console.error('Failed to load boards:', error.message);
        } else if (row?.data) {
          setData(row.data);
        }
        setBoardsLoading(false);
        isInitialLoad.current = false;
      });
  }, []);

  const saveToSupabase = useDebouncedCallback((boardData) => {
    supabase
      .from('app_boards')
      .update({ data: boardData, updated_at: new Date().toISOString() })
      .eq('id', ROW_ID)
      .then(({ error }) => {
        if (error) console.error('Failed to save boards:', error.message);
      });
  }, 500);

  useEffect(() => {
    if (isInitialLoad.current) return;
    saveToSupabase(data);
  }, [data, saveToSupabase]);

  const refreshBoards = useCallback(async () => {
    const { data: row, error } = await supabase
      .from('app_boards')
      .select('data')
      .eq('id', ROW_ID)
      .single();
    if (!error && row?.data) {
      isInitialLoad.current = true;
      setData(row.data);
      setTimeout(() => { isInitialLoad.current = false; }, 100);
    }
  }, []);

  const updateData = useCallback((updater) => {
    setData(prev => (typeof updater === 'function' ? updater(prev) : updater));
  }, []);

  const getBoard = useCallback((boardId) => {
    return data.boards.find(b => b.id === boardId);
  }, [data]);

  const addBoard = useCallback((title, gradient) => {
    updateData(prev => ({
      ...prev,
      boards: [...prev.boards, { id: uuidv4(), title, gradient, starred: false, createdAt: new Date().toISOString(), lists: [] }],
    }));
  }, [updateData]);

  const deleteBoard = useCallback((boardId) => {
    updateData(prev => ({ ...prev, boards: prev.boards.filter(b => b.id !== boardId) }));
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
    <BoardContext.Provider value={{ boards: data.boards, boardsLoading, getBoard, addBoard, deleteBoard, updateBoard, toggleStarBoard, addList, deleteList, updateListTitle, addCard, deleteCard, updateCard, handleDragEnd, refreshBoards }}>
      {children}
    </BoardContext.Provider>
  );
}

export function useBoards() {
  const context = useContext(BoardContext);
  if (!context) throw new Error('useBoards must be used within BoardProvider');
  return context;
}
