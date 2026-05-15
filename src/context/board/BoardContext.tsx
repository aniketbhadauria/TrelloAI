import { createContext, useContext, useCallback, useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '@/context/AuthContext'
import { apiRunMigrationIfNeeded, apiFetchAllBoards } from '@/api'
import type { Board, ArchivedCard, BoardRole } from '@/types/board'
import { generateBoardKey, extractBoardData } from '@/utils/board'
import { useBoardPersistence } from './useBoardPersistence'
import { useListCrud } from './useListCrud'
import { useCardCrud } from './useCardCrud'
import { useSprintCrud } from './useSprintCrud'
import { useBoardCrud } from './useBoardCrud'
import type { BoardContextValue } from './BoardContextTypes'

export type { BoardContextValue }

const BoardContext = createContext<BoardContextValue | null>(null)

export function BoardProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const isAuthenticated = !!user && !authLoading

  const [boards, setBoards] = useState<Board[]>([])
  const [membershipMap, setMembershipMap] = useState<Record<string, BoardRole>>({})
  const [boardsLoading, setBoardsLoading] = useState(true)
  const isInitialLoad = useRef(true)
  const lastSavedRef = useRef<Record<string, string>>({})

  const updateData = useCallback((updater: Board[] | ((prev: Board[]) => Board[])) => {
    setBoards((prev) => (typeof updater === 'function' ? updater(prev) : updater))
  }, [])

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

  const { isSavingBoards, lastSavedAt, saveBoards, persistBoardsNow } = useBoardPersistence(
    boards,
    membershipMap,
    isAuthenticated,
    lastSavedRef
  )

  // Trigger debounced save whenever boards change
  useEffect(() => {
    if (isInitialLoad.current || !isAuthenticated) return
    saveBoards.run(boards, membershipMap)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, isAuthenticated, membershipMap])

  const { addList, deleteList, updateListTitle } = useListCrud(updateData)
  const { addCard, archiveCard, restoreCard, updateCard, deleteCardPermanently, handleDragEnd } =
    useCardCrud(updateData)
  const { addSprint, updateSprint, deleteSprint } = useSprintCrud(updateData)
  const {
    addBoard,
    deleteBoard,
    updateBoard,
    toggleStarBoard,
    restoreBoard,
    deleteBoardPermanently,
  } = useBoardCrud(updateData, user, setMembershipMap, lastSavedRef, membershipMap)

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
        addSprint,
        updateSprint,
        deleteSprint,
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
