import { useParams, useNavigate } from 'react-router-dom';
import { useBoards } from '../context/BoardContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanList from '../components/KanbanList';
import AddListForm from '../components/AddListForm';
import CardDetailModal from '../components/CardDetailModal';
import { PromptInputBox } from '../components/ui/ai-prompt-box';
import { ArrowLeft, Star, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { getBoard, boardsLoading, handleDragEnd, updateBoard, toggleStarBoard, deleteBoard, addList, deleteList, updateListTitle, addCard } = useBoards();
  const board = getBoard(boardId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);

  useEffect(() => {
    if (board) setTitleValue(board.title);
  }, [board]);

  if (boardsLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-56px)]">
        <div className="w-8 h-8 border-3 border-pink-500 border-t-transparent rounded-full animate-spin" />
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

  const onDragEnd = (result) => handleDragEnd(boardId, result);

  const handleTitleSubmit = () => {
    if (titleValue.trim() && titleValue !== board.title) {
      updateBoard(boardId, { title: titleValue.trim() });
    } else {
      setTitleValue(board.title);
    }
    setEditingTitle(false);
  };

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col page-enter">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-background/50 backdrop-blur-sm shrink-0">
        <Button variant="ghost" size="sm" onClick={() => navigate('/boards')} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" />
          Boards
        </Button>
        <div className="w-px h-6 bg-border/50" />

        {editingTitle ? (
          <input
            value={titleValue}
            onChange={(e) => setTitleValue(e.target.value)}
            onBlur={handleTitleSubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTitleSubmit();
              if (e.key === 'Escape') { setTitleValue(board.title); setEditingTitle(false); }
            }}
            className="text-lg font-bold bg-secondary/50 px-2 py-1 rounded-lg border border-primary/30 outline-none"
            autoFocus
          />
        ) : (
          <h1 className="text-lg font-bold cursor-pointer hover:bg-secondary/30 px-2 py-1 rounded-lg transition-colors" onClick={() => setEditingTitle(true)}>
            {board.title}
          </h1>
        )}

        <button onClick={() => toggleStarBoard(boardId)} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
          <Star className={`w-4 h-4 ${board.starred ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
        </button>

        <div className="flex-1" />

        <div className="relative">
          <Button variant="ghost" size="sm" onClick={() => setShowMenu(!showMenu)}>
            <MoreHorizontal className="w-4 h-4" />
          </Button>
          {showMenu && (
            <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl p-1 z-10 min-w-[160px] animate-slide-down">
              <button
                onClick={() => { deleteBoard(boardId); navigate('/boards'); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-md transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete board
              </button>
            </div>
          )}
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="board" direction="horizontal" type="list">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps} className="kanban-board">
              {board.lists.map((list, index) => (
                <Draggable key={list.id} draggableId={list.id} index={index}>
                  {(provided) => (
                    <div ref={provided.innerRef} {...provided.draggableProps}>
                      <KanbanList
                        list={list}
                        index={index}
                        boardId={boardId}
                        dragHandleProps={provided.dragHandleProps}
                        onDeleteList={(listId) => deleteList(boardId, listId)}
                        onUpdateListTitle={(listId, title) => updateListTitle(boardId, listId, title)}
                        onAddCard={(listId, title) => addCard(boardId, listId, title)}
                        onCardClick={(listId, cardId) => setSelectedCard({ listId, cardId })}
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              <AddListForm onAdd={(title) => addList(boardId, title)} />
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* AI Prompt Box */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30">
        <PromptInputBox
          placeholder="Ask AI about this board..."
          onSend={(message, files) => console.log('AI:', message, files)}
        />
      </div>

      {selectedCard && (
        <CardDetailModal
          boardId={boardId}
          listId={selectedCard.listId}
          cardId={selectedCard.cardId}
          onClose={() => setSelectedCard(null)}
        />
      )}
    </div>
  );
}
