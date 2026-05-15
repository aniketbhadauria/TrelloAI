import { useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'
import type { DropResult } from '@hello-pangea/dnd'
import type { Board, Card } from '@/types/board'

type UpdateData = (updater: Board[] | ((prev: Board[]) => Board[])) => void

interface CardCrud {
  addCard: (
    boardId: string,
    listId: string,
    title: string,
    creatorName?: string,
    creatorEmail?: string
  ) => Promise<string | undefined>
  archiveCard: (boardId: string, listId: string, cardId: string) => void
  restoreCard: (boardId: string, listId: string, cardId: string) => void
  updateCard: (boardId: string, listId: string, cardId: string, updates: Partial<Card>) => void
  deleteCardPermanently: (boardId: string, listId: string, cardId: string) => void
  handleDragEnd: (boardId: string, result: DropResult) => void
}

export function useCardCrud(updateData: UpdateData): CardCrud {
  const addCard = useCallback(
    async (
      boardId: string,
      listId: string,
      title: string,
      creatorName?: string,
      creatorEmail?: string
    ): Promise<string | undefined> => {
      const cardId = uuidv4()
      let nextNum = 0
      updateData((prev) =>
        prev.map((b) => {
          if (b.id !== boardId) return b
          nextNum = (b.nextCardNumber ?? 0) + 1
          const newCard: Card = {
            id: cardId,
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
            creatorName,
            creatorEmail,
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
      return cardId
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

  return { addCard, archiveCard, restoreCard, updateCard, deleteCardPermanently, handleDragEnd }
}
