import { useRef } from 'react'
import { Zap, Settings, Plus } from 'lucide-react'
import { useOutsideClick } from '@/hooks/useOutsideClick'
import type { Sprint } from '@/types/board'
import { useBoardFilterContext } from '@/context/BoardFilterContext'

interface BoardSprintDropdownProps {
  sprints: Sprint[]
  onManage: () => void
  onCreateSprint: () => void
  onClose: () => void
}

const STATUS_CLASS: Record<Sprint['status'], string> = {
  planning: 'text-muted-foreground',
  active: 'text-primary font-semibold',
  completed: 'text-muted-foreground/50',
}

const STATUS_BADGE: Record<Sprint['status'], string> = {
  planning: 'bg-secondary text-muted-foreground',
  active: 'bg-primary/15 text-primary border border-primary/30',
  completed: 'bg-secondary/50 text-muted-foreground/50',
}

export default function BoardSprintDropdown({
  sprints,
  onManage,
  onCreateSprint,
  onClose,
}: BoardSprintDropdownProps) {
  const ref = useRef<HTMLDivElement>(null)
  useOutsideClick(ref, onClose, true)

  const { filters, setSprint: setFilterSprint } = useBoardFilterContext()
  const filterSprint = filters.sprint

  const toggle = (id: string) =>
    setFilterSprint((prev) => (prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]))

  const visibleSprints = [...sprints].sort((a, b) => {
    const order = { active: 0, planning: 1, completed: 2 }
    return order[a.status] - order[b.status]
  })

  return (
    <div
      ref={ref}
      className="absolute top-full right-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 py-2 animate-slide-down text-foreground"
    >
      {visibleSprints.length === 0 ? (
        <p className="text-xs text-muted-foreground px-4 py-3 text-center">No sprints yet.</p>
      ) : (
        <>
          {visibleSprints.map((sprint) => {
            const isFiltered = filterSprint.includes(sprint.id)
            return (
              <button
                key={sprint.id}
                onClick={() => toggle(sprint.id)}
                className={`w-full flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-secondary/40 ${
                  isFiltered ? 'bg-primary/5' : ''
                }`}
              >
                <Zap
                  className={`w-3.5 h-3.5 shrink-0 ${sprint.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span className={`flex-1 text-left truncate ${STATUS_CLASS[sprint.status]}`}>
                  {sprint.name}
                </span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${STATUS_BADGE[sprint.status]}`}
                >
                  {sprint.status === 'active'
                    ? 'Active'
                    : sprint.status === 'planning'
                      ? 'Planning'
                      : 'Done'}
                </span>
                {isFiltered && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
              </button>
            )
          })}
          {filterSprint.length > 0 && (
            <button
              onClick={() => setFilterSprint([])}
              className="w-full text-xs text-center py-1.5 text-muted-foreground hover:text-foreground transition-colors border-t border-border/30 mt-1"
            >
              Clear sprint filter
            </button>
          )}
        </>
      )}

      <div className="border-t border-border/30 mt-1 pt-1">
        <button
          onClick={onManage}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <Settings className="w-3.5 h-3.5" />
          Manage sprints
        </button>
        <button
          onClick={onCreateSprint}
          className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Create sprint
        </button>
      </div>
    </div>
  )
}
