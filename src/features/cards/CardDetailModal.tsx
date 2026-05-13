import { useState, useRef, useEffect } from 'react'
import {
  X,
  Calendar,
  Tag,
  Archive,
  Circle,
  CheckSquare,
  Plus,
  Paperclip,
  Link2,
  Check,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useBoards } from '@/context/BoardContext'
import { useAuth } from '@/context/AuthContext'
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import CardDescription from './CardDescription'
import CardLabels from './CardLabels'
import CardChecklist from './CardChecklist'
import CardDueDate from './CardDueDate'
import CardAttachments from './CardAttachments'
import type { Label } from '@/types/board'

const MEMBER_COLORS = [
  '#8b5cf6',
  '#3b82f6',
  '#06b6d4',
  '#10b981',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#ec4899',
]

function avatarColor(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h)
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length]
}

interface BoardMember {
  userId: string
  display_name: string | null
  email: string | null
  avatar_url: string | null
}

interface CardDetailModalProps {
  boardId: string
  listId: string
  cardId: string
  boardMembers?: BoardMember[]
  onClose: () => void
}

export default function CardDetailModal({
  boardId,
  listId,
  cardId,
  boardMembers = [],
  onClose,
}: CardDetailModalProps) {
  const { getBoard, updateCard, archiveCard } = useBoards()
  const { user } = useAuth()
  const board = getBoard(boardId)
  const list = board?.lists.find((l) => l.id === listId)
  const card = list?.cards.find((c) => c.id === cardId)

  const [title, setTitle] = useState(card?.title ?? '')
  const [dueDate, setDueDate] = useState(
    card?.dueDate ? format(new Date(card.dueDate), 'yyyy-MM-dd') : ''
  )
  const [activeSection, setActiveSection] = useState<string | null>(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [copied, setCopied] = useState(false)

  // Attachment popup state
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentText, setAttachmentText] = useState('')
  const [attachmentFileName, setAttachmentFileName] = useState('')
  const [attachmentFileData, setAttachmentFileData] = useState('')
  const [attachmentPopupPos, setAttachmentPopupPos] = useState({ top: 0, left: 0 })

  const attachmentBtnRef = useRef<HTMLButtonElement>(null)

  if (!card) return null

  const checklist = card.checklist ?? []
  const attachments = card.attachments ?? []
  const completedCount = checklist.filter((i) => i.completed).length

  const cardRef = card.number
    ? board?.key
      ? `${board.key}-${card.number}`
      : `#${card.number}`
    : null

  const boardSlug = board?.key ?? boardId
  const shareUrl = card.number
    ? `${window.location.origin}/boards/${boardSlug}/${card.number}`
    : null

  const handleCopyLink = async () => {
    if (!shareUrl) return
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const toggleSection = (section: string) =>
    setActiveSection((prev) => (prev === section ? null : section))

  const handleTitleBlur = () => {
    if (title.trim() && title !== card.title) {
      updateCard(boardId, listId, cardId, { title: title.trim() })
    }
  }

  const handleAddLabel = (label: Label) => {
    updateCard(boardId, listId, cardId, { labels: [...card.labels, label] })
  }

  const handleRemoveLabel = (labelId: string) => {
    updateCard(boardId, listId, cardId, { labels: card.labels.filter((l) => l.id !== labelId) })
  }

  const handleDueDateChange = (newDueDate: string | null) => {
    const formatted = newDueDate ? format(new Date(newDueDate), 'yyyy-MM-dd') : ''
    setDueDate(formatted)
    updateCard(boardId, listId, cardId, { dueDate: newDueDate })
  }

  const handleAddCheckItem = (text: string) => {
    const item = { id: uuidv4(), text, completed: false }
    updateCard(boardId, listId, cardId, { checklist: [...checklist, item] })
  }

  const handleToggleCheckItem = (itemId: string) => {
    const updated = checklist.map((i) => (i.id === itemId ? { ...i, completed: !i.completed } : i))
    updateCard(boardId, listId, cardId, { checklist: updated })
  }

  const handleDeleteCheckItem = (itemId: string) => {
    updateCard(boardId, listId, cardId, { checklist: checklist.filter((i) => i.id !== itemId) })
  }

  const updateAttachmentPopupPosition = () => {
    if (!attachmentBtnRef.current) return
    const rect = attachmentBtnRef.current.getBoundingClientRect()
    setAttachmentPopupPos({ top: rect.bottom + 8, left: rect.left })
  }

  const toggleAttachmentPopup = () => {
    if (activeSection === 'attachment') {
      setActiveSection(null)
      return
    }
    updateAttachmentPopupPosition()
    setActiveSection('attachment')
  }

  useEffect(() => {
    if (activeSection !== 'attachment') return
    const handleReposition = () => updateAttachmentPopupPosition()
    window.addEventListener('resize', handleReposition)
    window.addEventListener('scroll', handleReposition, true)
    return () => {
      window.removeEventListener('resize', handleReposition)
      window.removeEventListener('scroll', handleReposition, true)
    }
  }, [activeSection])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handleAddAttachment = () => {
    const url = attachmentUrl.trim()
    const fileName = attachmentFileName.trim()
    const fileData = attachmentFileData.trim()
    const displayText = attachmentText.trim()
    if (!url && !fileData) return

    const attachment = {
      id: uuidv4(),
      url: url || fileData || undefined,
      fileName: fileName || undefined,
      fileData: fileData || undefined,
      name: displayText || fileName || url,
      addedAt: new Date().toISOString(),
    }

    updateCard(boardId, listId, cardId, { attachments: [...attachments, attachment] })
    setAttachmentUrl('')
    setAttachmentText('')
    setAttachmentFileName('')
    setAttachmentFileData('')
    setActiveSection(null)
  }

  const handleRemoveAttachment = (attachmentId: string) => {
    updateCard(boardId, listId, cardId, {
      attachments: attachments.filter((a) => a.id !== attachmentId),
    })
  }

  const handleToggleMember = (member: BoardMember) => {
    const currentMembers = card.members ?? []
    const isAssigned = currentMembers.some((m) => m.id === member.userId)
    const updated = isAssigned
      ? currentMembers.filter((m) => m.id !== member.userId)
      : [
          ...currentMembers,
          { id: member.userId, name: member.display_name || member.email || member.userId },
        ]
    updateCard(boardId, listId, cardId, { members: updated })
  }

  const handleDelete = () => {
    archiveCard(boardId, listId, cardId)
    onClose()
  }

  const actionBtnClass = (section: string | null) =>
    `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${
      activeSection === section
        ? 'bg-primary/15 border-primary/40 text-primary'
        : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border'
    }`

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl w-full mx-4 shadow-2xl max-h-[85vh] flex flex-col max-w-2xl"
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
                    {copied ? (
                      <Check className="w-3 h-3 text-green-500" />
                    ) : (
                      <Link2 className="w-3 h-3" />
                    )}
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
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
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
                <button
                  className={actionBtnClass(showAddMenu ? '_addmenu' : null)}
                  onClick={() => setShowAddMenu((v) => !v)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
                {showAddMenu && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowAddMenu(false)} />
                    <div className="absolute top-full left-0 mt-2 w-64 bg-card border border-border/60 rounded-xl shadow-xl z-50 py-2 animate-slide-down">
                      <div className="flex items-center justify-between px-4 py-2 border-b border-border/30 mb-1">
                        <span className="text-sm font-semibold">Add to card</span>
                        <button
                          onClick={() => setShowAddMenu(false)}
                          className="p-0.5 rounded hover:bg-secondary transition-colors"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      {[
                        {
                          id: 'members',
                          icon: Users,
                          title: 'Assignee',
                          desc: 'Assign members to this card',
                        },
                        {
                          id: 'labels',
                          icon: Tag,
                          title: 'Labels',
                          desc: 'Organize, categorize, and prioritize',
                        },
                        {
                          id: 'dates',
                          icon: Calendar,
                          title: 'Dates',
                          desc: 'Start dates, due dates, and reminders',
                        },
                        {
                          id: 'checklist',
                          icon: CheckSquare,
                          title: 'Checklist',
                          desc: 'Add subtasks',
                        },
                        {
                          id: 'attachment',
                          icon: Paperclip,
                          title: 'Attachment',
                          desc: 'Add links, pages, and more',
                        },
                      ].map((item) => (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveSection(item.id)
                            setShowAddMenu(false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-secondary/40 transition-colors"
                        >
                          <item.icon className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div>
                            <div className="text-sm font-medium">{item.title}</div>
                            <div className="text-[11px] text-muted-foreground leading-tight">
                              {item.desc}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <button
                className={actionBtnClass('members')}
                onClick={() => toggleSection('members')}
              >
                <Users className="w-3.5 h-3.5" />
                Assignee
                {(card.members?.length ?? 0) > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
                    {card.members!.length}
                  </span>
                )}
              </button>

              <button className={actionBtnClass('labels')} onClick={() => toggleSection('labels')}>
                <Tag className="w-3.5 h-3.5" />
                Labels
                {card.labels.length > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
                    {card.labels.length}
                  </span>
                )}
              </button>

              <button className={actionBtnClass('dates')} onClick={() => toggleSection('dates')}>
                <Calendar className="w-3.5 h-3.5" />
                Dates
              </button>

              <button
                className={actionBtnClass('checklist')}
                onClick={() => toggleSection('checklist')}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                Checklist
                {checklist.length > 0 && (
                  <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
                    {completedCount}/{checklist.length}
                  </span>
                )}
              </button>

              {/* Attachment button */}
              <div className="relative">
                <button
                  ref={attachmentBtnRef}
                  className={actionBtnClass('attachment')}
                  onClick={toggleAttachmentPopup}
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  Attachment
                  {attachments.length > 0 && (
                    <span className="w-4.5 h-4.5 rounded-full bg-primary/20 text-[10px] flex items-center justify-center">
                      {attachments.length}
                    </span>
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
                        <button
                          onClick={() => setActiveSection(null)}
                          className="p-1 rounded hover:bg-secondary transition-colors"
                        >
                          <X className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">
                            Attach a file from your computer
                          </p>
                          <p className="text-xs text-muted-foreground mb-2">
                            You can also drag and drop files to upload them.
                          </p>
                          <label className="block">
                            <input
                              type="file"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (!file) return
                                setAttachmentFileName(file.name)
                                if (!attachmentText.trim()) setAttachmentText(file.name)
                                const reader = new FileReader()
                                reader.onload = () => {
                                  const result =
                                    typeof reader.result === 'string' ? reader.result : ''
                                  setAttachmentFileData(result)
                                }
                                reader.onerror = () => setAttachmentFileData('')
                                reader.readAsDataURL(file)
                              }}
                            />
                            <span className="h-9 rounded-md bg-secondary/70 hover:bg-secondary cursor-pointer flex items-center justify-center text-sm font-medium transition-colors">
                              Choose a file
                            </span>
                          </label>
                          {attachmentFileName && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {attachmentFileName}
                            </p>
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
            {activeSection === 'members' && (
              <div className="mb-4 p-3 bg-secondary/30 rounded-xl border border-border/40">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Assignee
                </p>
                {/* Assign to me shortcut */}
                {user && (
                  <button
                    onClick={() => {
                      const me = boardMembers.find((m) => m.userId === user.id)
                      handleToggleMember({
                        userId: user.id,
                        display_name: me?.display_name ?? null,
                        email: user.email ?? null,
                        avatar_url: me?.avatar_url ?? null,
                      })
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-1.5 mb-2 rounded-lg border border-dashed border-border/60 hover:bg-secondary/60 transition-colors text-left"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                      style={{ backgroundColor: avatarColor(user.id) }}
                    >
                      {(user.email?.[0] ?? '?').toUpperCase()}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {(card.members ?? []).some((m) => m.id === user.id)
                        ? 'Remove me'
                        : 'Assign to me'}
                    </span>
                  </button>
                )}
                {boardMembers.length > 0 ? (
                  <div className="space-y-1">
                    {boardMembers.map((m) => {
                      const isAssigned = (card.members ?? []).some((cm) => cm.id === m.userId)
                      const label = m.display_name || m.email || m.userId
                      return (
                        <button
                          key={m.userId}
                          onClick={() => handleToggleMember(m)}
                          className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-colors text-left ${isAssigned ? 'bg-primary/10' : 'hover:bg-secondary/60'}`}
                        >
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                            style={{ backgroundColor: avatarColor(m.userId) }}
                          >
                            {label[0]?.toUpperCase()}
                          </div>
                          <span className="flex-1 text-sm truncate">{label}</span>
                          {isAssigned && <Check className="w-3.5 h-3.5 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground px-1">
                    No other members on this board yet.
                  </p>
                )}
              </div>
            )}
            {activeSection === 'labels' && (
              <CardLabels
                labels={card.labels}
                onAdd={handleAddLabel}
                onRemove={handleRemoveLabel}
              />
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
            {activeSection !== 'members' && (card.members?.length ?? 0) > 0 && (
              <div className="flex items-center gap-1.5 mb-4">
                <span className="text-xs text-muted-foreground">Assigned:</span>
                <div className="flex -space-x-1.5">
                  {card.members!.map((m) => (
                    <div
                      key={m.id}
                      title={m.name}
                      className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-white text-[9px] font-bold"
                      style={{ backgroundColor: avatarColor(m.id) }}
                    >
                      {m.name[0]?.toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
            )}
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
            {activeSection !== 'attachment' && (
              <CardAttachments attachments={attachments} onRemove={handleRemoveAttachment} />
            )}

            <CardDescription
              description={card.description}
              boardId={boardId}
              cardId={cardId}
              boardTitle={board?.title ?? ''}
              actorEmail={user?.email ?? ''}
              actorName={
                user?.user_metadata?.display_name ??
                user?.user_metadata?.full_name ??
                user?.email ??
                ''
              }
              boardMembers={boardMembers}
              onSave={(desc) => updateCard(boardId, listId, cardId, { description: desc })}
            />
          </div>
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
  )
}
