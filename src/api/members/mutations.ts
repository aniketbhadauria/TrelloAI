import { useQueryClient } from '@tanstack/react-query'
import { apiRemoveMember, apiUpdateMemberRole } from './api'
import { boardMembersKey } from './queries'
import type { BoardMember } from './api'
import type { BoardRole } from '@/types/board'
import { toast } from 'sonner'

export function useBoardMemberMutations(boardId: string | undefined) {
  const queryClient = useQueryClient()

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: boardMembersKey(boardId ?? '') })

  const removeMember = async (userId: string) => {
    if (!boardId) return
    try {
      await apiRemoveMember(boardId, userId)
      await invalidate()
    } catch {
      toast.error('Failed to remove member.')
    }
  }

  const updateRole = async (userId: string, newRole: BoardRole) => {
    if (!boardId) return
    try {
      await apiUpdateMemberRole(boardId, userId, newRole)
      // Optimistic patch — no extra network call needed
      queryClient.setQueryData<BoardMember[]>(boardMembersKey(boardId), (prev) =>
        prev?.map((m) => (m.userId === userId ? { ...m, role: newRole } : m))
      )
      toast.success('Member role updated')
    } catch {
      toast.error('Failed to update role.')
    }
  }

  return { removeMember, updateRole, invalidate }
}
