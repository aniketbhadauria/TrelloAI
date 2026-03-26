import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useBoards } from '../context/BoardContext';
import { GRADIENTS } from '../data/initialData';

export default function CreateBoardModal({ onClose }) {
  const { addBoard } = useBoards();
  const [title, setTitle] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENTS[0]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addBoard(title.trim(), selectedGradient);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bg-card border border-border rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Create new board</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={`h-28 rounded-xl ${selectedGradient} flex items-end p-4 transition-all`}>
            <p className="text-white font-semibold text-lg truncate">{title || 'Board title'}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-title">Board title</Label>
            <Input id="board-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter board title..." autoFocus className="bg-secondary/50" />
          </div>

          <div className="space-y-2">
            <Label>Background</Label>
            <div className="grid grid-cols-4 gap-2">
              {GRADIENTS.map((g) => (
                <button
                  key={g} type="button" onClick={() => setSelectedGradient(g)}
                  className={`h-10 rounded-lg ${g} transition-all ${selectedGradient === g ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-105' : 'hover:scale-105'}`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={!title.trim()}>Create Board</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
