export type BoardRole = 'owner' | 'admin' | 'member' | 'observer'

export type ActivityType =
  | 'member_assigned'
  | 'member_unassigned'
  | 'comment_added'
  | 'moved'
  | 'due_date_set'
  | 'due_date_changed'
  | 'due_date_removed'
  | 'archived'
  | 'description_updated'

export interface ActivityEntry {
  id: string
  boardId: string
  cardId: string
  actorEmail: string
  actorName: string
  type: ActivityType
  payload: Record<string, string>
  createdAt: string
}

export interface CardComment {
  id: string
  boardId: string
  cardId: string
  authorEmail: string
  authorName: string
  content: object
  createdAt: string
}

export interface Label {
  id: string
  text: string
  color: string
}

export interface ChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface CardMember {
  id: string
  name: string
}

export interface Attachment {
  id: string
  name: string
  url?: string
  fileData?: string
  fileName?: string
  addedAt: string
}

export interface Card {
  id: string
  number?: number
  title: string
  description: string
  labels: Label[]
  checklist: ChecklistItem[]
  members: CardMember[]
  comments?: never[]
  attachments: Attachment[]
  dueDate: string | null
  archived: boolean
  archivedAt: string | null
  createdAt: string
}

export interface List {
  id: string
  title: string
  cards: Card[]
}

export interface Board {
  id: string
  key?: string
  title: string
  gradient: string
  backgroundImage: string | null
  starred: boolean
  archived: boolean
  archivedAt: string | null
  createdAt: string
  lists: List[]
  nextCardNumber?: number
  ownerId?: string
  memberRole?: BoardRole
  ownerName?: string | null
}

export interface ArchivedCard extends Card {
  boardId: string
  boardTitle: string
  listId: string
  listTitle: string
}
