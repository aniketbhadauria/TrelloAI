import { useState, useRef } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from './ui/button';

export default function AddCardForm({ onAdd }) {
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd(title.trim());
    setTitle('');
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    if (e.key === 'Escape') {
      setIsAdding(false);
      setTitle('');
    }
  };

  if (!isAdding) {
    return (
      <button
        onClick={() => setIsAdding(true)}
        className="w-full flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/40 rounded-lg transition-all cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Add a card
      </button>
    );
  }

  return (
    <div className="px-2 pb-2 animate-slide-down">
      <form onSubmit={handleSubmit}>
        <textarea
          ref={textareaRef}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a title for this card..."
          autoFocus
          rows={2}
          className="w-full bg-card border border-border/50 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
        />
        <div className="flex gap-2 mt-2">
          <Button type="submit" size="sm" disabled={!title.trim()}>Add card</Button>
          <button type="button" onClick={() => { setIsAdding(false); setTitle(''); }} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
