import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LABEL_COLORS } from '@/utils/labels';
import type { Label } from '@/types/board';

interface CardLabelsProps {
  labels: Label[];
  onAdd: (label: Label) => void;
  onRemove: (labelId: string) => void;
}

export default function CardLabels({ labels, onAdd, onRemove }: CardLabelsProps) {
  const [text, setText] = useState('');
  const [color, setColor] = useState(LABEL_COLORS[0].value);

  const handleAdd = () => {
    if (!text.trim()) return;
    onAdd({ id: crypto.randomUUID(), text: text.trim(), color });
    setText('');
  };

  return (
    <div className="mb-5 bg-secondary/30 rounded-xl p-4 border border-border/30 animate-slide-down">
      {labels.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {labels.map((label) => (
            <Badge
              key={label.id}
              className="cursor-pointer hover:opacity-80 transition-opacity text-white border-none"
              style={{ backgroundColor: label.color }}
              onClick={() => onRemove(label.id)}
            >
              {label.text} <X className="w-3 h-3 ml-1 inline" />
            </Badge>
          ))}
        </div>
      )}
      <div className="space-y-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Label text..."
          className="bg-background/50 text-sm h-8"
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
        />
        <div className="flex gap-1.5">
          {LABEL_COLORS.map((c) => (
            <button
              key={c.value}
              onClick={() => setColor(c.value)}
              className={`w-6 h-6 rounded-full transition-all ${color === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-card scale-110' : ''}`}
              style={{ backgroundColor: c.value }}
              title={c.name}
            />
          ))}
        </div>
        <Button size="sm" onClick={handleAdd} disabled={!text.trim()}>Add label</Button>
      </div>
    </div>
  );
}
