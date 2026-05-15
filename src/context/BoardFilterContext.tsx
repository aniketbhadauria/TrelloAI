import { createContext, useContext } from 'react'
import type { useBoardFilters } from '@/features/board-view/useBoardFilters'

export type BoardFilterContextValue = ReturnType<typeof useBoardFilters>

const BoardFilterContext = createContext<BoardFilterContextValue | null>(null)

interface BoardFilterProviderProps {
  value: BoardFilterContextValue
  children: React.ReactNode
}

export function BoardFilterProvider({ value, children }: BoardFilterProviderProps) {
  return <BoardFilterContext.Provider value={value}>{children}</BoardFilterContext.Provider>
}

export function useBoardFilterContext(): BoardFilterContextValue {
  const ctx = useContext(BoardFilterContext)
  if (!ctx) throw new Error('useBoardFilterContext must be used within a BoardFilterProvider')
  return ctx
}
