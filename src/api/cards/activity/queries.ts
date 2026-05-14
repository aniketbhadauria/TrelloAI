import { useQuery } from '@tanstack/react-query'
import { apiFetchActivity } from './api'
import type { ActivityEntry } from '@/types/board'

export const activityKey = (boardId: string, cardId: string) =>
  ['card-activity', boardId, cardId] as const

export function useCardActivityQuery(boardId: string, cardId: string) {
  return useQuery<ActivityEntry[]>({
    queryKey: activityKey(boardId, cardId),
    queryFn: () => apiFetchActivity(boardId, cardId),
    enabled: !!boardId && !!cardId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}
