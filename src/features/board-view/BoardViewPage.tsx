import { useParams, useNavigate } from 'react-router-dom';
import { useBoards } from '@/context/BoardContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanList from './KanbanList';
import AddListForm from './AddListForm';
import CardDetailModal from '@/features/cards/CardDetailModal';
import BoardHeader from './BoardHeader';
import BoardBackgroundModal from './BoardBackgroundModal';
import InviteMemberModal from '@/features/members/InviteMemberModal';
import { apiFetchBoardMembers } from '@/api/members';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { GRADIENT_STYLES } from '@/utils/gradients';
import type { GradientKey } from '@/utils/gradients';
import { useBoardFilters } from './useBoardFilters';
import { generateBoardKey } from '@/utils/board';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SelectedCard {
  listId: string;
  cardId: string;
}

type BoardMember = Awaited<ReturnType<typeof apiFetchBoardMembers>>[number] & { display_name: string | null; email: string | null };

export default function BoardView() {
  const { boardId: boardSlug, cardNumber: cardNumberParam } = useParams<{ boardId: string; cardNumber?: string }>();
  const navigate = useNavigate();
  const {
    getBoard, getBoardRole, boardsLoading,
    handleDragEnd, updateBoard, toggleStarBoard,
    addList, deleteList, updateListTitle, addCard, deleteBoard,
  } = useBoards();

  const board = getBoard(boardSlug!);
  const boardId = board?.id;
  usePageTitle(board?.title);
  const role = getBoardRole(boardId ?? '');
  const canEdit = role === 'owner' || role === 'admin' || role === 'member';

  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [boardMembers, setBoardMembers] = useState<BoardMember[]>([]);

  const {
    filters, hasActiveFilters, allLabels, filteredLists,
    setKeyword, setLabels, setDueDate, setStatus, setActivity, clear: clearAllFilters,
  } = useBoardFilters(board);

  // Open card from /boards/KEY/N URL param
  useEffect(() => {
    if (!cardNumberParam || !board) return;
    const num = parseInt(cardNumberParam, 10);
    for (const list of board.lists) {
      const card = list.cards.find(c => c.number === num);
      if (card) { setSelectedCard({ listId: list.id, cardId: card.id }); return; }
    }
  }, [board?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!boardId) return;
    apiFetchBoardMembers(boardId).then(members => setBoardMembers(members as BoardMember[]));
  }, [boardId]);

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!board) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)] gap-4">
        <p className="text-muted-foreground text-lg">Board not found</p>
        <Button onClick={() => navigate('/boards')}>Go home</Button>
      </div>
    );
  }

  // Redirect UUID URLs to key-based URLs
  if (UUID_RE.test(boardSlug!)) {
    const keySlug = board.key || generateBoardKey(board.title);
    navigate(`/boards/${keySlug}${cardNumberParam ? `/${cardNumberParam}` : ''}`, { replace: true });
    return null;
  }

  const boardStyle: React.CSSProperties = board.backgroundImage
    ? { backgroundImage: `url('${board.backgroundImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: GRADIENT_STYLES[board.gradient as GradientKey] ?? '#475569' };

  const boardPath = `/boards/${board.key || generateBoardKey(board.title)}`;

  const handleCardOpen = (listId: string, cardId: string, cardNumber?: number) => {
    setSelectedCard({ listId, cardId });
    if (cardNumber) navigate(`${boardPath}/${cardNumber}`, { replace: true });
  };

  const handleCardClose = () => {
    setSelectedCard(null);
    navigate(boardPath, { replace: true });
  };

  const handleArchive = async () => {
    if (role !== 'owner') return;
    if (!globalThis.confirm('Archive this board? You can restore it later from data if needed.')) return;
    try {
      await Promise.resolve(deleteBoard(boardId!));
      navigate('/');
    } catch {
      globalThis.alert('Unable to archive this board right now. Please try again.');
    }
  };

  const handleMembersRefresh = () => {
    if (!boardId) return;
    apiFetchBoardMembers(boardId).then(members => setBoardMembers(members as BoardMember[]));
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col page-enter" style={boardStyle}>
      <BoardHeader
        board={board}
        canEdit={canEdit}
        role={role}
        members={boardMembers}
        hasActiveFilters={hasActiveFilters}
        filterOpen={showFilter}
        onFilterToggle={() => setShowFilter(v => !v)}
        onFilterClose={() => setShowFilter(false)}
        onTitleSave={(title) => updateBoard(boardId!, { title })}
        onKeySave={(key) => { updateBoard(boardId!, { key }); navigate(`/boards/${key}`, { replace: true }); }}
        onStar={() => toggleStarBoard(boardId!)}
        onInvite={() => setShowInvite(true)}
        onBackgroundPicker={() => setShowBackgroundPicker(true)}
        onArchive={handleArchive}
        filterKeyword={filters.keyword} setFilterKeyword={setKeyword}
        filterLabels={filters.labels} setFilterLabels={setLabels}
        filterDueDate={filters.dueDate} setFilterDueDate={setDueDate}
        filterStatus={filters.status} setFilterStatus={setStatus}
        filterActivity={filters.activity} setFilterActivity={setActivity}
        allLabels={allLabels}
        clearAllFilters={clearAllFilters}
      />

      <DragDropContext onDragEnd={(result) => handleDragEnd(boardId!, result)}>
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
                        onUpdateListTitle={(listId, title) => updateListTitle(boardId!, listId, title)}
                        onAddCard={(listId, title) => addCard(boardId!, listId, title)}
                        onCardClick={(listId, cardId, cardNumber) => handleCardOpen(listId, cardId, cardNumber)}
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
          ownerId={board.ownerId}
          onClose={() => { setShowInvite(false); handleMembersRefresh(); }}
        />
      )}
    </div>
  );
}
