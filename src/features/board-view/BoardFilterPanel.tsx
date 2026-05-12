import { Search, Calendar, Tag, CheckSquare, Clock, X } from 'lucide-react';
import type { Label } from '@/types/board';

interface FilterCheckboxProps {
  checked: boolean;
  onChange: () => void;
  icon?: React.ReactNode;
  label?: string;
  isLabel?: boolean;
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
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
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
  );
}

interface BoardFilterPanelProps {
  filterKeyword: string;
  setFilterKeyword: (v: string) => void;
  filterLabels: string[];
  setFilterLabels: React.Dispatch<React.SetStateAction<string[]>>;
  filterDueDate: string[];
  setFilterDueDate: React.Dispatch<React.SetStateAction<string[]>>;
  filterStatus: string[];
  setFilterStatus: React.Dispatch<React.SetStateAction<string[]>>;
  filterActivity: string[];
  setFilterActivity: React.Dispatch<React.SetStateAction<string[]>>;
  allLabels: Label[];
  hasActiveFilters: boolean;
  clearAllFilters: () => void;
  onClose: () => void;
}

export default function BoardFilterPanel({
  filterKeyword, setFilterKeyword,
  filterLabels, setFilterLabels,
  filterDueDate, setFilterDueDate,
  filterStatus, setFilterStatus,
  filterActivity, setFilterActivity,
  allLabels, hasActiveFilters, clearAllFilters, onClose,
}: BoardFilterPanelProps) {
  const toggle = (
    arr: string[],
    setArr: React.Dispatch<React.SetStateAction<string[]>>,
    val: string,
  ) => setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose} />
      <div className="absolute top-full right-0 mt-1 w-72 bg-card border border-border rounded-xl shadow-2xl z-50 max-h-[70vh] overflow-y-auto animate-slide-down">
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
                onChange={() => toggle(filterStatus, setFilterStatus, 'complete')}
                icon={<CheckSquare className="w-4 h-4 text-green-400" />}
                label="Marked as complete"
              />
              <FilterCheckbox
                checked={filterStatus.includes('incomplete')}
                onChange={() => toggle(filterStatus, setFilterStatus, 'incomplete')}
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
                { id: 'none', icon: <Calendar className="w-4 h-4 text-muted-foreground" />, label: 'No dates' },
                { id: 'overdue', icon: <Clock className="w-4 h-4 text-red-400" />, label: 'Overdue' },
                { id: 'nextDay', icon: <Clock className="w-4 h-4 text-yellow-400" />, label: 'Due in the next day' },
                { id: 'nextWeek', icon: <Clock className="w-4 h-4 text-blue-400" />, label: 'Due in the next week' },
                { id: 'nextMonth', icon: <Clock className="w-4 h-4 text-cyan-400" />, label: 'Due in the next month' },
              ].map((item) => (
                <FilterCheckbox
                  key={item.id}
                  checked={filterDueDate.includes(item.id)}
                  onChange={() => toggle(filterDueDate, setFilterDueDate, item.id)}
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
                onChange={() => toggle(filterLabels, setFilterLabels, '__none__')}
                icon={<Tag className="w-4 h-4 text-muted-foreground" />}
                label="No labels"
              />
              {allLabels.map((lb) => (
                <FilterCheckbox
                  key={lb.id}
                  checked={filterLabels.includes(lb.id)}
                  onChange={() => toggle(filterLabels, setFilterLabels, lb.id)}
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
                  onChange={() => toggle(filterActivity, setFilterActivity, item.id)}
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
  );
}
