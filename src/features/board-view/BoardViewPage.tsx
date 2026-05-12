import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useBoards } from '@/context/BoardContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanList from './KanbanList';
import AddListForm from './AddListForm';
import CardDetailModal from '@/features/cards/CardDetailModal';
import BoardHeader from './BoardHeader';
import BoardBackgroundModal from './BoardBackgroundModal';
import { Button } from '@/components/ui/button';
import { useState, useEffect, useMemo } from 'react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { GRADIENT_STYLES } from '@/utils/gradients';
import type { GradientKey } from '@/utils/gradients';
import { isPast, isToday, addDays, addWeeks, addMonths, isWithinInterval, subWeeks } from 'date-fns';

interface SelectedCard {
  listId: string;
  cardId: string;
}

export default function BoardView() {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    getBoard, getBoardRole, boardsLoading,
    handleDragEnd, updateBoard, toggleStarBoard,
    addList, deleteList, updateListTitle, addCard, deleteBoard,
  } = useBoards();

  const board = getBoard(boardId!);
  usePageTitle(board?.title);
  const role = getBoardRole(boardId!);
  const canEdit = role === 'owner' || role === 'admin' || role === 'member';

  const [selectedCard, setSelectedCard] = useState<SelectedCard | null>(null);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterLabels, setFilterLabels] = useState<string[]>([]);
  const [filterDueDate, setFilterDueDate] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterActivity, setFilterActivity] = useState<string[]>([]);

  // Open card from ?card=N URL param
  useEffect(() => {
    const cardNum = searchParams.get('card');
    if (!cardNum || !board) return;
    const num = parseInt(cardNum, 10);
    for (const list of board.lists) {
      const card = list.cards.find(c => c.number === num);
      if (card) {
        setSelectedCard({ listId: list.id, cardId: card.id });
        return;
      }
    }
  }, [board?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const allLabels = useMemo(() => {
    if (!board) return [];
    const map = new Map<string, { id: string; text: string; color: string }>();
    board.lists.forEach(l => l.cards.forEach(c => c.labels?.forEach(lb => map.set(lb.id, lb))));
    return [...map.values()];
  }, [board]);

  const hasActiveFilters = !!(filterKeyword || filterLabels.length || filterDueDate.length || filterStatus.length || filterActivity.length);

  const clearAllFilters = () => {
    setFilterKeyword('');
    setFilterLabels([]);
    setFilterDueDate([]);
    setFilterStatus([]);
    setFilterActivity([]);
  };

  const filteredLists = useMemo(() => {
    if (!board || !hasActiveFilters) return board?.lists || [];
    const now = new Date();
    return board.lists.map(list => ({
      ...list,
      cards: list.cards.filter(card => {
        if (filterKeyword) {
          const kw = filterKeyword.toLowerCase();
          const match = card.title?.toLowerCase().includes(kw)
            || card.description?.toLowerCase().includes(kw)
            || card.labels?.some(l => l.text.toLowerCase().includes(kw));
          if (!match) return false;
        }
        if (filterLabels.length) {
          const ids = (card.labels || []).map(l => l.id);
          const pass = (filterLabels.includes('__none__') && ids.length === 0)
            || filterLabels.some(id => id !== '__none__' && ids.includes(id));
          if (!pass) return false;
        }
        if (filterDueDate.length) {
          const due = card.dueDate ? new Date(card.dueDate) : null;
          const pass = filterDueDate.some(f => {
            if (f === 'none') return !due;
            if (!due) return false;
            if (f === 'overdue') return isPast(due) && !isToday(due);
            if (f === 'nextDay') return isWithinInterval(due, { start: now, end: addDays(now, 1) });
            if (f === 'nextWeek') return isWithinInterval(due, { start: now, end: addWeeks(now, 1) });
            if (f === 'nextMonth') return isWithinInterval(due, { start: now, end: addMonths(now, 1) });
            return true;
          });
          if (!pass) return false;
        }
        if (filterStatus.length) {
          const cl = card.checklist || [];
          const allDone = cl.length > 0 && cl.every(i => i.completed);
          const pass = filterStatus.some(f => (f === 'complete' ? allDone : !allDone));
          if (!pass) return false;
        }
        if (filterActivity.length) {
          const last = (card.comments || []).reduce((latest, c) => {
            const d = new Date(c.createdAt);
            return d > latest ? d : latest;
          }, new Date(0));
          const pass = filterActivity.some(f => {
            if (f === '1week') return last > subWeeks(now, 1);
            if (f === '2weeks') return last > subWeeks(now, 2);
            if (f === '4weeks') return last > subWeeks(now, 4);
            if (f === 'noActivity') return last.getTime() === 0;
            return true;
          });
          if (!pass) return false;
        }
        return true;
      }),
    }));
  }, [board, filterKeyword, filterLabels, filterDueDate, filterStatus, filterActivity, hasActiveFilters]);

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

  const boardStyle: React.CSSProperties = board.backgroundImage
    ? { backgroundImage: `url('${board.backgroundImage}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { backgroundColor: GRADIENT_STYLES[board.gradient as GradientKey] ?? '#475569' };

  const handleCardOpen = (listId: string, cardId: string, cardNumber?: number) => {
    setSelectedCard({ listId, cardId });
    if (cardNumber) setSearchParams({ card: String(cardNumber) }, { replace: true });
  };

  const handleCardClose = () => {
    setSelectedCard(null);
    setSearchParams({}, { replace: true });
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

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col page-enter" style={boardStyle}>
      <BoardHeader
        board={board}
        canEdit={canEdit}
        role={role}
        hasActiveFilters={hasActiveFilters}
        filterOpen={showFilter}
        onFilterToggle={() => setShowFilter(v => !v)}
        onFilterClose={() => setShowFilter(false)}
        onTitleSave={(title) => updateBoard(boardId!, { title })}
        onStar={() => toggleStarBoard(boardId!)}
        onBackgroundPicker={() => setShowBackgroundPicker(true)}
        onArchive={handleArchive}
        filterKeyword={filterKeyword} setFilterKeyword={setFilterKeyword}
        filterLabels={filterLabels} setFilterLabels={setFilterLabels}
        filterDueDate={filterDueDate} setFilterDueDate={setFilterDueDate}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterActivity={filterActivity} setFilterActivity={setFilterActivity}
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
    </div>
  );
}
