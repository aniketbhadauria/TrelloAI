import { supabase } from '@/lib/supabase'
import { logError, logInfo } from '@/lib/logger'
import type { Board, BoardRole } from '@/types/board'

export interface FetchBoardsResult {
  boards: Board[]
  membershipMap: Record<string, BoardRole>
}

export async function apiRunMigrationIfNeeded(userId: string): Promise<void> {
  const key = `migrated_to_boards_v2_${userId}`
  if (localStorage.getItem(key)) return

  try {
    const { count } = await supabase
      .from('boards')
      .select('id', { count: 'exact', head: true })
      .eq('owner_id', userId)

    if (count && count > 0) {
      localStorage.setItem(key, '1')
      return
    }

    const { data: oldRow } = await supabase
      .from('app_boards')
      .select('data')
      .eq('id', userId)
      .maybeSingle()

    const oldBoards = (oldRow?.data as { boards?: Board[] } | null)?.boards || []
    if (oldBoards.length > 0) {
      const now = new Date().toISOString()
      await supabase.from('boards').insert(
        oldBoards.map((b: Board) => ({
          id: b.id,
          owner_id: userId,
          data: b,
          created_at: b.createdAt || now,
          updated_at: now,
        }))
      )
    }
  } catch (err) {
    logError('board_migration_failed', { message: (err as Error).message, userId })
  }

  localStorage.setItem(key, '1')
}

export async function apiFetchAllBoards(userId: string): Promise<FetchBoardsResult> {
  const [ownedResult, sharedResult] = await Promise.all([
    supabase.from('boards').select('*').eq('owner_id', userId),
    supabase.from('board_members').select('board_id, role, boards(*)').eq('user_id', userId),
  ])

  if (ownedResult.error)
    logError('boards_fetch_owned_failed', { message: ownedResult.error.message, userId })
  if (sharedResult.error)
    logError('boards_fetch_shared_failed', { message: sharedResult.error.message, userId })

  const membershipMap: Record<string, BoardRole> = {}

  const ownedBoards: Board[] = (ownedResult.data || []).map((row: Record<string, unknown>) => {
    membershipMap[row.id as string] = 'owner'
    return {
      ownerId: row.owner_id as string,
      memberRole: 'owner' as BoardRole,
      ownerName: null,
      ...(row.data as object),
      id: row.id as string,
    } as Board
  })

  const sharedRows = (sharedResult.data || []).filter(
    (m: Record<string, unknown>) => m.boards
  ) as unknown as Array<{
    board_id: string
    role: BoardRole
    boards: { id: string; owner_id: string; data: Partial<Board> }
  }>

  const ownerIds = [...new Set(sharedRows.map((m) => m.boards.owner_id))]
  const ownerNames: Record<string, string> = {}

  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from('app_users')
      .select('id, display_name, email')
      .in('id', ownerIds)
    ;(profiles || []).forEach((p: { id: string; display_name: string | null; email: string }) => {
      ownerNames[p.id] = p.display_name || p.email
    })
  }

  const sharedBoards: Board[] = sharedRows.map((m) => {
    membershipMap[m.boards.id] = m.role
    return {
      ownerId: m.boards.owner_id,
      memberRole: m.role,
      ownerName: ownerNames[m.boards.owner_id] || null,
      ...m.boards.data,
      id: m.boards.id,
    } as Board
  })

  const boards = [...ownedBoards, ...sharedBoards]
  logInfo('boards_loaded', { userId, count: boards.length })
  return { boards, membershipMap }
}

export async function apiCreateBoard(id: string, ownerId: string, boardData: Board): Promise<void> {
  const now = new Date().toISOString()
  const { error } = await supabase.from('boards').insert({
    id,
    owner_id: ownerId,
    data: boardData,
    created_at: now,
    updated_at: now,
  })
  if (error) {
    logError('board_create_failed', { message: error.message, boardId: id })
    throw error
  }
  logInfo('board_created', { boardId: id, userId: ownerId })
}

export async function apiSaveBoard(boardId: string, boardData: object): Promise<void> {
  const { error } = await supabase
    .from('boards')
    .update({ data: boardData, updated_at: new Date().toISOString() })
    .eq('id', boardId)
  if (error) {
    logError('board_save_failed', { boardId, message: error.message })
    throw error
  }
  logInfo('board_saved', { boardId })
}

export async function apiDeleteBoard(boardId: string): Promise<void> {
  const { error } = await supabase.from('boards').delete().eq('id', boardId)
  if (error) {
    logError('board_delete_failed', { boardId, message: error.message })
    throw error
  }
  logInfo('board_deleted', { boardId })
}
