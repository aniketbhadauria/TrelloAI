import { useState, useEffect } from 'react'
import { Calendar, Archive, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useBoards } from '@/context/board/BoardContext'
import { useAuth } from '@/context/AuthContext'
import { useProfile } from '@/context/ProfileContext'
import { format } from 'date-fns'
import CardDescription from './CardDescription'
import CardLabels from './CardLabels'
import CardChecklist from './CardChecklist'
import CardDueDate from './CardDueDate'
import CardAttachments from './CardAttachments'
import CardActivityFeed from './CardActivityFeed'
import CardModalHeader from './CardModalHeader'
import CardActionBar from './CardActionBar'
import CardMembersPanel from './CardMembersPanel'
import CardSprintPicker from './CardSprintPicker'
import CardPriorityPicker from './CardPriorityPicker'
import CardTypePicker from './CardTypePicker'
import { CardContext } from '@/context/CardContext'
import type { BoardMember, Card } from '@/types/board'
import { apiInsertActivity } from '@/api'
import { sendNotification } from '@/api'
import { getAvatarColor, resolveActorIdentity } from '@/utils/user'
import { Zap } from 'lucide-react'
import { getPriority, getCardType } from '@/utils/cardMeta'

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
  const { getBoard, updateCard: boardUpdateCard, archiveCard } = useBoards()
  const { user } = useAuth()
  const { profile } = useProfile()
  const board = getBoard(boardId)
  const list = board?.lists.find((l) => l.id === listId)
  const card = list?.cards.find((c) => c.id === cardId)

  const [title, setTitle] = useState(card?.title ?? '')
  const [activeSection, setActiveSection] = useState<string | null>(null)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!card || !board) return null

  const { actorEmail, actorName } = resolveActorIdentity(user, boardMembers)
  const actorAvatar = profile?.avatar_url ?? undefined

  const updateCard = (updates: Partial<Card>) => boardUpdateCard(boardId, listId, cardId, updates)

  const notifyAssignedMembers = (
    excludeEmail: string,
    notifTitle: string,
    body: string,
    email_type?: 'comment' | 'mention'
  ) => {
    for (const assignedMember of card.members ?? []) {
      const m = boardMembers.find((bm) => bm.userId === assignedMember.id)
      if (m?.email && m.email !== excludeEmail) {
        void sendNotification({
          userEmail: m.email,
          title: notifTitle,
          body,
          boardId,
          cardId,
          email_type,
        })
      }
    }
  }

  const handleTitleBlur = () => {
    const trimmed = title.trim()
    if (trimmed && trimmed !== card.title) {
      void apiInsertActivity({
        boardId,
        cardId,
        actorEmail,
        actorName,
        actorAvatar,
        type: 'title_changed',
        payload: { from: card.title, to: trimmed },
      })
      updateCard({ title: trimmed })
    }
  }

  const handleDelete = () => {
    notifyAssignedMembers(
      actorEmail,
      `${card.title} — ${board.title}`,
      `${actorName} archived this card`
    )
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

  const contextValue = {
    boardId,
    listId,
    cardId,
    card,
    board,
    listTitle: list?.title,
    boardMembers,
    actorEmail,
    actorName,
    actorAvatar,
    activeSection,
    setActiveSection,
    updateCard,
    notifyAssignedMembers,
  }

  return (
    <CardContext.Provider value={contextValue}>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content bg-card border border-border rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          <CardModalHeader
            title={title}
            onTitleChange={setTitle}
            onTitleBlur={handleTitleBlur}
            onClose={onClose}
          />

          {/* Two-column body */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Left Column */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex items-center gap-2.5 mb-4">
                <Circle className="w-5 h-5 text-muted-foreground" />
                <h3 className="text-base font-semibold">Activity</h3>
              </div>

              <CardActionBar />

              {/* Contextual Panels */}
              {activeSection === 'members' && <CardMembersPanel />}
              {activeSection === 'labels' && <CardLabels />}
              {activeSection === 'priority' && <CardPriorityPicker />}
              {activeSection === 'type' && <CardTypePicker />}
              {activeSection === 'sprint' && <CardSprintPicker />}
              {activeSection === 'dates' && <CardDueDate />}
              {activeSection === 'checklist' && <CardChecklist />}
              <CardAttachments />

              {/* Inline chips when sections are collapsed */}
              {activeSection !== 'members' && (card.members?.length ?? 0) > 0 && (
                <div className="flex items-center gap-1.5 mb-4">
                  <span className="text-xs text-muted-foreground">Assigned:</span>
                  <div className="flex -space-x-1.5">
                    {card.members!.map((m) => {
                      const bm = boardMembers.find((b) => b.userId === m.id)
                      return bm?.avatar_url ? (
                        <img
                          key={m.id}
                          src={bm.avatar_url}
                          alt={m.name}
                          title={m.name}
                          className="w-6 h-6 rounded-full border-2 border-card object-cover"
                        />
                      ) : (
                        <div
                          key={m.id}
                          title={m.name}
                          className="w-6 h-6 rounded-full border-2 border-card flex items-center justify-center text-white text-[9px] font-bold"
                          style={{ backgroundColor: getAvatarColor(m.id) }}
                        >
                          {m.name[0]?.toUpperCase()}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              {/* Priority + Type + Sprint chips row */}
              {(card.priority || card.cardType || card.sprintId) && (
                <div className="flex flex-wrap items-center gap-1.5 mb-4">
                  {activeSection !== 'priority' &&
                    card.priority &&
                    (() => {
                      const p = getPriority(card.priority)
                      return p ? (
                        <button
                          onClick={() => setActiveSection('priority')}
                          className="inline-flex items-center gap-1.5 text-xs rounded-full px-2.5 py-0.5 bg-secondary hover:bg-secondary/80 transition-colors"
                        >
                          <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />
                          <span className={p.color}>{p.label}</span>
                        </button>
                      ) : null
                    })()}
                  {activeSection !== 'type' &&
                    card.cardType &&
                    (() => {
                      const t = getCardType(card.cardType)
                      return t ? (
                        <button
                          onClick={() => setActiveSection('type')}
                          className={`inline-flex items-center text-xs rounded-full px-2.5 py-0.5 ${t.bg} ${t.color} hover:opacity-80 transition-opacity font-medium`}
                        >
                          {t.label}
                        </button>
                      ) : null
                    })()}
                  {activeSection !== 'sprint' &&
                    card.sprintId &&
                    (() => {
                      const sprint = board.sprints?.find((s) => s.id === card.sprintId)
                      return sprint ? (
                        <button
                          onClick={() => setActiveSection('sprint')}
                          className="inline-flex items-center gap-1.5 text-xs text-primary bg-primary/10 border border-primary/25 rounded-full px-2.5 py-0.5 hover:bg-primary/20 transition-colors"
                        >
                          <Zap className="w-3 h-3" />
                          {sprint.name}
                        </button>
                      ) : null
                    })()}
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
              {activeSection !== 'dates' && card.dueDate && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Due {format(new Date(card.dueDate), 'MMM d, yyyy')}</span>
                </div>
              )}

              <CardDescription />
            </div>

            {/* Right Column — Activity + Comments */}
            <CardActivityFeed />
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
    </CardContext.Provider>
  )
}
