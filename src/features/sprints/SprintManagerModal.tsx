import { useState } from 'react'
import { X, Plus, Zap, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Sprint } from '@/types/board'
import SprintCard from './SprintCard'
import SprintForm from './SprintForm'
import { SPRINT_PREFIX, getNextSprintNumber } from '@/utils/sprint'
import type { SprintFormValues } from '@/utils/sprint'

interface SprintManagerModalProps {
  sprints: Sprint[]
  initialOpenCreate?: boolean
  onAdd: (data: Omit<Sprint, 'id' | 'createdAt'>) => void
  onUpdate: (sprintId: string, updates: Partial<Sprint>) => void
  onDelete: (sprintId: string) => void
  onClose: () => void
}

export default function SprintManagerModal({
  sprints,
  initialOpenCreate = false,
  onAdd,
  onUpdate,
  onDelete,
  onClose,
}: SprintManagerModalProps) {
  const [showCreateForm, setShowCreateForm] = useState(initialOpenCreate)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [showCompleted, setShowCompleted] = useState(false)

  const activeSprint = sprints.find((s) => s.status === 'active')
  const planningSprints = sprints.filter((s) => s.status === 'planning')
  const completedSprints = sprints.filter((s) => s.status === 'completed')
  const nextNumber = getNextSprintNumber(sprints)

  const handleCreate = (values: SprintFormValues) => {
    onAdd({
      name: `${SPRINT_PREFIX} ${values.sprintNumber}`,
      goal: values.goal.trim() || null,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
      status: 'planning',
    })
    setShowCreateForm(false)
  }

  const handleSaveEdit = (sprintId: string) => (values: SprintFormValues) => {
    onUpdate(sprintId, {
      name: `${SPRINT_PREFIX} ${values.sprintNumber}`,
      goal: values.goal.trim() || null,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
    })
    setEditingId(null)
  }

  const startEditing = (id: string) => {
    setShowCreateForm(false)
    setEditingId(id)
  }

  const sprintCardProps = (sprint: Sprint) => ({
    sprint,
    isEditing: editingId === sprint.id,
    otherSprints: sprints.filter((s) => s.id !== sprint.id),
    onStartEdit: () => startEditing(sprint.id),
    onSaveEdit: handleSaveEdit(sprint.id),
    onCancelEdit: () => setEditingId(null),
    onRequestDelete: () => setConfirmDeleteId(sprint.id),
    confirmDeleteId,
    onConfirmDelete: () => {
      onDelete(sprint.id)
      setConfirmDeleteId(null)
    },
    onCancelDelete: () => setConfirmDeleteId(null),
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 shrink-0">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold">Sprints</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeSprint && (
            <section>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Active Sprint
              </h3>
              <SprintCard
                {...sprintCardProps(activeSprint)}
                onComplete={() => onUpdate(activeSprint.id, { status: 'completed' })}
              />
            </section>
          )}

          {planningSprints.length > 0 && (
            <section>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Planning
              </h3>
              <div className="space-y-2">
                {planningSprints.map((sprint) => (
                  <SprintCard
                    key={sprint.id}
                    {...sprintCardProps(sprint)}
                    onStart={
                      !activeSprint
                        ? () =>
                            onUpdate(sprint.id, {
                              status: 'active',
                              startDate: new Date().toISOString().slice(0, 10),
                            })
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          )}

          {sprints.length === 0 && !showCreateForm && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No sprints yet. Create your first sprint below.
            </p>
          )}

          {showCreateForm ? (
            <section>
              <h3 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                New Sprint
              </h3>
              <SprintForm
                defaultValues={{
                  sprintNumber: nextNumber,
                  goal: '',
                  duration: '2weeks',
                  startDate: '',
                  endDate: '',
                }}
                minNumber={nextNumber}
                otherSprints={sprints}
                onSubmit={handleCreate}
                onCancel={() => setShowCreateForm(false)}
                submitLabel="Create Sprint"
              />
            </section>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingId(null)
                setShowCreateForm(true)
              }}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full justify-start"
            >
              <Plus className="w-3.5 h-3.5" />
              Create sprint
            </Button>
          )}

          {completedSprints.length > 0 && (
            <section>
              <button
                onClick={() => setShowCompleted((v) => !v)}
                className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 hover:text-foreground transition-colors"
              >
                {showCompleted ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
                Completed ({completedSprints.length})
              </button>
              {showCompleted && (
                <div className="space-y-2">
                  {completedSprints.map((sprint) => (
                    <SprintCard key={sprint.id} {...sprintCardProps(sprint)} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  )
}
