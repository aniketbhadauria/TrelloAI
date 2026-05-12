import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ChecklistItem } from '@/types/board';

interface CardChecklistProps {
  checklist: ChecklistItem[];
  onToggle: (itemId: string) => void;
  onAdd: (text: string) => void;
  onRemove: (itemId: string) => void;
}

export default function CardChecklist({ checklist, onToggle, onAdd, onRemove }: CardChecklistProps) {
  const [newItem, setNewItem] = useState('');
  const completedCount = checklist.filter((i) => i.completed).length;
  const progress = checklist.length > 0 ? Math.round((completedCount / checklist.length) * 100) : 0;

  const handleAdd = () => {
    if (!newItem.trim()) return;
    onAdd(newItem.trim());
    setNewItem('');
  };

  return (
    <div className="mb-5 bg-secondary/30 rounded-xl p-4 border border-border/30 animate-slide-down">
      {checklist.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-1.5 bg-secondary/50 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  backgroundColor: progress === 100 ? '#10b981' : '#ec4899',
                }}
              />
            </div>
            <span className="text-[10px] font-medium text-muted-foreground w-8 text-right">
              {progress}%
            </span>
          </div>
          <div className="space-y-1 mb-2">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-2 group rounded-lg px-2 py-1.5 hover:bg-secondary/30 transition-colors"
              >
                <button
                  onClick={() => onToggle(item.id)}
                  className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                    item.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-border hover:border-pink-400'
                  }`}
                >
                  {item.completed && (
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <span className={`flex-1 text-sm ${item.completed ? 'line-through text-muted-foreground' : ''}`}>
                  {item.text}
                </span>
                <button
                  onClick={() => onRemove(item.id)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder="Add an item..."
          className="h-8 text-sm bg-background/50 flex-1"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <Button size="sm" className="h-8 px-3" onClick={handleAdd} disabled={!newItem.trim()}>
          <Plus className="w-3.5 h-3.5" />
        </Button>
      </div>
    </div>
  );
}
