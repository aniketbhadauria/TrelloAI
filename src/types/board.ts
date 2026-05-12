export type BoardRole = 'owner' | 'admin' | 'member' | 'observer';

export interface Label {
  id: string;
  text: string;
  color: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface CardMember {
  id: string;
  name: string;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  createdAt: string;
}

export interface Attachment {
  id: string;
  name: string;
  url?: string;
  fileData?: string;
  fileName?: string;
  addedAt: string;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  labels: Label[];
  checklist: ChecklistItem[];
  members: CardMember[];
  comments: Comment[];
  attachments: Attachment[];
  dueDate: string | null;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
}

export interface List {
  id: string;
  title: string;
  cards: Card[];
}

export interface Board {
  id: string;
  title: string;
  gradient: string;
  backgroundImage: string | null;
  starred: boolean;
  archived: boolean;
  archivedAt: string | null;
  createdAt: string;
  lists: List[];
  ownerId?: string;
  memberRole?: BoardRole;
  ownerName?: string | null;
}

export interface ArchivedCard extends Card {
  boardId: string;
  boardTitle: string;
  listId: string;
  listTitle: string;
}
