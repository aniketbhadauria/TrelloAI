import { useCardContext } from '@/context/CardContext'
import { apiInsertActivity } from '@/api'
import { PRIORITIES } from '@/utils/cardMeta'

export default function CardPriorityPicker() {
  const { card, boardId, cardId, updateCard, actorEmail, actorName, actorAvatar } = useCardContext()

  const handleSelect = (value: (typeof PRIORITIES)[number]['value'] | null) => {
    const prev = card.priority ?? null
    if (prev === value) return
    updateCard({ priority: value })
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      actorAvatar,
      type: 'priority_changed',
      payload: { from: prev ?? '', to: value ?? '' },
    })
  }

  return (
    <div className="mb-5 bg-secondary/30 rounded-xl p-3 border border-border/30 animate-slide-down space-y-1">
      {card.priority && (
        <button
          onClick={() => handleSelect(null)}
          className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear priority
        </button>
      )}
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          onClick={() => handleSelect(p.value)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
            card.priority === p.value
              ? 'bg-secondary text-foreground font-medium'
              : 'hover:bg-secondary/60 text-foreground/80'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${p.dot}`} />
          {p.label}
          {card.priority === p.value && (
            <span className="ml-auto text-[10px] text-muted-foreground">Selected</span>
          )}
        </button>
      ))}
    </div>
  )
}
