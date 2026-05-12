import { useState } from 'react';
import { X, Check } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBoards } from '@/context/BoardContext';
import { GRADIENTS, GRADIENT_STYLES } from '@/utils/gradients';
import type { List } from '@/types/board';
import type { GradientKey } from '@/utils/gradients';

interface Template {
  id: string;
  name: string;
  description: string;
  lists: string[];
}

const TEMPLATES: Template[] = [
  { id: 'blank', name: 'Blank board', description: 'Start from scratch', lists: [] },
  { id: 'kanban', name: 'Kanban', description: 'Classic flow board', lists: ['Backlog', 'To Do', 'In Progress', 'Done'] },
  { id: 'project', name: 'Project Management', description: 'Track work end-to-end', lists: ['Planning', 'In Progress', 'In Review', 'Done', 'Blocked'] },
  { id: 'sprint', name: 'Sprint Board', description: 'Agile sprint planning', lists: ['Backlog', 'Sprint', 'In Progress', 'Testing', 'Done'] },
];

function buildLists(listNames: string[]): List[] {
  return listNames.map(name => ({ id: uuidv4(), title: name, cards: [] }));
}

interface CreateBoardModalProps {
  onClose: () => void;
}

export default function CreateBoardModal({ onClose }: CreateBoardModalProps) {
  const { addBoard } = useBoards();
  const [title, setTitle] = useState('');
  const [selectedGradient, setSelectedGradient] = useState<GradientKey>(GRADIENTS[0]);
  const [selectedTemplate, setSelectedTemplate] = useState('blank');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const template = TEMPLATES.find(t => t.id === selectedTemplate);
    addBoard(title.trim(), selectedGradient, null, buildLists(template!.lists));
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Create new board</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Preview */}
          <div
            className="h-28 rounded-xl flex items-end p-4 transition-all duration-300"
            style={{ background: GRADIENT_STYLES[selectedGradient] }}
          >
            <p className="text-white font-semibold text-lg truncate drop-shadow">
              {title || 'Board title'}
            </p>
          </div>

          {/* Board title */}
          <div className="space-y-2">
            <Label htmlFor="board-title">Board title</Label>
            <Input
              id="board-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter board title..."
              autoFocus
              className="bg-secondary/50"
            />
          </div>

          {/* Template picker */}
          <div className="space-y-2">
            <Label>Template</Label>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplate(t.id)}
                  className={`relative text-left rounded-xl border p-3 transition-all ${
                    selectedTemplate === t.id
                      ? 'border-primary bg-primary/5 ring-1 ring-primary'
                      : 'border-border/50 hover:border-border hover:bg-secondary/40'
                  }`}
                >
                  {selectedTemplate === t.id && (
                    <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-primary-foreground" />
                    </span>
                  )}
                  <p className="text-sm font-semibold mb-1 pr-5">{t.name}</p>
                  {t.lists.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {t.lists.map((l) => (
                        <span key={l} className="text-[10px] bg-secondary px-1.5 py-0.5 rounded-md text-muted-foreground">
                          {l}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">{t.description}</p>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Gradient picker */}
          <div className="space-y-2">
            <Label>Background</Label>
            <div className="grid grid-cols-4 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setSelectedGradient(g)}
                  className={`h-10 rounded-lg transition-all duration-200 ${
                    selectedGradient === g
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-[1.06]'
                      : 'hover:scale-[1.04] opacity-80 hover:opacity-100'
                  }`}
                  style={{ background: GRADIENT_STYLES[g] }}
                  aria-label={g}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={!title.trim()}>
              Create Board
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
