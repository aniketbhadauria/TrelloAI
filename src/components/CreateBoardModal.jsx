import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useBoards } from '../context/BoardContext';
import { GRADIENTS } from '../data/initialData';

const IMAGE_OPTIONS = [
  {
    id: 'emerson',
    label: 'Emerson',
    url: '/emerson.jpg',
  },
  {
    id: 'esperia',
    label: 'Esperia',
    url: '/esperia.png',
  },
];

export default function CreateBoardModal({ onClose }) {
  const { addBoard } = useBoards();
  const [title, setTitle] = useState('');
  const selectedGradient = GRADIENTS[0];
  const [selectedImage, setSelectedImage] = useState(IMAGE_OPTIONS[0].url);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    addBoard(title.trim(), selectedGradient, selectedImage);
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
          <div
            className="h-28 rounded-xl flex items-end p-4 transition-all bg-cover bg-center"
            style={{ backgroundImage: `url('${selectedImage}')` }}
          >
            <p className="text-white font-semibold text-lg truncate">{title || 'Board title'}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="board-title">Board title</Label>
            <Input id="board-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter board title..." autoFocus className="bg-secondary/50" />
          </div>

          <div className="space-y-2">
            <Label>Background</Label>
            <div className="grid grid-cols-2 gap-3">
              {IMAGE_OPTIONS.map((image) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => setSelectedImage(image.url)}
                  className={`rounded-lg overflow-hidden border transition-all ${
                    selectedImage === image.url
                      ? 'ring-2 ring-primary ring-offset-2 ring-offset-card scale-[1.02]'
                      : 'hover:scale-[1.01] border-border/50'
                  }`}
                >
                  <div
                    className="h-16 w-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${image.url}')` }}
                  />
                  <div className="px-2 py-1.5 text-xs font-medium text-left">{image.label}</div>
                </button>
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
