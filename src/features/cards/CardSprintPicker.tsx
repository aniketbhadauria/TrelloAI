import { Zap } from 'lucide-react'
import { useCardContext } from '@/context/CardContext'
import { apiInsertActivity } from '@/api'
import type { SprintStatus } from '@/types/board'

const STATUS_LABEL: Record<SprintStatus, string> = {
  planning: 'Planning',
  active: 'Active',
  completed: 'Done',
}

const STATUS_CLASS: Record<SprintStatus, string> = {
  planning: 'bg-secondary text-muted-foreground',
  active: 'bg-primary/15 text-primary border border-primary/30',
  completed: 'bg-green-500/15 text-green-400',
}

export default function CardSprintPicker() {
  const { board, card, boardId, cardId, updateCard, actorEmail, actorName, actorAvatar } =
    useCardContext()
  const sprints = (board.sprints ?? []).filter((s) => s.status !== 'completed')

  const handleToggle = (sprintId: string, sprintName: string) => {
    const isSelected = card.sprintId === sprintId
    updateCard({ sprintId: isSelected ? null : sprintId })
    void apiInsertActivity({
      boardId,
      cardId,
      actorEmail,
      actorName,
      actorAvatar,
      type: isSelected ? 'sprint_removed' : 'sprint_assigned',
      payload: { sprintName },
    })
  }

  if (sprints.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-3 mb-5">
        No active sprints. Create one from the board header.
      </p>
    )
  }

  return (
    <div className="space-y-1.5 mb-5">
      {sprints.map((sprint) => {
        const isSelected = card.sprintId === sprint.id
        return (
          <button
            key={sprint.id}
            onClick={() => handleToggle(sprint.id, sprint.name)}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all ${
              isSelected
                ? 'bg-primary/10 border-primary/40'
                : 'bg-secondary/30 border-border/50 hover:bg-secondary/60'
            }`}
          >
            <Zap
              className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
            />
            <span
              className={`text-sm font-medium flex-1 truncate ${isSelected ? 'text-primary' : 'text-foreground'}`}
            >
              {sprint.name}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full ${STATUS_CLASS[sprint.status]}`}>
              {STATUS_LABEL[sprint.status]}
            </span>
          </button>
        )
      })}
      {card.sprintId && (
        <button
          onClick={() => {
            const sprint = board.sprints?.find((s) => s.id === card.sprintId)
            if (sprint) handleToggle(sprint.id, sprint.name)
          }}
          className="text-xs text-muted-foreground hover:text-destructive transition-colors px-1 pt-1"
        >
          Remove from sprint
        </button>
      )}
    </div>
  )
}
