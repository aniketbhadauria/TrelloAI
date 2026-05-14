import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetchComments } from './api'
import type { CardComment } from '@/types/board'

export const commentsKey = (boardId: string, cardId: string) =>
  ['card-comments', boardId, cardId] as const

export function useCardCommentsQuery(boardId: string, cardId: string) {
  return useQuery<CardComment[]>({
    queryKey: commentsKey(boardId, cardId),
    queryFn: () => apiFetchComments(boardId, cardId),
    enabled: !!boardId && !!cardId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}

export function useCommentsCache(boardId: string, cardId: string) {
  const qc = useQueryClient()
  return {
    patch: (updater: (prev: CardComment[] | undefined) => CardComment[]) =>
      qc.setQueryData<CardComment[]>(commentsKey(boardId, cardId), updater),
    invalidate: () => qc.invalidateQueries({ queryKey: commentsKey(boardId, cardId) }),
  }
}
