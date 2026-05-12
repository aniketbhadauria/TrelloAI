import { useState } from 'react';
import { AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface CardDescriptionProps {
  description: string;
  onSave: (description: string) => void;
}

function DescriptionRenderer({ text }: { text: string }) {
  if (!text) return null;

  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let currentBullets: string[] = [];
  let key = 0;

  const flushBullets = () => {
    if (currentBullets.length > 0) {
      elements.push(
        <ul key={`ul-${key++}`} className="list-disc list-inside space-y-0.5 my-1.5 text-foreground">
          {currentBullets.map((b, i) => (
            <li key={i} className="leading-relaxed">{b}</li>
          ))}
        </ul>
      );
      currentBullets = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const bulletMatch = line.match(/^\s*[•\-*]\s+(.*)/);

    if (bulletMatch) {
      currentBullets.push(bulletMatch[1]);
    } else {
      flushBullets();
      if (line.trim() === '') {
        elements.push(<div key={`br-${key++}`} className="h-2" />);
      } else {
        elements.push(
          <p key={`p-${key++}`} className="text-foreground leading-relaxed whitespace-pre-wrap break-words">
            {line}
          </p>
        );
      }
    }
  }
  flushBullets();

  return <div className="space-y-0.5">{elements}</div>;
}

export default function CardDescription({ description, onSave }: CardDescriptionProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(description);

  const handleSave = () => {
    onSave(draft);
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(description);
    setEditing(false);
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <AlignLeft className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium">Description</span>
      </div>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a more detailed description..."
            rows={8}
            autoFocus
            className="bg-white text-foreground text-sm border-border/40 rounded-xl leading-relaxed resize-none"
            style={{ whiteSpace: 'pre-wrap', tabSize: 2 }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}>Save</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(description); setEditing(true); }}
          className="w-full text-left min-h-[80px] rounded-xl p-4 text-sm cursor-pointer transition-colors bg-white hover:bg-gray-50 border border-border/40"
        >
          {description ? (
            <DescriptionRenderer text={description} />
          ) : (
            <span className="text-gray-500">Add a more detailed description...</span>
          )}
        </button>
      )}
    </div>
  );
}
