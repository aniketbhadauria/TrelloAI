import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Star, MoreHorizontal, Filter, UserPlus, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Board, BoardRole, Label, BoardMember } from '@/types/board'
import BoardFilterPanel from './BoardFilterPanel'
import BoardMembersPanel from './BoardMembersPanel'
import BoardTitleEditor from './BoardTitleEditor'
import BoardKeyEditor from './BoardKeyEditor'
import BoardMemberAvatars from './BoardMemberAvatars'
import BoardMenuPanel from './BoardMenuPanel'
import { useOutsideClick } from '@/hooks/useOutsideClick'

type Setter<T> = T | ((prev: T) => T)

interface BoardHeaderProps {
  board: Board
  canEdit: boolean
  role: BoardRole | null
  members: BoardMember[]
  hasActiveFilters: boolean
  filterOpen: boolean
  onFilterToggle: () => void
  onFilterClose: () => void
  onTitleSave: (title: string) => void
  onKeySave: (key: string) => void
  onStar: () => void
  onInvite: () => void
  onRemoveMember?: (userId: string) => void
  onUpdateMemberRole?: (userId: string, newRole: BoardRole) => void
  onEditMember?: (member: BoardMember) => void
  onBackgroundPicker: () => void
  onArchive: () => void
  filterKeyword: string
  setFilterKeyword: (v: string) => void
  filterLabels: string[]
  setFilterLabels: (v: Setter<string[]>) => void
  filterDueDate: string[]
  setFilterDueDate: (v: Setter<string[]>) => void
  filterStatus: string[]
  setFilterStatus: (v: Setter<string[]>) => void
  filterActivity: string[]
  setFilterActivity: (v: Setter<string[]>) => void
  allLabels: Label[]
  clearAllFilters: () => void
}

export default function BoardHeader({
  board,
  canEdit,
  role,
  members,
  hasActiveFilters,
  filterOpen,
  onFilterToggle,
  onFilterClose,
  onTitleSave,
  onKeySave,
  onStar,
  onInvite,
  onRemoveMember,
  onUpdateMemberRole,
  onEditMember,
  onBackgroundPicker,
  onArchive,
  filterKeyword,
  setFilterKeyword,
  filterLabels,
  setFilterLabels,
  filterDueDate,
  setFilterDueDate,
  filterStatus,
  setFilterStatus,
  filterActivity,
  setFilterActivity,
  allLabels,
  clearAllFilters,
}: BoardHeaderProps) {
  const navigate = useNavigate()
  const [showMenu, setShowMenu] = useState(false)
  const [showMembersPanel, setShowMembersPanel] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const membersRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  useOutsideClick(menuRef, () => setShowMenu(false), showMenu)
  useOutsideClick(membersRef, () => setShowMembersPanel(false), showMembersPanel)
  useOutsideClick(filterRef, () => onFilterClose(), filterOpen)

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/25 backdrop-blur-md shrink-0 relative z-20 text-white">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/boards')}
        className="gap-1.5 text-white/90 hover:text-white hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        Boards
      </Button>
      <div className="w-px h-6 bg-white/20" />

      <BoardTitleEditor title={board.title} canEdit={canEdit} onSave={onTitleSave} />

      <BoardKeyEditor
        boardKey={board.key}
        title={board.title}
        canEdit={canEdit}
        onSave={onKeySave}
      />

      <button onClick={onStar} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
        <Star
          className={`w-4 h-4 ${
            board.starred ? 'fill-yellow-300 text-yellow-300' : 'text-white/60'
          }`}
        />
      </button>

      <div className="flex-1" />

      <BoardMemberAvatars members={members} />

      <Button
        size="sm"
        onClick={onInvite}
        className="gap-1.5 text-xs h-8 bg-white/15 text-white border border-white/25 hover:bg-white/25"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Invite
      </Button>

      <div className="relative" ref={membersRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMembersPanel((v) => !v)}
          className={`gap-1.5 text-white/90 hover:text-white hover:bg-white/10 ${
            showMembersPanel ? 'bg-white/20' : ''
          }`}
        >
          <Users className="w-4 h-4" />
          {members.length > 0 && (
            <span className="text-[10px] bg-white/20 rounded-full px-1.5">{members.length}</span>
          )}
        </Button>
        {showMembersPanel && (
          <BoardMembersPanel
            boardId={board.id}
            members={members}
            role={role}
            ownerId={board.ownerId}
            onRemoveMember={onRemoveMember}
            onUpdateRole={onUpdateMemberRole}
            onEditMember={onEditMember}
            onClose={() => setShowMembersPanel(false)}
          />
        )}
      </div>

      <div className="relative" ref={filterRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFilterToggle}
          className={`gap-1.5 text-white/90 hover:text-white hover:bg-white/10 ${
            hasActiveFilters ? 'bg-white/15' : ''
          }`}
        >
          <Filter className="w-4 h-4" />
          Filter
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-bold">
              !
            </span>
          )}
        </Button>
        {filterOpen && (
          <BoardFilterPanel
            filterKeyword={filterKeyword}
            setFilterKeyword={setFilterKeyword}
            filterLabels={filterLabels}
            setFilterLabels={setFilterLabels}
            filterDueDate={filterDueDate}
            setFilterDueDate={setFilterDueDate}
            filterStatus={filterStatus}
            setFilterStatus={setFilterStatus}
            filterActivity={filterActivity}
            setFilterActivity={setFilterActivity}
            allLabels={allLabels}
            hasActiveFilters={hasActiveFilters}
            clearAllFilters={clearAllFilters}
            onClose={onFilterClose}
          />
        )}
      </div>

      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMenu((v) => !v)}
          className="text-white/90 hover:text-white hover:bg-white/10"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
        {showMenu && (
          <BoardMenuPanel
            role={role}
            onBackgroundPicker={onBackgroundPicker}
            onArchive={onArchive}
            onClose={() => setShowMenu(false)}
          />
        )}
      </div>
    </div>
  )
}
