import { Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, isPast, isToday } from 'date-fns';

interface CardDueDateProps {
  dueDate: string | null;
  onChange: (date: string | null) => void;
}

export default function CardDueDate({ dueDate, onChange }: CardDueDateProps) {
  const dueDateFormatted = dueDate ? format(new Date(dueDate), 'yyyy-MM-dd') : '';
  const dateObj = dueDate ? new Date(dueDate) : null;
  const isOverdue = dateObj ? isPast(dateObj) && !isToday(dateObj) : false;
  const isDueToday = dateObj ? isToday(dateObj) : false;

  const handleChange = (val: string) => {
    onChange(val ? new Date(val).toISOString() : null);
  };

  return (
    <div className="mb-5 bg-secondary/30 rounded-xl p-4 border border-border/30 animate-slide-down">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Due Date</span>
        {dateObj && (
          <span
            className={`ml-auto text-xs px-2 py-0.5 rounded-full ${
              isOverdue
                ? 'bg-destructive/20 text-destructive'
                : isDueToday
                ? 'bg-yellow-500/20 text-yellow-600'
                : 'bg-secondary text-muted-foreground'
            }`}
          >
            {isOverdue ? 'Overdue' : isDueToday ? 'Today' : format(dateObj, 'MMM d')}
          </span>
        )}
      </div>
      <Input
        type="date"
        value={dueDateFormatted}
        onChange={(e) => handleChange(e.target.value)}
        className="bg-background/50 text-sm w-auto"
        autoFocus
      />
    </div>
  );
}
