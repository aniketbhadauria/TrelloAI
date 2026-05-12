import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onAdd: (title: string) => void;
}

export default function AddCardForm({ onAdd }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<{ title: string }>();

  const onSubmit = ({ title }: { title: string }) => {
    if (!title.trim()) return;
    onAdd(title.trim());
    reset();
    textareaRef.current?.focus();
  };

  const { ref: rhfRef, ...rest } = register('title');

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(onSubmit)();
    }
    if (e.key === 'Escape') { setIsAdding(false); reset(); }
  }

  function close() { setIsAdding(false); reset(); }

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
      <form onSubmit={handleSubmit(onSubmit)}>
        <textarea
          {...rest}
          ref={el => { rhfRef(el); (textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el; }}
          onKeyDown={handleKeyDown}
          placeholder="Enter a title for this card..."
          autoFocus
          rows={2}
          className="w-full bg-card border border-border/50 rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/30"
        />
        <div className="flex gap-2 mt-2">
          <Button type="submit" size="sm" disabled={!isDirty}>Add card</Button>
          <button type="button" onClick={close} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
