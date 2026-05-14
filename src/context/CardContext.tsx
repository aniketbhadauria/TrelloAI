import { createContext, useContext } from 'react'
import type { Card, Board, BoardMember } from '@/types/board'

interface CardContextValue {
  boardId: string
  listId: string
  cardId: string
  card: Card
  board: Board
  listTitle: string | undefined
  boardMembers: BoardMember[]
  actorEmail: string
  actorName: string
  actorAvatar: string | undefined
  activeSection: string | null
  setActiveSection: (s: string | null) => void
  /** updateCard pre-filled with boardId/listId/cardId — delegates to BoardContext */
  updateCard: (updates: Partial<Card>) => void
  notifyAssignedMembers: (
    excludeEmail: string,
    title: string,
    body: string,
    email_type?: 'comment' | 'mention'
  ) => void
}

export const CardContext = createContext<CardContextValue | null>(null)

export function useCardContext(): CardContextValue {
  const ctx = useContext(CardContext)
  if (!ctx) throw new Error('useCardContext must be used inside <CardContext.Provider>')
  return ctx
}

export type { CardContextValue }
