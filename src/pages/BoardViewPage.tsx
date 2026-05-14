import { useParams, useNavigate } from 'react-router-dom'
import { useBoards } from '@/context/BoardContext'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult } from '@hello-pangea/dnd'
import KanbanList from '@/features/board-view/KanbanList'
import AddListForm from '@/features/board-view/AddListForm'
import CardDetailModal from '@/features/cards/CardDetailModal'
import BoardHeader from '@/features/board-view/BoardHeader'
import BoardBackgroundModal from '@/features/board-view/BoardBackgroundModal'
import InviteMemberModal from '@/features/members/InviteMemberModal'
import SprintManagerModal from '@/features/sprints/SprintManagerModal'
import { useBoardMembersQuery, useBoardMemberMutations, apiInsertActivity } from '@/api'
import { Button } from '@/components/ui/button'
import ConfirmModal from '@/components/modals/ConfirmModal'
import EditMemberRoleModal from '@/features/members/EditMemberRoleModal'
import { useState } from 'react'
import { usePageTitle } from '@/hooks/usePageTitle'
import { toast } from 'sonner'
import { GRADIENT_STYLES } from '@/utils/gradients'
import type { GradientKey } from '@/utils/gradients'
import { useBoardFilters } from '@/features/board-view/useBoardFilters'
import { useSelectedCardRoute } from '@/features/board-view/useSelectedCardRoute'
import { generateBoardKey } from '@/utils/board'
import { resolveActorIdentity } from '@/utils/user'
import { sendNotification } from '@/context/NotificationContext'
import { useAuth } from '@/context/AuthContext'
import type { BoardRole, BoardMember, Card } from '@/types/board'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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
    addSprint,
    updateSprint,
    deleteSprint,
  } = useBoards()

  const board = getBoard(boardSlug!)
  const boardId = board?.id
  usePageTitle(board?.title)
  const role = getBoardRole(boardId ?? '')
  const canEdit = role === 'owner' || role === 'admin' || role === 'member'

  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false)
  const [showFilter, setShowFilter] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [showSprintManager, setShowSprintManager] = useState(false)
  const [sprintManagerInitialCreate, setSprintManagerInitialCreate] = useState(false)
  const { data: boardMembers = [], refetch: handleMembersRefresh } = useBoardMembersQuery(boardId)
  const { removeMember, updateRole } = useBoardMemberMutations(boardId)
  const [confirmDeleteMember, setConfirmDeleteMember] = useState<{
    userId: string
    name: string
  } | null>(null)
  const [confirmArchiveBoard, setConfirmArchiveBoard] = useState(false)
  const [editingMember, setEditingMember] = useState<BoardMember | null>(null)

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
    setSprint,
    setPriority,
    setCardType,
    clear: clearAllFilters,
  } = useBoardFilters(board)

  const { selectedCard, handleCardOpen, handleCardClose } = useSelectedCardRoute(
    board,
    cardNumberParam
  )

  const { user } = useAuth()

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

  const handleRemoveMember = async (userId: string) => {
    if (!boardId) return
    const member = boardMembers.find((m) => m.userId === userId)
    setConfirmDeleteMember({ userId, name: member?.display_name || member?.email || 'this member' })
  }

  const performRemoveMember = async (userId: string) => {
    await removeMember(userId)
    setConfirmDeleteMember(null)
  }
  const handleUpdateMemberRole = async (userId: string, newRole: BoardRole) => {
    await updateRole(userId, newRole)
  }
  const getActorIdentity = () => {
    return resolveActorIdentity(user, boardMembers)
  }

  const notifyCardMoved = (movedCard: Card, srcListTitle: string, destListTitle: string) => {
    const { actorEmail, actorName } = getActorIdentity()

    void apiInsertActivity({
      boardId: boardId!,
      cardId: movedCard.id,
      actorEmail,
      actorName,
      type: 'moved',
      payload: { from: srcListTitle, to: destListTitle },
    })

    for (const assignedMember of movedCard.members ?? []) {
      const member = boardMembers.find((m) => m.userId === assignedMember.id)
      if (member?.email && member.email !== actorEmail) {
        void sendNotification({
          userEmail: member.email,
          title: `${movedCard.title} — ${board.title}`,
          body: `${actorName} moved this from ${srcListTitle} to ${destListTitle}`,
          boardId: boardId!,
          cardId: movedCard.id,
        })
      }
    }
  }

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

    notifyCardMoved(movedCard, srcList.title, destList.title)
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
        filterSprint={filters.sprint}
        setFilterSprint={setSprint}
        filterPriority={filters.priority}
        setFilterPriority={setPriority}
        filterCardType={filters.cardType}
        setFilterCardType={setCardType}
        allLabels={allLabels}
        allSprints={board.sprints ?? []}
        clearAllFilters={clearAllFilters}
        onSprintManager={() => {
          setSprintManagerInitialCreate(false)
          setShowSprintManager(true)
        }}
        onCreateSprint={() => {
          setSprintManagerInitialCreate(true)
          setShowSprintManager(true)
        }}
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
                        boardMembers={boardMembers}
                        sprints={board.sprints ?? []}
                        dragHandleProps={provided.dragHandleProps}
                        onDeleteList={(listId) => deleteList(boardId!, listId)}
                        onUpdateListTitle={(listId, title) =>
                          updateListTitle(boardId!, listId, title)
                        }
                        onAddCard={async (listId, title) => {
                          const { actorEmail, actorName } = getActorIdentity()
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
                              actorEmail,
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

      {showSprintManager && (
        <SprintManagerModal
          sprints={board.sprints ?? []}
          initialOpenCreate={sprintManagerInitialCreate}
          onAdd={(data) => addSprint(boardId!, data)}
          onUpdate={(sprintId, updates) => updateSprint(boardId!, sprintId, updates)}
          onDelete={(sprintId) => deleteSprint(boardId!, sprintId)}
          onClose={() => setShowSprintManager(false)}
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
