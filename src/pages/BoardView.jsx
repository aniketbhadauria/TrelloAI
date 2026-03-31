import { useParams, useNavigate } from 'react-router-dom';
import { useBoards } from '../context/BoardContext';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import KanbanList from '../components/KanbanList';
import AddListForm from '../components/AddListForm';
import CardDetailModal from '../components/CardDetailModal';
import { PromptInputBox } from '../components/ui/ai-prompt-box';
import { ArrowLeft, Star, MoreHorizontal, Trash2, X, Bot, User, Filter, Search, Calendar, Tag, Users, CheckSquare, Clock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect, useRef, useMemo } from 'react';
import { isPast, isToday, addDays, addWeeks, addMonths, isWithinInterval, subWeeks } from 'date-fns';
import { streamChat } from '../lib/composio';
import { Loader2 } from 'lucide-react';

export default function BoardView() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { getBoard, boardsLoading, handleDragEnd, updateBoard, toggleStarBoard, deleteBoard, addList, deleteList, updateListTitle, addCard, refreshBoards } = useBoards();
  const board = getBoard(boardId);

  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState('');
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  const [showFilter, setShowFilter] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState('');
  const [filterMembers, setFilterMembers] = useState([]);
  const [filterLabels, setFilterLabels] = useState([]);
  const [filterDueDate, setFilterDueDate] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterActivity, setFilterActivity] = useState([]);

  useEffect(() => {
    if (board) setTitleValue(board.title);
  }, [board]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleChatSend = async (message) => {
    if (!message.trim() || aiLoading) return;

    setChatMessages((prev) => [...prev, { role: 'user', text: message }]);
    setChatOpen(true);
    setAiLoading(true);

    setChatMessages((prev) => [...prev, { role: 'ai', text: '' }]);

    const history = chatMessages.filter((m) => m.text);
    let fullText = '';

    await streamChat(
      message,
      board,
      history,
      (chunk) => {
        fullText += chunk;
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', text: fullText };
          return updated;
        });
      },
      () => {
        setAiLoading(false);
        refreshBoards();
      },
      (err) => {
        setChatMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'ai', text: `Error: ${err}` };
          return updated;
        });
        setAiLoading(false);
      }
    );
  };

  const allLabels = useMemo(() => {
    if (!board) return [];
    const map = new Map();
    board.lists.forEach(l => l.cards.forEach(c => c.labels?.forEach(lb => map.set(lb.id, lb))));
    return [...map.values()];
  }, [board]);

  const allMembers = useMemo(() => {
    if (!board) return [];
    const map = new Map();
    board.lists.forEach(l => l.cards.forEach(c => (c.members || []).forEach(m => map.set(m.id, m))));
    return [...map.values()];
  }, [board]);

  const hasActiveFilters = filterKeyword || filterMembers.length || filterLabels.length || filterDueDate.length || filterStatus.length || filterActivity.length;

  const toggleFilter = (arr, setArr, val) =>
    setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  const clearAllFilters = () => {
    setFilterKeyword('');
    setFilterMembers([]);
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
          const inTitle = card.title?.toLowerCase().includes(kw);
          const inDesc = card.description?.toLowerCase().includes(kw);
          const inLabels = card.labels?.some(l => l.text.toLowerCase().includes(kw));
          const inMembers = (card.members || []).some(m => m.name.toLowerCase().includes(kw));
          if (!inTitle && !inDesc && !inLabels && !inMembers) return false;
        }
        if (filterMembers.length) {
          const cardMemberIds = (card.members || []).map(m => m.id);
          if (filterMembers.includes('__none__') && cardMemberIds.length === 0) { /* pass */ }
          else if (filterMembers.some(id => id !== '__none__' && cardMemberIds.includes(id))) { /* pass */ }
          else return false;
        }
        if (filterLabels.length) {
          const cardLabelIds = (card.labels || []).map(l => l.id);
          if (filterLabels.includes('__none__') && cardLabelIds.length === 0) { /* pass */ }
          else if (filterLabels.some(id => id !== '__none__' && cardLabelIds.includes(id))) { /* pass */ }
          else return false;
        }
        if (filterDueDate.length) {
          const due = card.dueDate ? new Date(card.dueDate) : null;
          const match = filterDueDate.some(f => {
            if (f === 'none') return !due;
            if (!due) return false;
            if (f === 'overdue') return isPast(due) && !isToday(due);
            if (f === 'nextDay') return isWithinInterval(due, { start: now, end: addDays(now, 1) });
            if (f === 'nextWeek') return isWithinInterval(due, { start: now, end: addWeeks(now, 1) });
            if (f === 'nextMonth') return isWithinInterval(due, { start: now, end: addMonths(now, 1) });
            return true;
          });
          if (!match) return false;
        }
        if (filterStatus.length) {
          const cl = card.checklist || [];
          const allDone = cl.length > 0 && cl.every(i => i.completed);
          const match = filterStatus.some(f => {
            if (f === 'complete') return allDone;
            if (f === 'incomplete') return !allDone;
            return true;
          });
          if (!match) return false;
        }
        if (filterActivity.length) {
          const lastComment = (card.comments || []).reduce((latest, c) => {
            const d = new Date(c.createdAt);
            return d > latest ? d : latest;
          }, new Date(0));
          const match = filterActivity.some(f => {
            if (f === '1week') return lastComment > subWeeks(now, 1);
            if (f === '2weeks') return lastComment > subWeeks(now, 2);
            if (f === '4weeks') return lastComment > subWeeks(now, 4);
            if (f === 'noActivity') return lastComment.getTime() === 0;
            return true;
          });
          if (!match) return false;
        }
        return true;
      }),
    }));
  }, [board, filterKeyword, filterMembers, filterLabels, filterDueDate, filterStatus, filterActivity, hasActiveFilters]);

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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilter(v => !v)}
            className={`gap-1.5 ${hasActiveFilters ? 'text-primary' : ''}`}
          >
            <Filter className="w-4 h-4" />
            Filter
            {hasActiveFilters ? (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                !
              </span>
            ) : null}
          </Button>
          {showFilter && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setShowFilter(false)} />
              <div className="absolute top-full right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-2xl z-40 max-h-[70vh] overflow-y-auto animate-slide-down">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 sticky top-0 bg-card z-10 rounded-t-xl">
                  <span className="text-sm font-semibold">Filter</span>
                  <button onClick={() => setShowFilter(false)} className="p-1 rounded-lg hover:bg-secondary transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                <div className="p-4 space-y-5">
                  {/* Keyword */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Keyword</label>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input
                        value={filterKeyword}
                        onChange={(e) => setFilterKeyword(e.target.value)}
                        placeholder="Enter a keyword..."
                        className="w-full h-8 pl-8 pr-3 text-sm bg-secondary/40 border border-border/50 rounded-lg outline-none focus:border-primary/50 transition-colors"
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">Search cards, members, labels, and more.</p>
                  </div>

                  {/* Members */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Members
                    </label>
                    <div className="space-y-1">
                      <FilterCheckbox
                        checked={filterMembers.includes('__none__')}
                        onChange={() => toggleFilter(filterMembers, setFilterMembers, '__none__')}
                        icon={<Users className="w-4 h-4 text-muted-foreground" />}
                        label="No members"
                      />
                      {allMembers.map(m => (
                        <FilterCheckbox
                          key={m.id}
                          checked={filterMembers.includes(m.id)}
                          onChange={() => toggleFilter(filterMembers, setFilterMembers, m.id)}
                          icon={<MemberAvatar name={m.name} />}
                          label={m.name}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Card Status */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <CheckSquare className="w-3.5 h-3.5" />
                      Card status
                    </label>
                    <div className="space-y-1">
                      <FilterCheckbox
                        checked={filterStatus.includes('complete')}
                        onChange={() => toggleFilter(filterStatus, setFilterStatus, 'complete')}
                        icon={<CheckSquare className="w-4 h-4 text-green-400" />}
                        label="Marked as complete"
                      />
                      <FilterCheckbox
                        checked={filterStatus.includes('incomplete')}
                        onChange={() => toggleFilter(filterStatus, setFilterStatus, 'incomplete')}
                        icon={<CheckSquare className="w-4 h-4 text-muted-foreground" />}
                        label="Not marked as complete"
                      />
                    </div>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Due date
                    </label>
                    <div className="space-y-1">
                      {[
                        { id: 'none', icon: <Calendar className="w-4 h-4 text-muted-foreground" />, label: 'No dates' },
                        { id: 'overdue', icon: <Clock className="w-4 h-4 text-red-400" />, label: 'Overdue' },
                        { id: 'nextDay', icon: <Clock className="w-4 h-4 text-yellow-400" />, label: 'Due in the next day' },
                        { id: 'nextWeek', icon: <Clock className="w-4 h-4 text-blue-400" />, label: 'Due in the next week' },
                        { id: 'nextMonth', icon: <Clock className="w-4 h-4 text-cyan-400" />, label: 'Due in the next month' },
                      ].map(item => (
                        <FilterCheckbox
                          key={item.id}
                          checked={filterDueDate.includes(item.id)}
                          onChange={() => toggleFilter(filterDueDate, setFilterDueDate, item.id)}
                          icon={item.icon}
                          label={item.label}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Labels */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5" />
                      Labels
                    </label>
                    <div className="space-y-1">
                      <FilterCheckbox
                        checked={filterLabels.includes('__none__')}
                        onChange={() => toggleFilter(filterLabels, setFilterLabels, '__none__')}
                        icon={<Tag className="w-4 h-4 text-muted-foreground" />}
                        label="No labels"
                      />
                      {allLabels.map(lb => (
                        <FilterCheckbox
                          key={lb.id}
                          checked={filterLabels.includes(lb.id)}
                          onChange={() => toggleFilter(filterLabels, setFilterLabels, lb.id)}
                          icon={
                            <span
                              className="w-full h-6 rounded-md text-white text-xs font-medium flex items-center px-2"
                              style={{ backgroundColor: lb.color }}
                            >
                              {lb.text}
                            </span>
                          }
                          isLabel
                        />
                      ))}
                    </div>
                  </div>

                  {/* Activity */}
                  <div>
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Activity
                    </label>
                    <div className="space-y-1">
                      {[
                        { id: '1week', label: 'Active in the last week' },
                        { id: '2weeks', label: 'Active in the last two weeks' },
                        { id: '4weeks', label: 'Active in the last four weeks' },
                        { id: 'noActivity', label: 'Without activity in the last four weeks' },
                      ].map(item => (
                        <FilterCheckbox
                          key={item.id}
                          checked={filterActivity.includes(item.id)}
                          onChange={() => toggleFilter(filterActivity, setFilterActivity, item.id)}
                          label={item.label}
                        />
                      ))}
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <button
                      onClick={clearAllFilters}
                      className="w-full text-xs text-center py-2 text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

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
              {filteredLists.map((list, index) => (
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
                    <div className="w-7 h-7 rounded-full bg-linear-to-br from-pink-500 to-purple-500 flex items-center justify-center shrink-0 mt-0.5">
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
                      <div className="whitespace-pre-wrap wrap-break-word">{msg.text}</div>
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
          onSend={(message) => handleChatSend(message)}
          isLoading={aiLoading}
          onOpenMindMap={() => navigate('/mindmap')}
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

const MEMBER_COLORS = ['#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#f97316','#ef4444','#ec4899'];

function getMemberColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

function MemberAvatar({ name }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
      style={{ backgroundColor: getMemberColor(name) }}
    >
      {initials}
    </div>
  );
}

function FilterCheckbox({ checked, onChange, icon, label, isLabel }) {
  return (
    <button onClick={onChange} className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors text-left">
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
        checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
      }`}>
        {checked && (
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {isLabel ? (
        <div className="flex-1">{icon}</div>
      ) : (
        <>
          {icon}
          <span className="text-sm">{label}</span>
        </>
      )}
    </button>
  );
}
