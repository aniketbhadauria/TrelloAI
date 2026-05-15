import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Board } from '@/types/board'

type UpdateData = (updater: Board[] | ((prev: Board[]) => Board[])) => void

interface ListCrud {
  addList: (boardId: string, title: string) => void
  deleteList: (boardId: string, listId: string) => void
  updateListTitle: (boardId: string, listId: string, title: string) => void
}

export function useListCrud(updateData: UpdateData): ListCrud {
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

  return { addList, deleteList, updateListTitle }
}
