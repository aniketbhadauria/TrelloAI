import { AlignLeft, Calendar, CheckSquare, MessageSquare } from 'lucide-react';
import { Badge } from './ui/badge';
import { format, isPast, isToday } from 'date-fns';

const MEMBER_COLORS = [
  '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899',
];

function getMemberColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return MEMBER_COLORS[Math.abs(hash) % MEMBER_COLORS.length];
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

export default function KanbanCard({ card, onClick, isDragging }) {
  const hasDueDate = !!card.dueDate;
  const dueDate = hasDueDate ? new Date(card.dueDate) : null;
  const isOverdue = dueDate && isPast(dueDate) && !isToday(dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  const checklist = card.checklist || [];
  const members = card.members || [];
  const comments = card.comments || [];
  const completedCount = checklist.filter(i => i.completed).length;

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
          {hasDueDate && (
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

        {members.length > 0 && (
          <div className="flex items-center -space-x-1.5">
            {members.slice(0, 3).map((member) => (
              <div
                key={member.id}
                className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white ring-2 ring-card"
                style={{ backgroundColor: getMemberColor(member.name) }}
                title={member.name}
              >
                {getInitials(member.name)}
              </div>
            ))}
            {members.length > 3 && (
              <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-medium text-muted-foreground ring-2 ring-card">
                +{members.length - 3}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
