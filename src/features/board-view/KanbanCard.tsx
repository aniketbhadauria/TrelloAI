import { AlignLeft, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import type { Card } from '@/types/board';

interface KanbanCardProps {
  card: Card;
  boardKey?: string;
  onClick: () => void;
  isDragging: boolean;
}

export default function KanbanCard({ card, boardKey, onClick, isDragging }: KanbanCardProps) {
  const hasDueDate = !!card.dueDate;
  const dueDate = hasDueDate ? new Date(card.dueDate!) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  const checklist = card.checklist || [];
  const comments = card.comments || [];
  const completedCount = checklist.filter(i => i.completed).length;
  const cardRef = card.number ? (boardKey ? `${boardKey}-${card.number}` : `#${card.number}`) : null;

  return (
    <div
      onClick={onClick}
      className={`kanban-card bg-card border border-border/40 rounded-lg p-3 cursor-pointer group ${isDragging ? 'is-dragging' : ''}`}
    >
      {card.labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {card.labels.map((label) => (
            <span
              key={label.id}
              className="inline-block h-2 w-10 rounded-full"
              style={{ backgroundColor: label.color }}
              title={label.text}
            />
          ))}
        </div>
      )}

      <p className="text-sm font-medium leading-snug mb-2">{card.title}</p>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          {hasDueDate && dueDate && (
            <div className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
              isOverdue ? 'bg-destructive/20 text-destructive' : isDueToday ? 'bg-yellow-500/20 text-yellow-400' : 'text-muted-foreground'
            }`}>
              <Calendar className="w-3 h-3" />
              <span>{format(dueDate, 'MMM d')}</span>
            </div>
          )}
          {card.description && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Has description">
              <AlignLeft className="w-3 h-3" />
            </div>
          )}
          {checklist.length > 0 && (
            <div
              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                completedCount === checklist.length ? 'bg-green-500/20 text-green-400' : 'text-muted-foreground'
              }`}
              title={`${completedCount}/${checklist.length} completed`}
            >
              <CheckSquare className="w-3 h-3" />
              <span>{completedCount}/{checklist.length}</span>
            </div>
          )}
          {comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground" title={`${comments.length} comment${comments.length > 1 ? 's' : ''}`}>
              <MessageSquare className="w-3 h-3" />
              <span>{comments.length}</span>
            </div>
          )}
        </div>

        {cardRef && (
          <span className="text-[10px] font-mono text-muted-foreground/60 shrink-0">{cardRef}</span>
        )}
      </div>
    </div>
  );
}
