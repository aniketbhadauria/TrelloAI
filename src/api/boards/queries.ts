import { useQuery } from '@tanstack/react-query'
import { apiFetchAllBoards } from './api'
import type { FetchBoardsResult } from './api'

export const boardsKey = (userId: string) => ['boards', userId] as const

export function useBoardsQuery(userId: string | undefined) {
  return useQuery<FetchBoardsResult>({
    queryKey: boardsKey(userId ?? ''),
    queryFn: () => apiFetchAllBoards(userId!),
    enabled: !!userId,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  })
}
