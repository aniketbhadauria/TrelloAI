import { Play, CheckCircle2, Trash2, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import type { Sprint, SprintStatus } from '@/types/board'
import SprintForm from './SprintForm'
import { parseSprintNumber } from '@/utils/sprint'
import type { SprintFormValues } from '@/utils/sprint'

const STATUS_CONFIG: Record<SprintStatus, { label: string; class: string }> = {
  planning: { label: 'Planning', class: 'bg-secondary text-muted-foreground' },
  active: { label: 'Active', class: 'bg-primary/15 text-primary border border-primary/30' },
  completed: { label: 'Done', class: 'bg-green-500/15 text-green-400' },
}

interface SprintCardProps {
  sprint: Sprint
  isEditing: boolean
  otherSprints: Sprint[]
  onStartEdit: () => void
  onSaveEdit: (values: SprintFormValues) => void
  onCancelEdit: () => void
  onStart?: () => void
  onComplete?: () => void
  onRequestDelete: () => void
  confirmDeleteId: string | null
  onConfirmDelete: () => void
  onCancelDelete: () => void
}

export default function SprintCard({
  sprint,
  isEditing,
  otherSprints,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onStart,
  onComplete,
  onRequestDelete,
  confirmDeleteId,
  onConfirmDelete,
  onCancelDelete,
}: SprintCardProps) {
  const cfg = STATUS_CONFIG[sprint.status]
  const isConfirmingDelete = confirmDeleteId === sprint.id

  if (isEditing) {
    return (
      <SprintForm
        defaultValues={{
          sprintNumber: parseSprintNumber(sprint.name) || 1,
          goal: sprint.goal ?? '',
          duration: 'custom',
          startDate: sprint.startDate ?? '',
          endDate: sprint.endDate ?? '',
        }}
        minNumber={1}
        otherSprints={otherSprints}
        onSubmit={onSaveEdit}
        onCancel={onCancelEdit}
        submitLabel="Save"
      />
    )
  }

  return (
    <div className="border border-border/50 rounded-xl p-3.5 bg-secondary/10 group">
      <div className="flex items-center gap-2 mb-1">
        <Zap
          className={`w-3.5 h-3.5 shrink-0 ${sprint.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}
        />
        <span className="text-sm font-semibold truncate">{sprint.name}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${cfg.class}`}>
          {cfg.label}
        </span>
      </div>

      {sprint.goal && <p className="text-xs text-muted-foreground ml-5 mb-1">{sprint.goal}</p>}

      {(sprint.startDate || sprint.endDate) && (
        <p className="text-[11px] text-muted-foreground ml-5 mb-1">
          {sprint.startDate ? format(new Date(sprint.startDate), 'MMM d') : '—'}
          {' → '}
          {sprint.endDate ? format(new Date(sprint.endDate), 'MMM d, yyyy') : 'No end date'}
        </p>
      )}

      {isConfirmingDelete ? (
        <div className="flex items-center gap-2 mt-2 ml-5">
          <span className="text-xs text-destructive">Delete this sprint?</span>
          <Button
            size="xs"
            variant="destructive"
            onClick={onConfirmDelete}
            className="h-6 text-[11px]"
          >
            Delete
          </Button>
          <Button size="xs" variant="ghost" onClick={onCancelDelete} className="h-6 text-[11px]">
            Cancel
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 mt-2 ml-5 opacity-0 group-hover:opacity-100 transition-opacity">
          {sprint.status !== 'completed' && (
            <button
              onClick={onStartEdit}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Edit
            </button>
          )}
          {onStart && (
            <button
              onClick={onStart}
              className="flex items-center gap-1 text-[11px] text-primary hover:text-primary/80 transition-colors"
            >
              <Play className="w-3 h-3" />
              Start
            </button>
          )}
          {onComplete && (
            <button
              onClick={onComplete}
              className="flex items-center gap-1 text-[11px] text-green-400 hover:text-green-300 transition-colors"
            >
              <CheckCircle2 className="w-3 h-3" />
              Complete
            </button>
          )}
          <button
            onClick={onRequestDelete}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-destructive transition-colors ml-auto"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  )
}
