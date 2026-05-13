import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { DropResult } from '@hello-pangea/dnd'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { useDebouncedCallback } from '../hooks/useDebouncedCallback'
import {
  apiRunMigrationIfNeeded,
  apiFetchAllBoards,
  apiCreateBoard,
  apiSaveBoard,
  apiDeleteBoard,
} from '@/api/boards'
import type { Board, List, Card, ArchivedCard, BoardRole } from '../types/board'
import { generateBoardKey } from '@/utils/board'

interface BoardContextValue {
  boards: Board[]
  archivedBoards: Board[]
  archivedCards: ArchivedCard[]
  membershipMap: Record<string, BoardRole>
  boardsLoading: boolean
  isSavingBoards: boolean
  lastSavedAt: Date | null
  getBoardRole: (boardId: string) => BoardRole | null
  getBoard: (boardId: string) => Board | null
  addBoard: (
    title: string,
    gradient: string,
    backgroundImage?: string | null,
    lists?: List[],
    key?: string
  ) => Promise<void>
  deleteBoard: (boardId: string) => void
  updateBoard: (boardId: string, updates: Partial<Board>) => void
  toggleStarBoard: (boardId: string) => void
  addList: (boardId: string, title: string) => void
  deleteList: (boardId: string, listId: string) => void
  updateListTitle: (boardId: string, listId: string, title: string) => void
  addCard: (boardId: string, listId: string, title: string) => void
  archiveCard: (boardId: string, listId: string, cardId: string) => void
  updateCard: (boardId: string, listId: string, cardId: string, updates: Partial<Card>) => void
  handleDragEnd: (boardId: string, result: DropResult) => void
  restoreBoard: (boardId: string) => void
  restoreCard: (boardId: string, listId: string, cardId: string) => void
  deleteBoardPermanently: (boardId: string) => Promise<void>
  deleteCardPermanently: (boardId: string, listId: string, cardId: string) => void
  refreshBoards: () => Promise<void>
  persistBoardsNow: () => Promise<void>
}

const BoardContext = createContext<BoardContextValue | null>(null)

