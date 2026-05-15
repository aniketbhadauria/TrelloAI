import { useState, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Board } from '@/types/board'
import { generateBoardKey } from '@/utils/board'

interface SelectedCard {
  listId: string
  cardId: string
}

export function useSelectedCardRoute(board: Board | null, cardNumberParam?: string) {
  const navigate = useNavigate()
  // fallback for cards that have no number (rare edge case for old data)
  const [manualCard, setManualCard] = useState<SelectedCard | null>(null)

  const boardPath = board ? `/boards/${board.key || generateBoardKey(board.title)}` : '/boards'

  const urlCard = useMemo(() => {
    if (!cardNumberParam || !board) return null
    const num = parseInt(cardNumberParam, 10)
    if (Number.isNaN(num)) return null
    for (const list of board.lists) {
      const card = list.cards.find((c) => c.number === num)
      if (card) return { listId: list.id, cardId: card.id }
    }
    return null
  }, [board, cardNumberParam])

  const selectedCard = urlCard ?? manualCard

  const handleCardOpen = useCallback(
    (listId: string, cardId: string, cardNumber?: number) => {
      if (cardNumber) {
        navigate(`${boardPath}/${cardNumber}`, { replace: true })
      } else {
        setManualCard({ listId, cardId })
      }
    },
    [boardPath, navigate]
  )

  const handleCardClose = useCallback(() => {
    setManualCard(null)
    navigate(boardPath, { replace: true })
  }, [boardPath, navigate])

  return { selectedCard, handleCardOpen, handleCardClose }
}
