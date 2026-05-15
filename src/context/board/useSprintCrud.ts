import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { Board, Sprint } from '@/types/board'

type UpdateData = (updater: Board[] | ((prev: Board[]) => Board[])) => void

interface SprintCrud {
  addSprint: (boardId: string, data: Omit<Sprint, 'id' | 'createdAt'>) => void
  updateSprint: (boardId: string, sprintId: string, updates: Partial<Sprint>) => void
  deleteSprint: (boardId: string, sprintId: string) => void
}

export function useSprintCrud(updateData: UpdateData): SprintCrud {
  const addSprint = useCallback(
    (boardId: string, data: Omit<Sprint, 'id' | 'createdAt'>) => {
      const newSprint: Sprint = { ...data, id: uuidv4(), createdAt: new Date().toISOString() }
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId ? b : { ...b, sprints: [...(b.sprints ?? []), newSprint] }
        )
      )
    },
    [updateData]
  )

  const updateSprint = useCallback(
    (boardId: string, sprintId: string, updates: Partial<Sprint>) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId
            ? b
            : {
                ...b,
                sprints: (b.sprints ?? []).map((s) =>
                  s.id === sprintId ? { ...s, ...updates } : s
                ),
              }
        )
      )
    },
    [updateData]
  )

  const deleteSprint = useCallback(
    (boardId: string, sprintId: string) => {
      updateData((prev) =>
        prev.map((b) =>
          b.id !== boardId
            ? b
            : {
                ...b,
                sprints: (b.sprints ?? []).filter((s) => s.id !== sprintId),
                lists: b.lists.map((l) => ({
                  ...l,
                  cards: l.cards.map((c) =>
                    c.sprintId === sprintId ? { ...c, sprintId: null } : c
                  ),
                })),
              }
        )
      )
    },
    [updateData]
  )

  return { addSprint, updateSprint, deleteSprint }
}
