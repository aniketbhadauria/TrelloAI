import { useCardContext } from '@/context/CardContext'
import { apiInsertActivity } from '@/api'
import { CARD_TYPES } from '@/utils/cardMeta'

export default function CardTypePicker() {
  const { card, boardId, cardId, updateCard, actorEmail, actorName, actorAvatar } = useCardContext()

  const handleSelect = (value: (typeof CARD_TYPES)[number]['value'] | null) => {
    const prev = card.cardType ?? null
    if (prev === value) return
    updateCard({ cardType: value })
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      actorAvatar,
      type: 'type_changed',
      payload: { from: prev ?? '', to: value ?? '' },
    })
  }

  return (
    <div className="mb-5 bg-secondary/30 rounded-xl p-3 border border-border/30 animate-slide-down space-y-1">
      {card.cardType && (
        <button
          onClick={() => handleSelect(null)}
          className="w-full text-left px-3 py-2 text-xs text-muted-foreground hover:text-destructive transition-colors"
        >
          Clear type
        </button>
      )}
      {CARD_TYPES.map((t) => (
        <button
          key={t.value}
          onClick={() => handleSelect(t.value)}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
            card.cardType === t.value
              ? 'bg-secondary text-foreground font-medium'
              : 'hover:bg-secondary/60 text-foreground/80'
          }`}
        >
          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.bg} ${t.color}`}>
            {t.label}
          </span>
          {card.cardType === t.value && (
            <span className="ml-auto text-[10px] text-muted-foreground">Selected</span>
          )}
        </button>
      ))}
    </div>
  )
}
