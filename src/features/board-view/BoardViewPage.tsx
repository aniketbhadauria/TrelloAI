import { useParams, useNavigate } from 'react-router-dom'
import { useBoards } from '@/context/BoardContext'
import { useQuery } from '@tanstack/react-query'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import KanbanList from './KanbanList'
import AddListForm from './AddListForm'
import CardDetailModal from '@/features/cards/CardDetailModal'
import BoardHeader from './BoardHeader'
import BoardBackgroundModal from './BoardBackgroundModal'
import InviteMemberModal from '@/features/members/InviteMemberModal'
import { apiFetchBoardMembers } from '@/api/members'
import { Button } from '@/components/ui/button'
import ConfirmModal from '@/components/modals/ConfirmModal'
import EditMemberRoleModal from '@/features/members/EditMemberRoleModal'
import { useState, useEffect } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { toast } from 'sonner'
import { GRADIENT_STYLES } from '@/utils/gradients'
import type { GradientKey } from '@/utils/gradients'
import { useBoardFilters } from './useBoardFilters'
import { generateBoardKey } from '@/utils/board'
import { apiInsertActivity } from '@/api/activity'
import { sendNotification } from '@/context/NotificationContext'
import { useAuth } from '@/context/AuthContext'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface SelectedCard {
  listId: string
  cardId: string
}

import type { BoardRole, BoardMember } from '@/types/board'

