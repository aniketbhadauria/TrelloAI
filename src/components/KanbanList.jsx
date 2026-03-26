import { useState, useRef } from 'react';
import { Droppable, Draggable } from '@hello-pangea/dnd';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import KanbanCard from './KanbanCard';
import AddCardForm from './AddCardForm';

export default function KanbanList({ list, index, boardId, onDeleteList, onUpdateListTitle, onAddCard, onCardClick, dragHandleProps }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(list.title);
  const [showMenu, setShowMenu] = useState(false);
  const inputRef = useRef(null);

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
      <div className="flex items-center justify-between px-3 pt-3 pb-2" {...dragHandleProps}>
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
            className="flex-1 text-sm font-semibold bg-secondary/50 px-2 py-1 rounded border border-primary/30 outline-none"
            autoFocus
          />
        ) : (
          <h3
            className="flex-1 text-sm font-semibold cursor-pointer hover:bg-secondary/30 px-2 py-1 rounded transition-colors truncate"
            onClick={() => setEditingTitle(true)}
          >
            {list.title}
            <span className="ml-2 text-xs text-muted-foreground font-normal">{list.cards.length}</span>
          </h3>
        )}

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 rounded hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl p-1 z-10 min-w-[140px] animate-slide-down">
              <button
                onClick={() => { onDeleteList(list.id); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete list
              </button>
            </div>
          )}
        </div>
      </div>

      <Droppable droppableId={list.id} type="card">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`kanban-list-cards space-y-2 ${snapshot.isDraggingOver ? 'bg-primary/5 rounded-lg' : ''}`}
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
                      isDragging={snapshot.isDragging}
                      onClick={() => onCardClick(list.id, card.id)}
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
