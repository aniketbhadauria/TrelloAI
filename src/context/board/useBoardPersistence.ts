import { useState, useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { useDebouncedCallback } from '@/hooks/useDebouncedCallback'
import { apiSaveBoard } from '@/api'
import { extractBoardData } from '@/utils/board'
import type { Board, BoardRole } from '@/types/board'

interface BoardPersistence {
  isSavingBoards: boolean
  lastSavedAt: Date | null
  saveBoards: ReturnType<typeof useDebouncedCallback>
  persistBoardsNow: () => Promise<void>
}

export function useBoardPersistence(
  boards: Board[],
  membershipMap: Record<string, BoardRole>,
  isAuthenticated: boolean,
  lastSavedRef: MutableRefObject<Record<string, string>>
): BoardPersistence {
  const [isSavingBoards, setIsSavingBoards] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boards, isAuthenticated, membershipMap])

  return { isSavingBoards, lastSavedAt, saveBoards, persistBoardsNow }
}
