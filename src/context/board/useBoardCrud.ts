import { useCallback } from 'react'
import type { MutableRefObject, Dispatch, SetStateAction } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { apiCreateBoard, apiDeleteBoard } from '@/api'
import { extractBoardData, generateBoardKey } from '@/utils/board'
import type { Board, BoardRole, List } from '@/types/board'

type UpdateData = (updater: Board[] | ((prev: Board[]) => Board[])) => void

interface User {
  id: string
}

interface BoardCrud {
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
  restoreBoard: (boardId: string) => void
  deleteBoardPermanently: (boardId: string) => Promise<void>
}

export function useBoardCrud(
  updateData: UpdateData,
  user: User | null,
  setMembershipMap: Dispatch<SetStateAction<Record<string, BoardRole>>>,
  lastSavedRef: MutableRefObject<Record<string, string>>,
  membershipMap: Record<string, BoardRole>
): BoardCrud {
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
      updateData((prev) => [...prev, newBoard])

      try {
        await apiCreateBoard(id, user!.id, boardData)
      } catch {
        // error already logged in apiCreateBoard; rollback optimistic add
        updateData((prev) => prev.filter((b) => b.id !== id))
        setMembershipMap((prev) => {
          const n = { ...prev }
          delete n[id]
          return n
        })
        delete lastSavedRef.current[id]
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user?.id]
  )

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
      updateData((prev) => prev.filter((b) => b.id !== boardId))
    },
    [membershipMap, setMembershipMap, lastSavedRef, updateData]
  )

  return {
    addBoard,
    deleteBoard,
    updateBoard,
    toggleStarBoard,
    restoreBoard,
    deleteBoardPermanently,
  }
}
