import { useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

export default function AddListForm({ onAdd }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
    inputRef.current?.focus();
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="min-w-[300px] h-11 rounded-xl border-2 border-dashed border-border/40 flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-secondary/30 transition-all text-sm font-medium flex-shrink-0 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Add another list
      </button>
    );
  }

  return (
    <div className="min-w-[300px] flex-shrink-0 animate-slide-down">
      <div className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl p-3">
        <form onSubmit={handleSubmit} className="space-y-2">
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter list title..."
            autoFocus
            className="bg-secondary/50 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!title.trim()}>Add list</Button>
            <button type="button" onClick={() => { setIsAdding(false); setTitle(''); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
