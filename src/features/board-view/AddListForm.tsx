import { useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
        className="min-w-[280px] h-11 rounded-xl border border-white/20 flex items-center justify-center gap-2 text-white/70 hover:text-white hover:bg-white/10 hover:border-white/30 transition-all text-sm font-medium shrink-0 cursor-pointer"
      >
        <Plus className="w-4 h-4" />
        Add another list
      </button>
    );
  }

  return (
    <div className="min-w-[280px] shrink-0 animate-slide-down">
      <div className="bg-black/30 border border-white/10 rounded-xl p-3">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
          <input
            {...rest}
            ref={el => { rhfRef(el); (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = el; }}
            placeholder="Enter list title..."
            autoFocus
            className="w-full h-9 px-3 text-sm bg-white rounded-lg text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-white/50"
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={!isDirty}>Add list</Button>
            <button type="button" onClick={close} className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
