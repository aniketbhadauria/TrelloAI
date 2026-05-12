import { useState, useRef } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import type { List } from '@/types/board';
import type { DraggableProvidedDragHandleProps } from '@hello-pangea/dnd';
import KanbanCard from './KanbanCard';
import AddCardForm from './AddCardForm';

interface KanbanListProps {
  list: List;
  boardKey?: string;
  onDeleteList: (listId: string) => void;
  onUpdateListTitle: (listId: string, title: string) => void;
  onAddCard: (listId: string, title: string) => void;
  onCardClick: (listId: string, cardId: string, cardNumber?: number) => void;
  dragHandleProps: DraggableProvidedDragHandleProps | null;
}

export default function KanbanList({ list, boardKey, onDeleteList, onUpdateListTitle, onAddCard, onCardClick, dragHandleProps }: KanbanListProps) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue !== list.title) {
      onUpdateListTitle(list.id, titleValue.trim());
    } else {
      setTitleValue(list.title);
    }
    setEditingTitle(false);
  };

  return (
    <div className="kanban-list">
      <div className="flex items-center justify-between px-3 pt-3 pb-2" {...(dragHandleProps ?? {})}>
        {editingTitle ? (
          <input
            ref={inputRef}
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') { setTitleValue(list.title); setEditingTitle(false); }
            }}
            className="flex-1 text-sm font-semibold bg-white/10 text-white px-2 py-1 rounded border border-white/20 outline-none"
            autoFocus
          />
        ) : (
          <h3
            className="flex-1 text-sm font-semibold text-white cursor-pointer hover:bg-white/10 px-2 py-1 rounded transition-colors truncate"
            onClick={() => setEditingTitle(true)}
          >
            {list.title}
            <span className="ml-2 text-xs text-white/50 font-normal">{list.cards.length}</span>
          </h3>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-white/10 transition-colors text-white/50 hover:text-white"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
              <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg p-1 z-40 min-w-[140px] animate-slide-down">
                <button
                  onClick={() => { onDeleteList(list.id); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete list
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Droppable droppableId={list.id} type="card">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`kanban-list-cards space-y-2 ${snapshot.isDraggingOver ? 'bg-white/5 rounded-lg' : ''}`}
          >
            {list.cards.map((card, cardIndex) => (
              <Draggable key={card.id} draggableId={card.id} index={cardIndex}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                  >
                    <KanbanCard
                      card={card}
                      boardKey={boardKey}
                      isDragging={snapshot.isDragging}
                      onClick={() => onCardClick(list.id, card.id, card.number)}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>

      <div className="px-1 pb-2">
        <AddCardForm onAdd={(title) => onAddCard(list.id, title)} />
      </div>
    </div>
  );
}