// Strip context-only fields before writing to DB
function extractBoardData(board: Board): Omit<Board, 'ownerId' | 'memberRole' | 'ownerName'> {
  const { ownerId, memberRole, ownerName, ...data } = board
  // suppress unused variable warnings for destructured context-only fields
  void ownerId
  void memberRole
  void ownerName
  return data
}

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const isAuthenticated = !!user && !authLoading

  const [boards, setBoards] = useState<Board[]>([])
  const [membershipMap, setMembershipMap] = useState<Record<string, BoardRole>>({})
  const [boardsLoading, setBoardsLoading] = useState(true)
  const [isSavingBoards, setIsSavingBoards] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)
  const isInitialLoad = useRef(true)
  const lastSavedRef = useRef<Record<string, string>>({})

  // Load boards on auth
  useEffect(() => {
    if (authLoading) return

    if (!isAuthenticated || !user?.id) {
      isInitialLoad.current = true
      setBoards([])
      setMembershipMap({})
      setBoardsLoading(false)
      return
    }

    let cancelled = false
    isInitialLoad.current = true
    setBoardsLoading(true)

    ;(async () => {
      await apiRunMigrationIfNeeded(user.id)
      if (cancelled) return

      const { boards: rawBoards, membershipMap: map } = await apiFetchAllBoards(user.id)
      if (cancelled) return

      const allBoards = rawBoards.map((b) => ({
        ...b,
        key: b.key || generateBoardKey(b.title),
        nextCardNumber: b.nextCardNumber ?? 0,
      }))
      allBoards.forEach((b) => {
        lastSavedRef.current[b.id] = JSON.stringify(extractBoardData(b))
      })
      setBoards(allBoards)
      setMembershipMap(map)
      setBoardsLoading(false)
      isInitialLoad.current = false
    })()

    return () => {
      cancelled = true
    }
  }, [isAuthenticated, authLoading, user?.id])

  // Realtime: listen for board updates from other clients
  useEffect(() => {
    if (!isAuthenticated) return

    const channel = supabase
      .channel('boards-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'boards' }, (payload) => {
        const updated = payload.new as { id: string; data: Partial<Board> } | null
        if (!updated) return
        setBoards((prev) => {
          const existing = prev.find((b) => b.id === updated.id)
          if (!existing) return prev
          const merged: Board = { ...existing, ...updated.data, id: updated.id }
          lastSavedRef.current[updated.id] = JSON.stringify(extractBoardData(merged))
          return prev.map((b) => (b.id === updated.id ? merged : b))
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAuthenticated])

  // Debounced save: finds dirty boards and writes them individually
  const saveBoards = useDebouncedCallback(async (...args: unknown[]) => {
    const currentBoards = args[0] as Board[]
    const currentMembershipMap = args[1] as Record<string, BoardRole>
    const dirty = currentBoards.filter((b) => {
      if (currentMembershipMap[b.id] === 'observer') return false
      return JSON.stringify(extractBoardData(b)) !== lastSavedRef.current[b.id]
    })

    if (dirty.length === 0) {
      setIsSavingBoards(false)
      return
    }

    await Promise.all(
      dirty.map(async (board) => {
        const boardData = extractBoardData(board)
        try {
          await apiSaveBoard(board.id, boardData)
          lastSavedRef.current[board.id] = JSON.stringify(boardData)
        } catch {
          // error already logged in apiSaveBoard
        }
      })
    )

    setLastSavedAt(new Date())
    setIsSavingBoards(false)
  }, 1000)

  useEffect(() => {
    if (isInitialLoad.current || !isAuthenticated) return
    setIsSavingBoards(true)
    saveBoards.run(boards, membershipMap)
  }, [boards, isAuthenticated, membershipMap, saveBoards])

  const updateData = useCallback((updater: Board[] | ((prev: Board[]) => Board[])) => {
    setBoards((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }, [])

  const getBoardRole = useCallback(
    (boardId: string): BoardRole | null => membershipMap[boardId] || null,
    [membershipMap]
  )

  const getBoard = useCallback(
    (boardIdOrKey: string): Board | null => {
      const upper = boardIdOrKey.toUpperCase()
      const board = boards.find(
        (b) =>
          !b.archived &&
          (b.id === boardIdOrKey ||
            (b.key && b.key === upper) ||
            generateBoardKey(b.title) === upper)
      )
      if (!board) return null
      return {
        ...board,
        lists: board.lists.map((l) => ({ ...l, cards: l.cards.filter((c) => !c.archived) })),
      }
    },
    [boards]
  )

  const addBoard = useCallback(
    async (
      title: string,
      gradient: string,
      backgroundImage: string | null = null,
      lists: List[] = [],
      key?: string
    ): Promise<void> => {
      const id = uuidv4()
      const now = new Date().toISOString()
      const boardKey = key || generateBoardKey(title)
      const boardData: Board = {
        id,
        key: boardKey,
        title,
        gradient,
        backgroundImage,
        starred: false,
        archived: false,
        archivedAt: null,
        createdAt: now,
        lists,
        nextCardNumber: 0,
      }
      const newBoard: Board = {
        ownerId: user!.id,
        memberRole: 'owner',
        ownerName: null,
        ...boardData,
      }

      // Optimistic add
      lastSavedRef.current[id] = JSON.stringify(extractBoardData(boardData))
      setMembershipMap((prev) => ({ ...prev, [id]: 'owner' }))
      setBoards((prev) => [...prev, newBoard])

      try {
        await apiCreateBoard(id, user!.id, boardData)
      } catch {
        // error already logged in apiCreateBoard; rollback optimistic add
        setBoards((prev) => prev.filter((b) => b.id !== id))
        setMembershipMap((prev) => {
          const n = { ...prev }
          delete n[id]
          return n
        })
        delete lastSavedRef.current[id]
      }
    },
    [user?.id]
  ) // eslint-disable-line react-hooks/exhaustive-deps

  const deleteBoard = useCallback(
    (boardId: string) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id === boardId
            ? { ...b, archived: true, archivedAt: new Date().toISOString(), starred: false }
            : b
        )
      )
    },
    [updateData]
  )

  const deleteBoardPermanently = useCallback(
    async (boardId: string): Promise<void> => {
      if (membershipMap[boardId] !== 'owner') return
      try {
        await apiDeleteBoard(boardId)
      } catch {
        return // error already logged
      }
      delete lastSavedRef.current[boardId]
      setMembershipMap((prev) => {
        const n = { ...prev }
        delete n[boardId]
        return n
      })
      setBoards((prev) => prev.filter((b) => b.id !== boardId))
    },
    [membershipMap]
  )

  const updateBoard = useCallback(
    (boardId: string, updates: Partial<Board>) => {
      updateData((prev) => prev.map((b) => (b.id === boardId ? { ...b, ...updates } : b)))
    },
    [updateData]
  )

  const toggleStarBoard = useCallback(
    (boardId: string) => {
      updateData((prev) => prev.map((b) => (b.id === boardId ? { ...b, starred: !b.starred } : b)))
    },
    [updateData]
  )

  const restoreBoard = useCallback(
    (boardId: string) => {
      updateData((prev) =>
        prev.map((b) => (b.id === boardId ? { ...b, archived: false, archivedAt: null } : b))
      )
    },
    [updateData]
  )

  const addList = useCallback(
    (boardId: string, title: string) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId ? b : { ...b, lists: [...b.lists, { id: uuidv4(), title, cards: [] }] }
        )
      )
    },
    [updateData]
  )

  const deleteList = useCallback(
    (boardId: string, listId: string) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId ? b : { ...b, lists: b.lists.filter((l) => l.id !== listId) }
        )
      )
    },
    [updateData]
  )

  const updateListTitle = useCallback(
    (boardId: string, listId: string, title: string) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId
            ? b
            : { ...b, lists: b.lists.map((l) => (l.id === listId ? { ...l, title } : l)) }
        )
      )
    },
    [updateData]
  )

  const addCard = useCallback(
    (boardId: string, listId: string, title: string) => {
      updateData((prev) =>
        prev.map((b) => {
          if (b.id !== boardId) return b
          const nextNum = (b.nextCardNumber ?? 0) + 1
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
          return {
            ...b,
            nextCardNumber: nextNum,
            lists: b.lists.map((l) =>
              l.id !== listId ? l : { ...l, cards: [...l.cards, newCard] }
            ),
          }
        })
      )
    },
    [updateData]
  )

  const archiveCard = useCallback(
    (boardId: string, listId: string, cardId: string) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId
            ? b
            : {
                ...b,
                lists: b.lists.map((l) =>
                  l.id !== listId
                    ? l
                    : {
                        ...l,
                        cards: l.cards.map((c) =>
                          c.id === cardId
                            ? { ...c, archived: true, archivedAt: new Date().toISOString() }
                            : c
                        ),
                      }
                ),
              }
        )
      )
    },
    [updateData]
  )

  const restoreCard = useCallback(
    (boardId: string, listId: string, cardId: string) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId
            ? b
            : {
                ...b,
                lists: b.lists.map((l) =>
                  l.id !== listId
                    ? l
                    : {
                        ...l,
                        cards: l.cards.map((c) =>
                          c.id === cardId ? { ...c, archived: false, archivedAt: null } : c
                        ),
                      }
                ),
              }
        )
      )
    },
    [updateData]
  )

  const deleteCardPermanently = useCallback(
    (boardId: string, listId: string, cardId: string) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId
            ? b
            : {
                ...b,
                lists: b.lists.map((l) =>
                  l.id !== listId
                    ? l
                    : {
                        ...l,
                        cards: l.cards.filter((c) => c.id !== cardId),
                      }
                ),
              }
        )
      )
    },
    [updateData]
  )

  const updateCard = useCallback(
    (boardId: string, listId: string, cardId: string, updates: Partial<Card>) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId
            ? b
            : {
                ...b,
                lists: b.lists.map((l) =>
                  l.id !== listId
                    ? l
                    : {
                        ...l,
                        cards: l.cards.map((c) => (c.id === cardId ? { ...c, ...updates } : c)),
                      }
                ),
              }
        )
      )
    },
    [updateData]
  )

  const handleDragEnd = useCallback(
    (boardId: string, result: DropResult) => {
      const { source, destination, type } = result
      if (!destination) return
      if (source.droppableId === destination.droppableId && source.index === destination.index)
        return

      updateData((prev) => {
        const newBoards = prev.map((b) => ({ ...b }))
        const board = newBoards.find((b) => b.id === boardId)
        if (!board) return prev
        board.lists = board.lists.map((l) => ({ ...l, cards: [...l.cards] }))

        if (type === 'list') {
          const [moved] = board.lists.splice(source.index, 1)
          board.lists.splice(destination.index, 0, moved)
        } else {
          const srcList = board.lists.find((l) => l.id === source.droppableId)
          const destList = board.lists.find((l) => l.id === destination.droppableId)
          if (!srcList || !destList) return prev
          const [movedCard] = srcList.cards.splice(source.index, 1)
          destList.cards.splice(destination.index, 0, movedCard)
        }
        return newBoards
      })
    },
    [updateData]
  )

  const refreshBoards = useCallback(async (): Promise<void> => {
    if (!user?.id) return
    isInitialLoad.current = true
    const { boards: rawBoards, membershipMap: map } = await apiFetchAllBoards(user.id)
    const allBoards = rawBoards.map((b) => ({
      ...b,
      key: b.key || generateBoardKey(b.title),
      nextCardNumber: b.nextCardNumber ?? 0,
    }))
    allBoards.forEach((b) => {
      lastSavedRef.current[b.id] = JSON.stringify(extractBoardData(b))
    })
    setBoards(allBoards)
    setMembershipMap(map)
    setTimeout(() => {
      isInitialLoad.current = false
    }, 150)
  }, [user?.id])

  const persistBoardsNow = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return
    saveBoards.cancel()
    const dirty = boards.filter((b) => {
      if (membershipMap[b.id] === 'observer') return false
      return JSON.stringify(extractBoardData(b)) !== lastSavedRef.current[b.id]
    })
    if (dirty.length === 0) return
    setIsSavingBoards(true)
    await Promise.all(
      dirty.map(async (board) => {
        const boardData = extractBoardData(board)
        try {
          await apiSaveBoard(board.id, boardData)
          lastSavedRef.current[board.id] = JSON.stringify(boardData)
        } catch {
          // error already logged in apiSaveBoard
        }
      })
    )
    setLastSavedAt(new Date())
    setIsSavingBoards(false)
  }, [boards, isAuthenticated, membershipMap, saveBoards])

  const activeBoards = boards
    .filter((b) => !b.archived)
    .map((b) => ({
      ...b,
      lists: b.lists.map((l) => ({ ...l, cards: l.cards.filter((c) => !c.archived) })),
    }))

  const archivedBoards = boards.filter((b) => b.archived && b.memberRole === 'owner')

  const archivedCards: ArchivedCard[] = boards
    .filter((b) => !b.archived)
    .flatMap((b) =>
      b.lists.flatMap((l) =>
        l.cards
          .filter((c) => c.archived)
          .map((c) => ({
            ...c,
            boardId: b.id,
            boardTitle: b.title,
            listId: l.id,
            listTitle: l.title,
          }))
      )
    )

  return (
    <BoardContext.Provider
      value={{
        boards: activeBoards,
        archivedBoards,
        archivedCards,
        membershipMap,
        boardsLoading,
        isSavingBoards,
        lastSavedAt,
        getBoardRole,
        getBoard,
        addBoard,
        deleteBoard,
        updateBoard,
        toggleStarBoard,
        addList,
        deleteList,
        updateListTitle,
        addCard,
        archiveCard,
        updateCard,
        handleDragEnd,
        restoreBoard,
        restoreCard,
        deleteBoardPermanently,
        deleteCardPermanently,
        refreshBoards,
        persistBoardsNow,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}

export function useBoards(): BoardContextValue {
  const context = useContext(BoardContext)
  if (!context) throw new Error('useBoards must be used within BoardProvider')
  return context
}
