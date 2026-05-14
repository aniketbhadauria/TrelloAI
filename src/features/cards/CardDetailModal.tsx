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
import { Badge } from '@/components/ui/badge'
import { useBoards } from '@/context/BoardContext'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { format } from 'date-fns'
import { v4 as uuidv4 } from 'uuid'
import CardDescription from './CardDescription'
import CardLabels from './CardLabels'
import CardChecklist from './CardChecklist'
import CardDueDate from './CardDueDate'
import CardAttachments from './CardAttachments'
import CardActivityFeed from './CardActivityFeed'
import type { Label, BoardMember } from '@/types/board'
import { apiInsertActivity, cancelPendingEmail } from '@/api'
import { sendNotification } from '@/context/NotificationContext'
import { getAvatarColor } from '@/utils/user'

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
  const { profile } = useProfile()
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

  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [attachmentText, setAttachmentText] = useState('')
  const [attachmentFileName, setAttachmentFileName] = useState('')
  const [attachmentFileData, setAttachmentFileData] = useState('')
  const attachmentBtnRef = useRef<HTMLButtonElement>(null)

  if (!card) return null

  const actorEmail = user?.email ?? ''
  const member = boardMembers.find((m) => m.userId === user?.id)
  const actorName =
    member?.display_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.full_name ||
    user?.email ||
    'Someone'

  const notifyAssignedMembers = (
    excludeEmail: string,
    title: string,
    body: string,
    email_type?: 'comment' | 'mention'
  ) => {
    for (const assignedMember of card.members ?? []) {
      const member = boardMembers.find((m) => m.userId === assignedMember.id)
      if (member?.email && member.email !== excludeEmail) {
        void sendNotification({ userEmail: member.email, title, body, boardId, cardId, email_type })
      }
    }
  }

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
    const prevDate = card.dueDate

    setDueDate(formatted)
    updateCard(boardId, listId, cardId, { dueDate: newDueDate })

    const boardTitle = board?.title ?? ''
    const cardTitle = card.title

    if (!newDueDate) {
      void apiInsertActivity({
        boardId,
        cardId,
        actorEmail,
        actorName,
        actorAvatar: profile?.avatar_url || undefined,
        type: 'due_date_removed',
      })
      notifyAssignedMembers(
        actorEmail,
        `${cardTitle} — ${boardTitle}`,
        `${actorName} removed the due date`
      )
    } else if (!prevDate) {
      const dateStr = format(new Date(newDueDate), 'MMM d, yyyy')
      void apiInsertActivity({
        boardId,
        cardId,
        actorEmail,
        actorName,
        actorAvatar: profile?.avatar_url || undefined,
        type: 'due_date_set',
        payload: { date: dateStr },
      })
      notifyAssignedMembers(
        actorEmail,
        `${cardTitle} — ${boardTitle}`,
        `${actorName} set the due date to ${dateStr}`
      )
    } else {
      const toStr = format(new Date(newDueDate), 'MMM d, yyyy')
      void apiInsertActivity({
        boardId,
        cardId,
        actorEmail,
        actorName,
        actorAvatar: profile?.avatar_url || undefined,
        type: 'due_date_changed',
        payload: {
          from: format(new Date(prevDate), 'MMM d, yyyy'),
          to: toStr,
        },
      })
      notifyAssignedMembers(
        actorEmail,
        `${cardTitle} — ${boardTitle}`,
        `${actorName} changed the due date to ${toStr}`
      )
    }
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

  const toggleAttachmentPopup = () => {
    if (activeSection === 'attachment') {
      setActiveSection(null)
      return
    }
    setActiveSection('attachment')
  }

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
      ? currentMembers.filter((m) => String(m.id) !== String(member.userId))
      : [
          ...currentMembers,
          { id: member.userId, name: member.display_name || member.email || member.userId },
        ]
    updateCard(boardId, listId, cardId, { members: updated })

    const memberName = member.display_name || member.email || member.userId
    const actorAvatar = profile?.avatar_url || undefined
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      actorAvatar,
      type: isAssigned ? 'member_unassigned' : 'member_assigned',
      payload: { userId: member.userId, userName: memberName },
    })

    if (member.email && member.email !== actorEmail) {
      const boardTitle = board?.title ?? ''
      const cardTitle = card.title
      if (isAssigned) {
        void cancelPendingEmail(`assigned:${cardId}:${member.email}`)
        void sendNotification({
          userEmail: member.email,
          title: `${cardTitle} — ${boardTitle}`,
          body: `${actorName} removed you from this card`,
          boardId,
          cardId,
        })
      } else {
        void sendNotification({
          userEmail: member.email,
          title: `${cardTitle} — ${boardTitle}`,
          body: `${actorName} assigned you to this card`,
          boardId,
          cardId,
          email_type: 'assigned',
        })
      }
    }
  }

  const handleDelete = () => {
    const boardTitle = board?.title ?? ''
    const cardTitle = card.title
    notifyAssignedMembers(
      actorEmail,
      `${cardTitle} — ${boardTitle}`,
      `${actorName} archived this card`
    )
    const actorAvatar = profile?.avatar_url || undefined
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      actorAvatar,
      type: 'archived',
    })
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
        className="modal-content bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in"
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
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-muted-foreground">
                in list <span className="font-medium text-foreground/80">{list?.title}</span>
              </p>
              {card.creatorName && (
                <>
                  <span className="text-muted-foreground/30 text-[10px]">•</span>
                  <p className="text-xs text-muted-foreground">
                    Created by{' '}
                    <span className="font-medium text-foreground/80">{card.creatorName}</span>
                  </p>
                </>
              )}
              <span className="text-muted-foreground/30 text-[10px]">•</span>
              <p className="text-xs text-muted-foreground">
                on{' '}
                <span className="font-medium text-foreground/80">
                  {format(new Date(card.createdAt), 'MMM d, yyyy')}
                </span>
              </p>
            </div>
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
            </div>

            {/* Contextual Panels */}
            {activeSection === 'members' && (
              <div className="mb-4 p-4 bg-secondary/20 rounded-xl border border-border/40 animate-slide-down">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Assign Members
                  </h4>
                  <button onClick={() => setActiveSection(null)}>
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {boardMembers.map((m) => {
                    const isAssigned = (card.members ?? []).some((cm) => cm.id === m.userId)
                    return (
                      <button
                        key={m.userId}
                        onClick={() => handleToggleMember(m)}
                        className={`group flex items-center gap-2 px-2 py-1.5 rounded-lg border transition-all ${
                          isAssigned
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'bg-background border-border/50 hover:border-primary/40'
                        }`}
                      >
                        {m.avatar_url ? (
                          <img
                            src={m.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover shadow-sm"
                          />
                        ) : (
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                            style={{ backgroundColor: getAvatarColor(m.userId) }}
                          >
                            {m.display_name?.[0] || m.email?.[0] || '?'}
                          </div>
                        )}
                        <span className="text-xs font-medium max-w-[100px] truncate">
                          {m.display_name || m.email}
                        </span>
                        {isAssigned && <Check className="w-3 h-3" />}
                      </button>
                    )
                  })}
                </div>
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
            {activeSection === 'attachment' && (
              <CardAttachments
                attachments={attachments}
                onAdd={handleAddAttachment}
                onRemove={handleRemoveAttachment}
                url={attachmentUrl}
                setUrl={setAttachmentUrl}
                name={attachmentText}
                setName={setAttachmentText}
              />
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
                      style={{ backgroundColor: getAvatarColor(m.id) }}
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
              actorName={actorName}
              boardMembers={boardMembers}
              onSave={(desc) => updateCard(boardId, listId, cardId, { description: desc })}
            />
          </div>

          {/* Right Column — Activity + Comments */}
          <CardActivityFeed
            boardId={boardId}
            cardId={cardId}
            cardMembers={card.members ?? []}
            boardMembers={boardMembers}
            actorEmail={user?.email ?? ''}
            actorName={actorName}
            actorAvatar={profile?.avatar_url ?? undefined}
            cardTitle={card.title}
            boardTitle={board?.title ?? ''}
          />
        </div>

        {/* Footer */}
        <div className="border-t border-border/50 px-6 py-3 flex justify-end shrink-0 bg-secondary/10">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 text-xs"
            onClick={handleDelete}
          >
            <Archive className="w-3.5 h-3.5" />
            Archive card
          </Button>
        </div>
      </div>
    </div>
  )
}
