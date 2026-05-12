import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onAdd: (title: string) => void;
}

export default function AddListForm({ onAdd }: Props) {
  const [isAdding, setIsAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { register, handleSubmit, reset, formState: { isDirty } } = useForm<{ title: string }>();

  const onSubmit = ({ title }: { title: string }) => {
    if (!title.trim()) return;
    onAdd(title.trim());
    reset();
    inputRef.current?.focus();
  };

  const { ref: rhfRef, ...rest } = register('title');

  function close() { setIsAdding(false); reset(); }

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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <Input
            {...rest}
            ref={el => { rhfRef(el); (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el; }}
            placeholder="Enter list title..."
            autoFocus
            className="bg-secondary/50 text-sm"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!isDirty}>Add list</Button>
            <button type="button" onClick={close} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
