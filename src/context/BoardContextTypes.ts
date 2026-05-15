import type { DropResult } from '@hello-pangea/dnd'
import type { Board, ArchivedCard, BoardRole, List, Card, Sprint } from '@/types/board'

export interface BoardContextValue {
  boards: Board[]
  archivedBoards: Board[]
  archivedCards: ArchivedCard[]
  membershipMap: Record<string, BoardRole>
  boardsLoading: boolean
  isSavingBoards: boolean
  lastSavedAt: Date | null
  getBoardRole: (boardId: string) => BoardRole | null
  getBoard: (boardId: string) => Board | null
  addBoard: (
    title: string,
    gradient: string,
    backgroundImage?: string | null,
    lists?: List[],
    key?: string
  ) => Promise<void>
  deleteBoard: (boardId: string) => void
  updateBoard: (boardId: string, updates: Partial<Board>) => void
  toggleStarBoard: (boardId: string) => void
  addList: (boardId: string, title: string) => void
  deleteList: (boardId: string, listId: string) => void
  updateListTitle: (boardId: string, listId: string, title: string) => void
  addCard: (
    boardId: string,
    listId: string,
    title: string,
    creatorName?: string,
    creatorEmail?: string
  ) => Promise<string | undefined>
  archiveCard: (boardId: string, listId: string, cardId: string) => void
  updateCard: (boardId: string, listId: string, cardId: string, updates: Partial<Card>) => void
  handleDragEnd: (boardId: string, result: DropResult) => void
  restoreBoard: (boardId: string) => void
  restoreCard: (boardId: string, listId: string, cardId: string) => void
  deleteBoardPermanently: (boardId: string) => Promise<void>
  deleteCardPermanently: (boardId: string, listId: string, cardId: string) => void
  refreshBoards: () => Promise<void>
  persistBoardsNow: () => Promise<void>
  addSprint: (boardId: string, data: Omit<Sprint, 'id' | 'createdAt'>) => void
  updateSprint: (boardId: string, sprintId: string, updates: Partial<Sprint>) => void
  deleteSprint: (boardId: string, sprintId: string) => void
}
