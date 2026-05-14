import { Search, Calendar, Tag, CheckSquare, Clock, X, Zap, Flag, Shapes } from 'lucide-react'
import type { Label, Sprint } from '@/types/board'
import { PRIORITIES, CARD_TYPES } from '@/utils/cardMeta'

interface FilterCheckboxProps {
  checked: boolean
  onChange: () => void
  icon?: React.ReactNode
  label?: string
  isLabel?: boolean
}

function FilterCheckbox({ checked, onChange, icon, label, isLabel }: FilterCheckboxProps) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center gap-2.5 px-1 py-1.5 rounded-lg hover:bg-secondary/40 transition-colors text-left"
    >
      <div
        className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
          checked ? 'bg-primary border-primary text-primary-foreground' : 'border-border'
        }`}
      >
        {checked && (
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      {isLabel ? (
        <div className="flex-1">{icon}</div>
      ) : (
        <>
          {icon}
          <span className="text-sm">{label}</span>
        </>
      )}
    </button>
  )
}

interface BoardFilterPanelProps {
  filterKeyword: string
  setFilterKeyword: (v: string) => void
  filterLabels: string[]
  setFilterLabels: (v: string[] | ((prev: string[]) => string[])) => void
  filterDueDate: string[]
  setFilterDueDate: (v: string[] | ((prev: string[]) => string[])) => void
  filterStatus: string[]
  setFilterStatus: (v: string[] | ((prev: string[]) => string[])) => void
  filterActivity: string[]
  setFilterActivity: (v: string[] | ((prev: string[]) => string[])) => void
  filterSprint: string[]
  setFilterSprint: (v: string[] | ((prev: string[]) => string[])) => void
  filterPriority: string[]
  setFilterPriority: (v: string[] | ((prev: string[]) => string[])) => void
  filterCardType: string[]
  setFilterCardType: (v: string[] | ((prev: string[]) => string[])) => void
  allLabels: Label[]
  allSprints: Sprint[]
  hasActiveFilters: boolean
  clearAllFilters: () => void
  onClose: () => void
}

export default function BoardFilterPanel({
  filterKeyword,
  setFilterKeyword,
  filterLabels,
  setFilterLabels,
  filterDueDate,
  setFilterDueDate,
  filterStatus,
  setFilterStatus,
  filterActivity,
  setFilterActivity,
  filterSprint,
  setFilterSprint,
  filterPriority,
  setFilterPriority,
  filterCardType,
  setFilterCardType,
  allLabels,
  allSprints,
  hasActiveFilters,
  clearAllFilters,
  onClose,
}: BoardFilterPanelProps) {
  const toggle = (setArr: (v: (prev: string[]) => string[]) => void, val: string) =>
    setArr((prev) => (prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]))

  return (
    <>
      <div className="absolute top-full right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto animate-slide-down text-foreground">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 sticky top-0 bg-card z-10 rounded-t-xl">
          <span className="text-sm font-semibold">Filter</span>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Keyword */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Keyword
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filterKeyword}
                onChange={(e) => setFilterKeyword(e.target.value)}
                placeholder="Enter a keyword..."
                className="w-full h-8 pl-8 pr-3 text-sm bg-secondary/40 border border-border/50 rounded-lg outline-none focus:border-primary/50 transition-colors"
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Search cards and labels.</p>
          </div>

          {/* Card Status */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <CheckSquare className="w-3.5 h-3.5" />
              Card status
            </label>
            <div className="space-y-1">
              <FilterCheckbox
                checked={filterStatus.includes('complete')}
                onChange={() => toggle(setFilterStatus, 'complete')}
                icon={<CheckSquare className="w-4 h-4 text-green-400" />}
                label="Marked as complete"
              />
              <FilterCheckbox
                checked={filterStatus.includes('incomplete')}
                onChange={() => toggle(setFilterStatus, 'incomplete')}
                icon={<CheckSquare className="w-4 h-4 text-muted-foreground" />}
                label="Not marked as complete"
              />
            </div>
          </div>

          {/* Due Date */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              Due date
            </label>
            <div className="space-y-1">
              {[
                {
                  id: 'none',
                  icon: <Calendar className="w-4 h-4 text-muted-foreground" />,
                  label: 'No dates',
                },
                {
                  id: 'overdue',
                  icon: <Clock className="w-4 h-4 text-red-400" />,
                  label: 'Overdue',
                },
                {
                  id: 'nextDay',
                  icon: <Clock className="w-4 h-4 text-yellow-400" />,
                  label: 'Due in the next day',
                },
                {
                  id: 'nextWeek',
                  icon: <Clock className="w-4 h-4 text-blue-400" />,
                  label: 'Due in the next week',
                },
                {
                  id: 'nextMonth',
                  icon: <Clock className="w-4 h-4 text-cyan-400" />,
                  label: 'Due in the next month',
                },
              ].map((item) => (
                <FilterCheckbox
                  key={item.id}
                  checked={filterDueDate.includes(item.id)}
                  onChange={() => toggle(setFilterDueDate, item.id)}
                  icon={item.icon}
                  label={item.label}
                />
              ))}
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Labels
            </label>
            <div className="space-y-1">
              <FilterCheckbox
                checked={filterLabels.includes('__none__')}
                onChange={() => toggle(setFilterLabels, '__none__')}
                icon={<Tag className="w-4 h-4 text-muted-foreground" />}
                label="No labels"
              />
              {allLabels.map((lb) => (
                <FilterCheckbox
                  key={lb.id}
                  checked={filterLabels.includes(lb.id)}
                  onChange={() => toggle(setFilterLabels, lb.id)}
                  icon={
                    <span
                      className="w-full h-6 rounded-md text-white text-xs font-medium flex items-center px-2"
                      style={{ backgroundColor: lb.color }}
                    >
                      {lb.text}
                    </span>
                  }
                  isLabel
                />
              ))}
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5" />
              Priority
            </label>
            <div className="space-y-1">
              {PRIORITIES.map((p) => (
                <FilterCheckbox
                  key={p.value}
                  checked={filterPriority.includes(p.value)}
                  onChange={() => toggle(setFilterPriority, p.value)}
                  icon={<span className={`w-2.5 h-2.5 rounded-full ${p.dot}`} />}
                  label={p.label}
                />
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Shapes className="w-3.5 h-3.5" />
              Type
            </label>
            <div className="space-y-1">
              {CARD_TYPES.map((t) => (
                <FilterCheckbox
                  key={t.value}
                  checked={filterCardType.includes(t.value)}
                  onChange={() => toggle(setFilterCardType, t.value)}
                  icon={
                    <span
                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${t.bg} ${t.color}`}
                    >
                      {t.label}
                    </span>
                  }
                  label=""
                  isLabel
                />
              ))}
            </div>
          </div>

          {/* Sprint */}
          {allSprints.length > 0 && (
            <div>
              <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                Sprint
              </label>
              <div className="space-y-1">
                <FilterCheckbox
                  checked={filterSprint.includes('__backlog__')}
                  onChange={() => toggle(setFilterSprint, '__backlog__')}
                  icon={<Zap className="w-4 h-4 text-muted-foreground" />}
                  label="Backlog (no sprint)"
                />
                {allSprints.map((s) => (
                  <FilterCheckbox
                    key={s.id}
                    checked={filterSprint.includes(s.id)}
                    onChange={() => toggle(setFilterSprint, s.id)}
                    icon={
                      <Zap
                        className={`w-4 h-4 ${s.status === 'active' ? 'text-primary' : 'text-muted-foreground'}`}
                      />
                    }
                    label={s.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Activity */}
          <div>
            <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Activity
            </label>
            <div className="space-y-1">
              {[
                { id: '1week', label: 'Active in the last week' },
                { id: '2weeks', label: 'Active in the last two weeks' },
                { id: '4weeks', label: 'Active in the last four weeks' },
                { id: 'noActivity', label: 'Without activity in the last four weeks' },
              ].map((item) => (
                <FilterCheckbox
                  key={item.id}
                  checked={filterActivity.includes(item.id)}
                  onChange={() => toggle(setFilterActivity, item.id)}
                  label={item.label}
                />
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="w-full text-xs text-center py-2 text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>
    </>
  )
}
