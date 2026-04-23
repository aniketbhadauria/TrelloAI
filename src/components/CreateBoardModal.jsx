import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useBoards } from '../context/BoardContext';
import { GRADIENTS } from '../data/initialData';

const GRADIENT_STYLES = {
  'gradient-1': 'linear-gradient(135deg, #f97316 0%, #ec4899 50%, #a855f7 100%)',
  'gradient-2': 'linear-gradient(135deg, #f472b6 0%, #c084fc 100%)',
  'gradient-3': 'linear-gradient(135deg, #fb923c 0%, #f472b6 100%)',
  'gradient-4': 'linear-gradient(135deg, #e879f9 0%, #818cf8 100%)',
  'gradient-5': 'linear-gradient(135deg, #f43f5e 0%, #fb923c 100%)',
  'gradient-6': 'linear-gradient(135deg, #c084fc 0%, #f9a8d4 100%)',
  'gradient-7': 'linear-gradient(135deg, #fbbf24 0%, #f472b6 100%)',
  'gradient-8': 'linear-gradient(135deg, #f9a8d4 0%, #c4b5fd 100%)',
};

export default function CreateBoardModal({ onClose }) {
  const { addBoard } = useBoards();
  const [title, setTitle] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addBoard(title.trim(), selectedGradient, null);
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
