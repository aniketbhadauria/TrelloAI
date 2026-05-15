import { X, Check } from 'lucide-react'
import type { BoardMember } from '@/types/board'
import { useCardContext } from '@/context/CardContext'
import { getAvatarColor } from '@/utils/user'
import { apiInsertActivity, cancelPendingEmail } from '@/api'
import { sendNotification } from '@/api'

export default function CardMembersPanel() {
  const {
    card,
    board,
    boardId,
    cardId,
    boardMembers,
    actorEmail,
    actorName,
    actorAvatar,
    updateCard,
    setActiveSection,
  } = useCardContext()
  const cardMembers = card.members ?? []

  const handleToggle = (member: BoardMember) => {
    const isAssigned = cardMembers.some((m) => m.id === member.userId)
    const updated = isAssigned
      ? cardMembers.filter((m) => String(m.id) !== String(member.userId))
      : [
          ...cardMembers,
          { id: member.userId, name: member.display_name || member.email || member.userId },
        ]
    updateCard({ members: updated })

    const memberName = member.display_name || member.email || member.userId
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
      if (isAssigned) {
        void cancelPendingEmail(`assigned:${cardId}:${member.email}`)
        void sendNotification({
          userEmail: member.email,
          title: `${card.title} — ${board.title}`,
          body: `${actorName} removed you from this card`,
          boardId,
          cardId,
        })
      } else {
        void sendNotification({
          userEmail: member.email,
          title: `${card.title} — ${board.title}`,
          body: `${actorName} assigned you to this card`,
          boardId,
          cardId,
          email_type: 'assigned',
        })
      }
    }
  }

  return (
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
          const isAssigned = cardMembers.some((cm) => cm.id === m.userId)
          return (
            <button
              key={m.userId}
              onClick={() => handleToggle(m)}
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
              <span className="text-xs font-medium max-w-25 truncate">
                {m.display_name || m.email}
              </span>
              {isAssigned && <Check className="w-3 h-3" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
