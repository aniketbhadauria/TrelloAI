import { useState, useRef, useEffect } from 'react';
import {
  X, Calendar, Tag, Archive, Circle, CheckSquare,
  MessageSquare, Plus, Send, Paperclip, Link2, Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useBoards } from '@/context/BoardContext';
import { useAuth } from '@/context/AuthContext';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import CardDescription from './CardDescription';
import CardLabels from './CardLabels';
import CardChecklist from './CardChecklist';
import CardDueDate from './CardDueDate';
import CardAttachments from './CardAttachments';
import type { Label } from '@/types/board';

const MEMBER_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
];

function getInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
}

function getMemberColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

function formatCommentTime(dateStr: string): string {
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

interface CardDetailModalProps {
  boardId: string;
  listId: string;
  cardId: string;
  onClose: () => void;
}

export default function CardDetailModal({ boardId, listId, cardId, onClose }: CardDetailModalProps) {
  const { getBoard, updateCard, archiveCard } = useBoards();
  const { user } = useAuth();
  const board = getBoard(boardId);
  const list = board?.lists.find((l) => l.id === listId);
  const card = list?.cards.find((c) => c.id === cardId);

  const [title, setTitle] = useState(card?.title ?? '');
  const [dueDate, setDueDate] = useState(
    card?.dueDate ? format(new Date(card.dueDate), 'yyyy-MM-dd') : ''
  );
  const [newComment, setNewComment] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  // Attachment popup state
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentText, setAttachmentText] = useState('');
  const [attachmentFileName, setAttachmentFileName] = useState('');
  const [attachmentFileData, setAttachmentFileData] = useState('');
  const [attachmentPopupPos, setAttachmentPopupPos] = useState({ top: 0, left: 0 });

  const attachmentBtnRef = useRef<HTMLButtonElement>(null);

  if (!card) return null;

  const checklist = card.checklist ?? [];
  const comments = card.comments ?? [];
  const attachments = card.attachments ?? [];
  const completedCount = checklist.filter((i) => i.completed).length;

  const cardRef = card.number
    ? (board?.key ? `${board.key}-${card.number}` : `#${card.number}`)
    : null;

  const shareUrl = card.number
    ? `${window.location.origin}/boards/${boardId}?card=${card.number}`
    : null;

  const handleCopyLink = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleSection = (section: string) =>
    setActiveSection((prev) => (prev === section ? null : section));

  const handleTitleBlur = () => {
    if (title.trim() && title !== card.title) {
      updateCard(boardId, listId, cardId, { title: title.trim() });
    }
  };

  const handleAddLabel = (label: Label) => {
    updateCard(boardId, listId, cardId, { labels: [...card.labels, label] });
  };

  const handleRemoveLabel = (labelId: string) => {
    updateCard(boardId, listId, cardId, { labels: card.labels.filter((l) => l.id !== labelId) });
  };

  const handleDueDateChange = (newDueDate: string | null) => {
    const formatted = newDueDate ? format(new Date(newDueDate), 'yyyy-MM-dd') : '';
    setDueDate(formatted);
    updateCard(boardId, listId, cardId, { dueDate: newDueDate });
  };

  const handleAddCheckItem = (text: string) => {
    const item = { id: uuidv4(), text, completed: false };
    updateCard(boardId, listId, cardId, { checklist: [...checklist, item] });
  };

  const handleToggleCheckItem = (itemId: string) => {
    const updated = checklist.map((i) => i.id === itemId ? { ...i, completed: !i.completed } : i);
    updateCard(boardId, listId, cardId, { checklist: updated });
  };

  const handleDeleteCheckItem = (itemId: string) => {
    updateCard(boardId, listId, cardId, { checklist: checklist.filter((i) => i.id !== itemId) });
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    const comment = {
      id: uuidv4(),
      text: newComment.trim(),
      author: user?.email ?? 'Anonymous',
      createdAt: new Date().toISOString(),
    };
    updateCard(boardId, listId, cardId, { comments: [...comments, comment] });
    setNewComment('');
  };

  const handleDeleteComment = (commentId: string) => {
    updateCard(boardId, listId, cardId, { comments: comments.filter((c) => c.id !== commentId) });
  };

  const updateAttachmentPopupPosition = () => {
    if (!attachmentBtnRef.current) return;
    const rect = attachmentBtnRef.current.getBoundingClientRect();
    setAttachmentPopupPos({ top: rect.bottom + 8, left: rect.left });
  };

  const toggleAttachmentPopup = () => {
    if (activeSection === 'attachment') { setActiveSection(null); return; }
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

  const handleAddAttachment = () => {
    const url = attachmentUrl.trim();
    const fileName = attachmentFileName.trim();
    const fileData = attachmentFileData.trim();
    const displayText = attachmentText.trim();
    if (!url && !fileData) return;

    const attachment = {
      id: uuidv4(),
      url: url || fileData || undefined,
      fileName: fileName || undefined,
      fileData: fileData || undefined,
      name: displayText || fileName || url,
      addedAt: new Date().toISOString(),
    };

    updateCard(boardId, listId, cardId, { attachments: [...attachments, attachment] });
    setAttachmentUrl('');
    setAttachmentText('');
    setAttachmentFileName('');
    setAttachmentFileData('');
    setActiveSection(null);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    updateCard(boardId, listId, cardId, {
      attachments: attachments.filter((a) => a.id !== attachmentId),
    });
  };

  const handleDelete = () => {
    archiveCard(boardId, listId, cardId);
    onClose();
  };

  const actionBtnClass = (section: string | null) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
      activeSection === section
        ? 'bg-primary/15 border-primary/40 text-primary'
        : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
    }`;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-content bg-card border border-border rounded-2xl w-full mx-4 shadow-2xl max-h-[85vh] flex flex-col transition-[max-width] duration-300 ease-in-out ${showDetails ? 'max-w-4xl' : 'max-w-2xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border/30 shrink-0">
          <div className="flex-1 mr-4">
            {cardRef && (
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded">
                  {cardRef}
                </span>
                {shareUrl && (
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy shareable link"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Link2 className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy link'}</span>
                  </button>
                )}
              </div>
            )}
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              className="w-full text-lg font-semibold bg-transparent border-none outline-none focus:bg-secondary/30 rounded px-1 py-0.5 -ml-1 transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
              in list <span className="font-medium text-foreground/80">{list?.title}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Two-column body */}
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Column */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <Circle className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-base font-semibold">Activity</h3>
            </div>

            {/* Quick action bar */}
            <div className="flex flex-wrap gap-2 mb-5">
              {/* Add menu */}
              <div className="relative">
                <button className={actionBtnClass(showAddMenu ? '_addmenu' : null)} onClick={() => setShowAddMenu((v) => !v)}>
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
                        { id: 'attachment', icon: Paperclip, title: 'Attachment', desc: 'Add links, pages, and more' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => { setActiveSection(item.id); setShowAddMenu(false); }}
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

              {/* Attachment button */}
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
                                const reader = new FileReader();
                                reader.onload = () => {
                                  const result = typeof reader.result === 'string' ? reader.result : '';
                                  setAttachmentFileData(result);
                                };
                                reader.onerror = () => setAttachmentFileData('');
                                reader.readAsDataURL(file);
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
                          <div className="text-sm font-medium">Search or paste a link</div>
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
                          <Button
                            size="sm"
                            onClick={handleAddAttachment}
                            disabled={!attachmentUrl.trim() && !attachmentFileData.trim()}
                          >
                            Add attachment
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Expanded sections */}
            {activeSection === 'labels' && (
              <CardLabels labels={card.labels} onAdd={handleAddLabel} onRemove={handleRemoveLabel} />
            )}
            {activeSection === 'dates' && (
              <CardDueDate dueDate={card.dueDate} onChange={handleDueDateChange} />
            )}
            {activeSection === 'checklist' && (
              <CardChecklist
                checklist={checklist}
                onToggle={handleToggleCheckItem}
                onAdd={handleAddCheckItem}
                onRemove={handleDeleteCheckItem}
              />
            )}

            {/* Inline chips when sections are collapsed */}
            {activeSection !== 'labels' && card.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {card.labels.map((label) => (
                  <Badge key={label.id} className="text-white border-none text-[11px]" style={{ backgroundColor: label.color }}>
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
            {activeSection !== 'attachment' && (
              <CardAttachments attachments={attachments} onRemove={handleRemoveAttachment} />
            )}

            <CardDescription
              description={card.description}
              onSave={(desc) => updateCard(boardId, listId, cardId, { description: desc })}
            />
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
                <div className="flex items-start gap-2 mb-4">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: getMemberColor(user?.email ?? 'U') }}
                  >
                    {getInitials(user?.email?.split('@')[0] ?? 'U')}
                  </div>
                  <div className="flex-1 flex gap-1.5">
                    <Input
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="h-9 text-sm bg-secondary/30 flex-1"
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
                    />
                    <Button size="sm" className="h-9 px-2.5" onClick={handleAddComment} disabled={!newComment.trim()}>
                      <Send className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>

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
                            <p className="text-sm text-foreground/80 mt-0.5 whitespace-pre-wrap break-words">
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

        {/* Footer */}
        <div className="border-t border-border/50 px-6 py-3 flex justify-end shrink-0">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5"
            onClick={handleDelete}
          >
            <Archive className="w-4 h-4" />
            Archive card
          </Button>
        </div>
      </div>
    </div>
  );
}
