import { useParams, useNavigate } from 'react-router-dom';
import { useBoards } from '../context/BoardContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanList from '../components/KanbanList';
import AddListForm from '../components/AddListForm';
import CardDetailModal from '../components/CardDetailModal';
import { PromptInputBox } from '../components/ui/ai-prompt-box';
import { ArrowLeft, Star, MoreHorizontal, Trash2, X, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect, useRef } from 'react';
import { streamGeminiResponse } from '../lib/gemini';

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { getBoard, boardsLoading, handleDragEnd, updateBoard, toggleStarBoard, deleteBoard, addList, deleteList, updateListTitle, addCard } = useBoards();
  const board = getBoard(boardId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (board) setTitleValue(board.title);
  }, [board]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleAiSend = async (message) => {
    if (!message.trim() || aiLoading) return;

    const userMsg = { role: 'user', text: message };
    setChatMessages((prev) => [...prev, userMsg]);
    setChatOpen(true);
    setAiLoading(true);

    const aiMsg = { role: 'ai', text: '' };
    setChatMessages((prev) => [...prev, aiMsg]);

    try {
      const history = chatMessages.filter((m) => m.text);
      const stream = await streamGeminiResponse(message, board, history);

      let fullText = '';
      for await (const chunk of stream) {
        const text = chunk.text();
        fullText += text;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', text: fullText };
          return updated;
        });
      }
    } catch (err) {
      setChatMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'ai',
          text: `Sorry, I encountered an error: ${err.message}`,
        };
        return updated;
      });
    } finally {
      setAiLoading(false);
    }
  };

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

      {/* AI Chat Panel + Prompt */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-30 flex flex-col">
        {chatOpen && chatMessages.length > 0 && (
          <div className="mb-3 rounded-2xl border border-[#333] bg-[#1A1B1E]/95 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#333]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-pink-400" />
                <span className="text-xs font-medium text-gray-300">TaskFlow AI</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setChatMessages([]); setChatOpen(false); }}
                  className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded hover:bg-white/5 transition-colors"
                >
                  Clear
                </button>
                <button
                  onClick={() => setChatOpen(false)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
            </div>
            <div className="max-h-[50vh] overflow-y-auto p-4 space-y-4 scroll-smooth">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-pink-500/20 text-gray-100 rounded-br-md'
                        : 'bg-[#2A2B2F] text-gray-200 rounded-bl-md'
                    }`}
                  >
                    {msg.role === 'ai' && !msg.text && aiLoading ? (
                      <div className="flex items-center gap-2 py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-pink-400" />
                        <span className="text-xs text-gray-400">Thinking...</span>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                    )}
                  </div>
                  {msg.role === 'user' && (
                    <div className="w-7 h-7 rounded-full bg-[#2A2B2F] flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {!chatOpen && chatMessages.length > 0 && (
          <button
            onClick={() => setChatOpen(true)}
            className="mb-3 self-center flex items-center gap-2 px-4 py-2 rounded-full bg-[#1A1B1E]/90 border border-[#333] text-xs text-gray-300 hover:bg-[#2A2B2F] transition-colors backdrop-blur-xl shadow-lg"
          >
            <Bot className="w-3.5 h-3.5 text-pink-400" />
            Show chat ({chatMessages.length} messages)
          </button>
        )}

        <PromptInputBox
          placeholder="Ask AI about this board..."
          onSend={(message) => handleAiSend(message)}
          isLoading={aiLoading}
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