export default function BoardView() {
  const { boardId: boardSlug, cardNumber: cardNumberParam } = useParams<{
    boardId: string
    cardNumber?: string
  }>()
  const navigate = useNavigate()
  const {
    getBoard,
    getBoardRole,
    boardsLoading,
    handleDragEnd,
    updateBoard,
    toggleStarBoard,
    addList,
    deleteList,
    updateListTitle,
    addCard,
    deleteBoard,
  } = useBoards()

  const board = getBoard(boardSlug!)
  const boardId = board?.id
  usePageTitle(board?.title)
  const role = getBoardRole(boardId ?? '')
  const canEdit = role === 'owner' || role === 'admin' || role === 'member'

  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null)
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<{
    userId: string
    name: string
  } | null>(null)
  const [confirmArchiveBoard, setConfirmArchiveBoard] = useState(false)
  const [editingMember, setEditingMember] = useState<BoardMember | null>(null)

  const { data: boardMembers = [], refetch: refetchMembers } = useQuery<BoardMember[]>({
    queryKey: ['board-members', boardId],
    queryFn: () => apiFetchBoardMembers(boardId!).then((res) => res as BoardMember[]),
    enabled: !!boardId,
  })

  const {
    filters,
    hasActiveFilters,
    allLabels,
    filteredLists,
    setKeyword,
    setLabels,
    setDueDate,
    setStatus,
    setActivity,
    clear: clearAllFilters,
  } = useBoardFilters(board)

  // Open card from /boards/KEY/N URL param
  useEffect(() => {
    if (!cardNumberParam || !board) return
    const num = parseInt(cardNumberParam, 10)
    for (const list of board.lists) {
      const card = list.cards.find((c) => c.number === num)
      if (card) {
        setSelectedCard({ listId: list.id, cardId: card.id })
        return
      }
    }
  }, [board?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-4">
        <p className="text-muted-foreground text-lg">Board not found</p>
        <Button onClick={() => navigate('/boards')}>Go home</Button>
      </div>
    )
  }

  // Redirect UUID URLs to key-based URLs
  if (UUID_RE.test(boardSlug!)) {
    const keySlug = board.key || generateBoardKey(board.title)
    navigate(`/boards/${keySlug}${cardNumberParam ? `/${cardNumberParam}` : ''}`, { replace: true })
    return null
  }

  const boardStyle: React.CSSProperties = board.backgroundImage
    ? {
        backgroundImage: `url('${board.backgroundImage}')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    : { backgroundColor: GRADIENT_STYLES[board.gradient as GradientKey] ?? '#475569' }

  const boardPath = `/boards/${board.key || generateBoardKey(board.title)}`

  const handleCardOpen = (listId: string, cardId: string, cardNumber?: number) => {
    setSelectedCard({ listId, cardId })
    if (cardNumber) navigate(`${boardPath}/${cardNumber}`, { replace: true })
  }

  const handleCardClose = () => {
    setSelectedCard(null)
    navigate(boardPath, { replace: true })
  }

  const handleArchive = async () => {
    if (role !== 'owner') return
    setConfirmArchiveBoard(true)
  }

  const performArchive = async () => {
    try {
      await Promise.resolve(deleteBoard(boardId!))
      navigate('/')
    } catch {
      toast.error('Unable to archive this board right now. Please try again.')
    }
  }

  const handleMembersRefresh = () => {
    refetchMembers()
  }

  const handleRemoveMember = async (userId: string) => {
    if (!boardId) return
    const member = boardMembers.find((m) => m.userId === userId)
    setConfirmDeleteMember({ userId, name: member?.display_name || member?.email || 'this member' })
  }

  const performRemoveMember = async (userId: string) => {
    try {
      const { apiRemoveMember } = await import('@/api/members')
      await apiRemoveMember(boardId!, userId)
      handleMembersRefresh()
    } catch {
      toast.error('Failed to remove member.')
    }
  }
  const handleUpdateMemberRole = async (userId: string, newRole: BoardRole) => {
    try {
      const { apiUpdateMemberRole } = await import('@/api/members')
      await apiUpdateMemberRole(boardId!, userId, newRole)
      handleMembersRefresh()
      toast.success('Member role updated')
    } catch {
      toast.error('Failed to update role.')
    }
  }
  const { user } = useAuth()

  const handleDragEndWithNotify = (result: DropResult) => {
    const { source, destination, type } = result
    if (!destination) {
      handleDragEnd(boardId!, result)
      return
    }
    if (type !== 'card' || source.droppableId === destination.droppableId) {
      handleDragEnd(boardId!, result)
      return
    }

    // Capture state before the move
    const srcList = board.lists.find((l) => l.id === source.droppableId)
    const destList = board.lists.find((l) => l.id === destination.droppableId)
    const movedCard = srcList?.cards[source.index]

    handleDragEnd(boardId!, result)

    if (!movedCard || !srcList || !destList) return

    const actorEmail = user?.email ?? ''
    const member = boardMembers.find((m) => m.userId === user?.id)
    const actorName =
      member?.display_name ||
      user?.user_metadata?.display_name ||
      user?.user_metadata?.full_name ||
      user?.email ||
      'Someone'

    void apiInsertActivity({
      boardId: boardId!,
      cardId: movedCard.id,
      actorEmail,
      actorName,
      type: 'moved',
      payload: { from: srcList.title, to: destList.title },
    })

    for (const assignedMember of movedCard.members ?? []) {
      const member = boardMembers.find((m) => m.userId === assignedMember.id)
      if (member?.email && member.email !== actorEmail) {
        void sendNotification({
          userEmail: member.email,
          title: `${movedCard.title} — ${board.title}`,
          body: `${actorName} moved this from ${srcList.title} to ${destList.title}`,
          boardId: boardId!,
          cardId: movedCard.id,
        })
      }
    }
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col page-enter" style={boardStyle}>
      <BoardHeader
        board={board}
        canEdit={canEdit}
        role={role}
        members={boardMembers}
        hasActiveFilters={hasActiveFilters}
        filterOpen={showFilter}
        onFilterToggle={() => setShowFilter((v) => !v)}
        onFilterClose={() => setShowFilter(false)}
        onTitleSave={(title) => updateBoard(boardId!, { title })}
        onKeySave={(key) => {
          updateBoard(boardId!, { key })
          navigate(`/boards/${key}`, { replace: true })
        }}
        onStar={() => toggleStarBoard(boardId!)}
        onInvite={() => setShowInvite(true)}
        onRemoveMember={handleRemoveMember}
        onUpdateMemberRole={handleUpdateMemberRole}
        onEditMember={(m) => setEditingMember(m)}
        onBackgroundPicker={() => setShowBackgroundPicker(true)}
        onArchive={handleArchive}
        filterKeyword={filters.keyword}
        setFilterKeyword={setKeyword}
        filterLabels={filters.labels}
        setFilterLabels={setLabels}
        filterDueDate={filters.dueDate}
        setFilterDueDate={setDueDate}
        filterStatus={filters.status}
        setFilterStatus={setStatus}
        filterActivity={filters.activity}
        setFilterActivity={setActivity}
        allLabels={allLabels}
        clearAllFilters={clearAllFilters}
      />

      <DragDropContext onDragEnd={handleDragEndWithNotify}>
        <Droppable droppableId="board" direction="horizontal" type="list">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="kanban-board">
              {filteredLists.map((list, index) => (
                <Draggable key={list.id} draggableId={list.id} index={index}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps}>
                      <KanbanList
                        list={list}
                        boardKey={board.key}
                        dragHandleProps={provided.dragHandleProps}
                        onDeleteList={(listId) => deleteList(boardId!, listId)}
                        onUpdateListTitle={(listId, title) =>
                          updateListTitle(boardId!, listId, title)
                        }
                        onAddCard={async (listId, title) => {
                          const member = boardMembers.find((m) => m.userId === user?.id)
                          const actorName =
                            member?.display_name ||
                            user?.user_metadata?.display_name ||
                            user?.user_metadata?.full_name ||
                            user?.email ||
                            'Someone'
                          const cardId = await addCard(
                            boardId!,
                            listId,
                            title,
                            actorName,
                            user?.email || undefined
                          )
                          if (cardId && user) {
                            void apiInsertActivity({
                              boardId: boardId!,
                              cardId,
                              actorEmail: user.email || '',
                              actorName,
                              type: 'card_created',
                            })
                          }
                        }}
                        onCardClick={(listId, cardId, cardNumber) =>
                          handleCardOpen(listId, cardId, cardNumber)
                        }
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <AddListForm onAdd={(title) => addList(boardId!, title)} />
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {selectedCard && (
        <CardDetailModal
          boardId={boardId!}
          listId={selectedCard.listId}
          cardId={selectedCard.cardId}
          boardMembers={boardMembers}
          onClose={handleCardClose}
        />
      )}

      {showBackgroundPicker && (
        <BoardBackgroundModal
          currentGradient={board.gradient}
          currentBackgroundImage={board.backgroundImage}
          onSelectGradient={(g) => updateBoard(boardId!, { gradient: g, backgroundImage: null })}
          onSelectImage={(url) => updateBoard(boardId!, { backgroundImage: url })}
          onClose={() => setShowBackgroundPicker(false)}
        />
      )}

      {showInvite && (
        <InviteMemberModal
          boardId={boardId!}
          boardTitle={board.title}
          ownerId={board.ownerId}
          onClose={() => {
            setShowInvite(false)
            handleMembersRefresh()
          }}
        />
      )}

      {confirmDeleteMember && (
        <ConfirmModal
          title="Remove member"
          message={`Are you sure you want to remove ${confirmDeleteMember.name} from this board? They will lose access to all cards.`}
          confirmText="Remove"
          variant="destructive"
          onConfirm={() => performRemoveMember(confirmDeleteMember.userId)}
          onClose={() => setConfirmDeleteMember(null)}
        />
      )}

      {confirmArchiveBoard && (
        <ConfirmModal
          title="Archive board"
          message="Are you sure you want to archive this board? You can restore it later from your data if needed."
          confirmText="Archive"
          variant="destructive"
          onConfirm={performArchive}
          onClose={() => setConfirmArchiveBoard(false)}
        />
      )}

      {editingMember && (
        <EditMemberRoleModal
          member={editingMember}
          currentRole={editingMember.role || 'member'}
          onSave={(newRole) => handleUpdateMemberRole(editingMember.userId, newRole)}
          onClose={() => setEditingMember(null)}
        />
      )}
    </div>
  )
}
