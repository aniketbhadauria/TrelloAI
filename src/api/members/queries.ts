import { useQuery } from '@tanstack/react-query'
import { apiFetchBoardMembers } from './api'
import type { BoardMember } from './api'

export const boardMembersKey = (boardId: string) => ['board-members', boardId] as const

export function useBoardMembersQuery(boardId: string | undefined) {
  return useQuery<BoardMember[]>({
    queryKey: boardMembersKey(boardId ?? ''),
    queryFn: () => apiFetchBoardMembers(boardId!),
    enabled: !!boardId,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
  })
}
