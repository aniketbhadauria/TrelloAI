import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Board } from '@/types/board'
import { generateBoardKey } from '@/utils/board'

interface SelectedCard {
  listId: string
  cardId: string
}

export function useSelectedCardRoute(board: Board | null, cardNumberParam?: string) {
  const navigate = useNavigate()
  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null)

  const boardPath = board ? `/boards/${board.key || generateBoardKey(board.title)}` : '/boards'

  useEffect(() => {
    if (!cardNumberParam || !board) return

    const num = parseInt(cardNumberParam, 10)
    if (Number.isNaN(num)) return

    for (const list of board.lists) {
      const card = list.cards.find((c) => c.number === num)
      if (card) {
        setSelectedCard({ listId: list.id, cardId: card.id })
        return
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [board?.id, cardNumberParam])

  const handleCardOpen = useCallback(
    (listId: string, cardId: string, cardNumber?: number) => {
      setSelectedCard({ listId, cardId })
      if (cardNumber) navigate(`${boardPath}/${cardNumber}`, { replace: true })
    },
    [boardPath, navigate]
  )

  const handleCardClose = useCallback(() => {
    setSelectedCard(null)
    navigate(boardPath, { replace: true })
  }, [boardPath, navigate])

  return {
    selectedCard,
    handleCardOpen,
    handleCardClose,
  }
}
