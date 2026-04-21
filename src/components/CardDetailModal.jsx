import { useState, useMemo, useRef, useEffect } from 'react';
import { X, Calendar, Tag, Trash2, AlignLeft, CheckSquare, Users, MessageSquare, Plus, Send, Circle, Paperclip, Settings2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Badge } from './ui/badge';
import { useBoards } from '../context/BoardContext';
import { useAuth } from '../context/AuthContext';
import { sendNotification } from '../context/NotificationContext';
import { LABEL_COLORS } from '../data/initialData';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

const MEMBER_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
];
const RECENT_MEMBER_NAMES_KEY = 'recent_member_names';

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getMemberColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

export default function CardDetailModal({ boardId, listId, cardId, onClose }) {
  const { getBoard, updateCard, deleteCard, boards } = useBoards();
  const { user } = useAuth();
  const board = getBoard(boardId);
  const list = board?.lists.find(l => l.id === listId);
  const card = list?.cards.find(c => c.id === cardId);

  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [selectedLabelColor, setSelectedLabelColor] = useState(LABEL_COLORS[0].value);
  const [dueDate, setDueDate] = useState(card?.dueDate ? format(new Date(card.dueDate), 'yyyy-MM-dd') : '');
  const [newCheckItem, setNewCheckItem] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newComment, setNewComment] = useState('');
  const [activeSection, setActiveSection] = useState(null);
  const [showDetails, setShowDetails] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionIndex, setSuggestionIndex] = useState(-1);
  const suggestionsRef = useRef(null);
  const attachmentBtnRef = useRef(null);
  const [recentMemberNames, setRecentMemberNames] = useState([]);
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentText, setAttachmentText] = useState('');
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [attachmentPopupPos, setAttachmentPopupPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(RECENT_MEMBER_NAMES_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        setRecentMemberNames(parsed.filter(Boolean));
      }
    } catch {
      // Ignore malformed local storage data
    }
  }, []);

  // Collect all unique member names across every board
  const allBoardMembers = useMemo(() => {
    const nameSet = new Set();
    for (const b of boards) {
      for (const l of b.lists || []) {
        for (const c of l.cards || []) {
          for (const m of c.members || []) {
            if (m.name) nameSet.add(m.name);
          }
        }
      }
    }
    return [...nameSet].sort((a, b) => a.localeCompare(b));
  }, [boards]);

  const checklist = card?.checklist || [];
  const members = card?.members || [];
  const comments = card?.comments || [];
  const attachments = card?.attachments || [];
  const completedCount = checklist.filter(i => i.completed).length;
  const checklistProgress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  // Filtered suggestions: matching typed text, excluding already-assigned
  const assignedNames = new Set(members.map(m => m.name.toLowerCase()));
  const candidateMemberNames = useMemo(() => {
    const set = new Set(allBoardMembers);
    for (const name of recentMemberNames) set.add(name);
    if (user?.email) set.add(user.email);
    return [...set];
  }, [allBoardMembers, recentMemberNames, user?.email]);

  const filteredSuggestions = newMemberName.trim().length > 0
    ? candidateMemberNames
        .filter(name =>
          name.toLowerCase().includes(newMemberName.trim().toLowerCase()) &&
          !assignedNames.has(name.toLowerCase())
        )
        .sort((a, b) => {
          const q = newMemberName.trim().toLowerCase();
          const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
          const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
          if (aStarts !== bStarts) return aStarts - bStarts;
          return a.localeCompare(b);
        })
        .slice(0, 8)
    : [];

  const toggleSection = (section) => setActiveSection(prev => prev === section ? null : section);

  const handleTitleBlur = () => {
    if (title.trim() && title !== card.title) {
      updateCard(boardId, listId, cardId, { title: title.trim() });
    }
  };

  const handleDescSave = () => {
    updateCard(boardId, listId, cardId, { description });
    setEditingDesc(false);
  };

  const handleAddLabel = () => {
    if (!newLabelText.trim()) return;
    const newLabel = { id: uuidv4(), text: newLabelText.trim(), color: selectedLabelColor };
    updateCard(boardId, listId, cardId, { labels: [...card.labels, newLabel] });
    setNewLabelText('');
    setActiveSection(null);
  };

  const handleRemoveLabel = (labelId) => {
    updateCard(boardId, listId, cardId, { labels: card.labels.filter(l => l.id !== labelId) });
  };

  const handleDueDateChange = (e) => {
    const val = e.target.value;
    setDueDate(val);
    updateCard(boardId, listId, cardId, { dueDate: val ? new Date(val).toISOString() : null });
  };

  const handleAddCheckItem = () => {
    if (!newCheckItem.trim()) return;
    const item = { id: uuidv4(), text: newCheckItem.trim(), completed: false };
    updateCard(boardId, listId, cardId, { checklist: [...checklist, item] });
    setNewCheckItem('');
  };

  const handleToggleCheckItem = (itemId) => {
    const updated = checklist.map(i => i.id === itemId ? { ...i, completed: !i.completed } : i);
    updateCard(boardId, listId, cardId, { checklist: updated });
  };

  const handleDeleteCheckItem = (itemId) => {
    updateCard(boardId, listId, cardId, { checklist: checklist.filter(i => i.id !== itemId) });
  };

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const memberName = newMemberName.trim();
    const exists = members.some(m => m.name.toLowerCase() === memberName.toLowerCase());
    if (exists) { setNewMemberName(''); setActiveSection(null); return; }
    const member = { id: uuidv4(), name: memberName };
    updateCard(boardId, listId, cardId, { members: [...members, member] });
    setNewMemberName('');
    setShowSuggestions(false);
    setSuggestionIndex(-1);

    setRecentMemberNames(prev => {
      const deduped = [memberName, ...prev.filter(n => n.toLowerCase() !== memberName.toLowerCase())].slice(0, 20);
      localStorage.setItem(RECENT_MEMBER_NAMES_KEY, JSON.stringify(deduped));
      return deduped;
    });

    // Send notification if the member name looks like an email
    const emailToNotify = memberName.includes('@') ? memberName : null;
    if (emailToNotify && emailToNotify !== user?.email) {
      sendNotification({
        userEmail: emailToNotify,
        title: `You were assigned to "${card.title}"`,
        body: `${user?.email || 'Someone'} added you to a card in ${board?.title || 'a board'}`,
        boardId,
        cardId,
      });
    }
  };

  const handleRemoveMember = (memberId) => {
    updateCard(boardId, listId, cardId, { members: members.filter(m => m.id !== memberId) });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: uuidv4(),
      text: newComment.trim(),
      author: user?.email || 'Anonymous',
      createdAt: new Date().toISOString(),
    };
    updateCard(boardId, listId, cardId, { comments: [...comments, comment] });
    setNewComment('');
  };

  const handleDeleteComment = (commentId) => {
    updateCard(boardId, listId, cardId, { comments: comments.filter(c => c.id !== commentId) });
  };

  const handleAddAttachment = () => {
    const url = attachmentUrl.trim();
    const fileName = attachmentFileName.trim();
    const displayText = attachmentText.trim();
    if (!url && !fileName) return;

    const attachment = {
      id: uuidv4(),
      url: url || null,
      fileName: fileName || null,
      text: displayText || fileName || url,
      createdAt: new Date().toISOString(),
    };

    updateCard(boardId, listId, cardId, { attachments: [...attachments, attachment] });
    setAttachmentUrl('');
    setAttachmentText('');
    setAttachmentFileName('');
    setActiveSection(null);
  };

  const handleRemoveAttachment = (attachmentId) => {
    updateCard(boardId, listId, cardId, {
      attachments: attachments.filter((attachment) => attachment.id !== attachmentId),
    });
  };

  const updateAttachmentPopupPosition = () => {
    if (!attachmentBtnRef.current) return;
    const rect = attachmentBtnRef.current.getBoundingClientRect();
    setAttachmentPopupPos({
      top: rect.bottom + 8,
      left: rect.left,
    });
  };

  const toggleAttachmentPopup = () => {
    if (activeSection === 'attachment') {
      setActiveSection(null);
      return;
    }
    updateAttachmentPopupPosition();
    setActiveSection('attachment');
  };

  useEffect(() => {
    if (activeSection !== 'attachment') return;
    const handleReposition = () => updateAttachmentPopupPosition();
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);
    return () => {
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [activeSection]);

  const handleDelete = () => {
    deleteCard(boardId, listId, cardId);
    onClose();
  };

  const actionBtnClass = (section) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
      activeSection === section
        ? 'bg-primary/15 border-primary/40 text-primary'
        : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
    }`;

  if (!card) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content bg-card border border-border rounded-2xl w-full mx-4 shadow-2xl max-h-[85vh] flex flex-col transition-[max-width] duration-300 ease-in-out ${showDetails ? 'max-w-4xl' : 'max-w-2xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border/30 shrink-0">
          <div className="flex-1 mr-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              className="w-full text-lg font-semibold bg-transparent border-none outline-none focus:bg-secondary/30 rounded px-1 py-0.5 -ml-1 transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
              in list <span className="font-medium text-foreground/80">{list?.title}</span>
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2" onClick={handleDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Column */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Activity heading */}
            <div className="flex items-center gap-2.5 mb-4">
              <Circle className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-base font-semibold">Activity</h3>
            </div>

            {/* Quick action bar */}
            <div className="flex flex-wrap gap-2 mb-5">
              <div className="relative">
                <button className={actionBtnClass(showAddMenu ? '_addmenu' : null)} onClick={() => setShowAddMenu(v => !v)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
                {showAddMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border/60 rounded-xl shadow-xl z-50 py-2 animate-slide-down">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 mb-1">
                        <span className="text-sm font-semibold">Add to card</span>
                        <button onClick={() => setShowAddMenu(false)} className="p-0.5 rounded hover:bg-secondary transition-colors">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      {[
                        { id: 'labels', icon: Tag, title: 'Labels', desc: 'Organize, categorize, and prioritize' },
                        { id: 'dates', icon: Calendar, title: 'Dates', desc: 'Start dates, due dates, and reminders' },
                        { id: 'checklist', icon: CheckSquare, title: 'Checklist', desc: 'Add subtasks' },
                        { id: 'members', icon: Users, title: 'Members', desc: 'Assign members' },
                        { id: 'attachment', icon: Paperclip, title: 'Attachment', desc: 'Add links, pages, work items, and more' },
                        { id: 'customfields', icon: Settings2, title: 'Custom Fields', desc: 'Create your own fields' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            if (['labels', 'dates', 'checklist', 'members', 'attachment'].includes(item.id)) {
                              setActiveSection(item.id);
                            }
                            setShowAddMenu(false);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
                        >
                          <item.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-sm font-medium">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground leading-tight">{item.desc}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <button className={actionBtnClass('labels')} onClick={() => toggleSection('labels')}>
                <Tag className="w-3.5 h-3.5" />
                Labels
                {card.labels.length > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">{card.labels.length}</span>
                )}
              </button>
              <button className={actionBtnClass('dates')} onClick={() => toggleSection('dates')}>
                <Calendar className="w-3.5 h-3.5" />
                Dates
              </button>
              <button className={actionBtnClass('checklist')} onClick={() => toggleSection('checklist')}>
                <CheckSquare className="w-3.5 h-3.5" />
                Checklist
                {checklist.length > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">{completedCount}/{checklist.length}</span>
                )}
              </button>
              <div className="relative">
                <button ref={attachmentBtnRef} className={actionBtnClass('attachment')} onClick={toggleAttachmentPopup}>
                  <Paperclip className="w-3.5 h-3.5" />
                  Attachment
                  {attachments.length > 0 && (
                    <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">{attachments.length}</span>
                  )}
                </button>
                {activeSection === 'attachment' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveSection(null)} />
                    <div
                      className="fixed w-[420px] max-w-[calc(100vw-3rem)] bg-card border border-border/60 rounded-2xl p-4 shadow-2xl z-50 animate-slide-down"
                      style={{ top: attachmentPopupPos.top, left: attachmentPopupPos.left }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold">Attach</h4>
                        <button onClick={() => setActiveSection(null)} className="p-1 rounded hover:bg-secondary transition-colors">
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">Attach a file from your computer</p>
                          <p className="text-xs text-muted-foreground mb-2">You can also drag and drop files to upload them.</p>
                          <label className="block">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setAttachmentFileName(file.name);
                                if (!attachmentText.trim()) setAttachmentText(file.name);
                              }}
                            />
                            <span className="h-9 rounded-md bg-secondary/70 hover:bg-secondary cursor-pointer flex items-center justify-center text-sm font-medium transition-colors">
                              Choose a file
                            </span>
                          </label>
                          {attachmentFileName && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">{attachmentFileName}</p>
                          )}
                        </div>

                        <div className="border-t border-border/40 pt-3 space-y-2">
                          <div className="text-sm font-medium">Search or paste a link *</div>
                          <Input
                            value={attachmentUrl}
                            onChange={(e) => setAttachmentUrl(e.target.value)}
                            placeholder="Find recent links or paste a new link"
                            className="h-9 text-sm bg-background/60"
                          />
                          <div className="text-sm font-medium">Display text (optional)</div>
                          <Input
                            value={attachmentText}
                            onChange={(e) => setAttachmentText(e.target.value)}
                            placeholder="Text to display"
                            className="h-9 text-sm bg-background/60"
                          />
                          <p className="text-xs text-muted-foreground">Give this link a title or description</p>
                          <Button
                            size="sm"
                            onClick={handleAddAttachment}
                            disabled={!attachmentUrl.trim() && !attachmentFileName.trim()}
                          >
                            Add attachment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <button className={actionBtnClass('members')} onClick={() => toggleSection('members')}>
                <Users className="w-3.5 h-3.5" />
                Members
                {members.length > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">{members.length}</span>
                )}
              </button>
            </div>

            {/* Expanded section: Labels */}
            {activeSection === 'labels' && (
              <div className="mb-5 bg-secondary/30 rounded-xl p-4 border border-border/30 animate-slide-down">
                {card.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {card.labels.map((label) => (
                      <Badge
                        key={label.id}
                        className="cursor-pointer hover:opacity-80 transition-opacity text-white border-none"
                        style={{ backgroundColor: label.color }}
                        onClick={() => handleRemoveLabel(label.id)}
                      >
                        {label.text} ×
                      </Badge>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  <Input
                    value={newLabelText}
                    onChange={(e) => setNewLabelText(e.target.value)}
                    placeholder="Label text..."
                    className="bg-background/50 text-sm h-8"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                  />
                  <div className="flex gap-1.5">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setSelectedLabelColor(c.value)}
                        className={`w-6 h-6 rounded-full transition-all ${selectedLabelColor === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-card scale-110' : ''}`}
                        style={{ backgroundColor: c.value }}
                        title={c.name}
                      />
                    ))}
                  </div>
                  <Button size="sm" onClick={handleAddLabel} disabled={!newLabelText.trim()}>Add label</Button>
                </div>
              </div>
            )}

            {/* Expanded section: Dates */}
            {activeSection === 'dates' && (
              <div className="mb-5 bg-secondary/30 rounded-xl p-4 border border-border/30 animate-slide-down">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Due Date</span>
                </div>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={handleDueDateChange}
                  className="bg-background/50 text-sm w-auto"
                  autoFocus
                />
              </div>
            )}

            {/* Expanded section: Checklist */}
            {activeSection === 'checklist' && (
              <div className="mb-5 bg-secondary/30 rounded-xl p-4 border border-border/30 animate-slide-down">
                {checklist.length > 0 && (
                  <div className="mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex-1 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${checklistProgress}%`,
                            backgroundColor: checklistProgress === 100 ? '#10b981' : '#ec4899',
                          }}
                        />
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
                        {checklistProgress}%
                      </span>
                    </div>
                    <div className="space-y-1 mb-2">
                      {checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 group rounded-lg px-2 py-1.5 hover:bg-secondary/30 transition-colors">
                          <button
                            onClick={() => handleToggleCheckItem(item.id)}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                              item.completed
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-border hover:border-pink-400'
                            }`}
                          >
                            {item.completed && (
                              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                            {item.text}
                          </span>
                          <button
                            onClick={() => handleDeleteCheckItem(item.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Input
                    value={newCheckItem}
                    onChange={(e) => setNewCheckItem(e.target.value)}
                    placeholder="Add an item..."
                    className="h-8 text-sm bg-background/50 flex-1"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCheckItem()}
                  />
                  <Button size="sm" className="h-8 px-3" onClick={handleAddCheckItem} disabled={!newCheckItem.trim()}>
                    <Plus className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Expanded section: Members */}
            {activeSection === 'members' && (
              <div className="mb-5 bg-secondary/30 rounded-xl p-4 border border-border/30 animate-slide-down">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {members.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleRemoveMember(member.id)}
                      className="group relative flex items-center gap-1.5 rounded-full bg-secondary/50 pl-1 pr-2.5 py-1 text-xs font-medium hover:bg-destructive/10 hover:text-destructive transition-colors"
                      title={`Remove ${member.name}`}
                    >
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: getMemberColor(member.name) }}
                      >
                        {getInitials(member.name)}
                      </div>
                      <span>{member.name}</span>
                      <X className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5" />
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <div className="flex items-center gap-2">
                    <Input
                      value={newMemberName}
                      onChange={(e) => {
                        setNewMemberName(e.target.value);
                        setShowSuggestions(true);
                        setSuggestionIndex(-1);
                      }}
                      placeholder="Add a member by name..."
                      className="h-8 text-sm bg-background/50 flex-1"
                      autoFocus
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                      onKeyDown={(e) => {
                        if (showSuggestions && filteredSuggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setSuggestionIndex(prev => Math.min(prev + 1, filteredSuggestions.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setSuggestionIndex(prev => Math.max(prev - 1, 0));
                          } else if (e.key === 'Enter' && suggestionIndex >= 0) {
                            e.preventDefault();
                            setNewMemberName(filteredSuggestions[suggestionIndex]);
                            setShowSuggestions(false);
                            setSuggestionIndex(-1);
                            return;
                          }
                        }
                        if (e.key === 'Enter') handleAddMember();
                        if (e.key === 'Escape') {
                          if (showSuggestions) { setShowSuggestions(false); }
                          else { setActiveSection(null); }
                        }
                      }}
                    />
                    <Button size="sm" className="h-8 px-3" onClick={handleAddMember} disabled={!newMemberName.trim()}>
                      Add
                    </Button>
                  </div>

                  {/* Autosuggest dropdown */}
                  {showSuggestions && filteredSuggestions.length > 0 && (
                    <div
                      ref={suggestionsRef}
                      className="absolute left-0 right-12 top-full mt-1 z-50 bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-xl overflow-hidden animate-slide-down"
                    >
                      <div className="py-1 max-h-40 overflow-y-auto">
                        {filteredSuggestions.map((name, i) => (
                          <button
                            key={name}
                            onMouseDown={(e) => { e.preventDefault(); }}
                            onClick={() => {
                              setNewMemberName(name);
                              setShowSuggestions(false);
                              setSuggestionIndex(-1);
                            }}
                            className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors ${
                              i === suggestionIndex
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-secondary/50 text-foreground'
                            }`}
                          >
                            <div
                              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                              style={{ backgroundColor: getMemberColor(name) }}
                            >
                              {getInitials(name)}
                            </div>
                            <span className="truncate">{name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Inline chips: show labels, due date, members when sections are collapsed */}
            {activeSection !== 'labels' && card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {card.labels.map((label) => (
                  <Badge
                    key={label.id}
                    className="text-white border-none text-[11px]"
                    style={{ backgroundColor: label.color }}
                  >
                    {label.text}
                  </Badge>
                ))}
              </div>
            )}
            {activeSection !== 'dates' && dueDate && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                <Calendar className="w-3.5 h-3.5" />
                <span>Due {format(new Date(dueDate), 'MMM d, yyyy')}</span>
              </div>
            )}
            {activeSection !== 'members' && members.length > 0 && (
              <div className="flex items-center -space-x-1.5 mb-4">
                {members.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-card"
                    style={{ backgroundColor: getMemberColor(m.name) }}
                    title={m.name}
                  >
                    {getInitials(m.name)}
                  </div>
                ))}
                {members.length > 5 && (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[10px] font-medium text-muted-foreground ring-2 ring-card">
                    +{members.length - 5}
                  </div>
                )}
              </div>
            )}
            {activeSection !== 'attachment' && attachments.length > 0 && (
              <div className="mb-4 space-y-1.5">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center gap-2 text-xs rounded-lg bg-secondary/30 px-2 py-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    {attachment.url ? (
                      <a href={attachment.url} target="_blank" rel="noreferrer" className="truncate text-primary hover:underline">
                        {attachment.text || attachment.url}
                      </a>
                    ) : (
                      <span className="truncate">{attachment.text || attachment.fileName}</span>
                    )}
                    <button
                      onClick={() => handleRemoveAttachment(attachment.id)}
                      className="ml-auto text-muted-foreground hover:text-destructive transition-colors"
                      title="Remove attachment"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Description */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <AlignLeft className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Description</span>
              </div>
              {editingDesc ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Add a more detailed description..."
                    rows={8}
                    autoFocus
                    className="bg-white text-foreground text-sm border-border/40 rounded-xl leading-relaxed"
                    style={{ whiteSpace: 'pre-wrap', tabSize: 2 }}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleDescSave}>Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setDescription(card.description); setEditingDesc(false); }}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setEditingDesc(true)}
                  className="w-full text-left min-h-[80px] rounded-xl p-4 text-sm cursor-pointer transition-colors bg-white hover:bg-gray-50 border border-border/40"
                >
                  {card.description ? (
                    <DescriptionRenderer text={card.description} />
                  ) : (
                    <span className="text-gray-500">Add a more detailed description...</span>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Comments & Activity */}
          {showDetails && (
            <div className="w-[320px] border-l border-border/30 flex flex-col shrink-0 overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  Comments and activity
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md bg-secondary/40 hover:bg-secondary/60 transition-colors"
                >
                  Hide
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 pb-4">
                {/* Comment input */}
                <div className="flex items-start gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: getMemberColor(user?.email || 'U') }}
                  >
                    {getInitials(user?.email?.split('@')[0] || 'U')}
                  </div>
                  <div className="flex-1 flex gap-1.5">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="h-9 text-sm bg-secondary/30 flex-1"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                    />
                    <Button
                      size="sm"
                      className="h-9 px-2.5"
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                    >
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Activity feed */}
                <div className="space-y-3">
                  {[...comments].reverse().map((comment) => (
                    <div key={comment.id} className="flex items-start gap-2 group">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5"
                        style={{ backgroundColor: getMemberColor(comment.author) }}
                      >
                        {getInitials(comment.author)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <span className="text-xs font-semibold">{comment.author}</span>
                            <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap wrap-break-word">
                              {comment.text}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {formatCommentTime(comment.createdAt)}
                        </span>
                      </div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-4">No comments yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

function formatCommentTime(dateStr) {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function DescriptionRenderer({ text }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements = [];
  let currentBullets = [];
  let key = 0;

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={`ul-${key++}`} className="list-disc list-inside space-y-0.5 my-1.5 text-foreground">
          {currentBullets.map((b, i) => (
            <li key={i} className="leading-relaxed">{b}</li>
          ))}
        </ul>
      );
      currentBullets = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^\s*[•\-*]\s+(.*)/);

    if (bulletMatch) {
      currentBullets.push(bulletMatch[1]);
    } else {
      flushBullets();
      if (line.trim() === '') {
        elements.push(<div key={`br-${key++}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${key++}`} className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {line}
          </p>
        );
      }
    }
  }
  flushBullets();

  return <div className="space-y-0.5">{elements}</div>;
}
