import { useState } from 'react';
import { X, Calendar, Tag, Trash2, AlignLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { useBoards } from '../context/BoardContext';
import { LABEL_COLORS } from '../data/initialData';
import { format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

export default function CardDetailModal({ boardId, listId, cardId, onClose }) {
  const { getBoard, updateCard, deleteCard } = useBoards();
  const board = getBoard(boardId);
  const list = board?.lists.find(l => l.id === listId);
  const card = list?.cards.find(c => c.id === cardId);

  const [title, setTitle] = useState(card?.title || '');
  const [description, setDescription] = useState(card?.description || '');
  const [editingDesc, setEditingDesc] = useState(false);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelText, setNewLabelText] = useState('');
  const [selectedLabelColor, setSelectedLabelColor] = useState(LABEL_COLORS[0].value);
  const [dueDate, setDueDate] = useState(card?.dueDate ? format(new Date(card.dueDate), 'yyyy-MM-dd') : '');

  if (!card) return null;

  const handleTitleBlur = () => {
    if (title.trim() && title !== card.title) {
      updateCard(boardId, listId, cardId, { title: title.trim() });
    }
  };

  const handleDescSave = () => {
    updateCard(boardId, listId, cardId, { description });
    setEditingDesc(false);
  };

  const handleAddLabel = () => {
    if (!newLabelText.trim()) return;
    const newLabel = { id: uuidv4(), text: newLabelText.trim(), color: selectedLabelColor };
    updateCard(boardId, listId, cardId, { labels: [...card.labels, newLabel] });
    setNewLabelText('');
    setShowLabelPicker(false);
  };

  const handleRemoveLabel = (labelId) => {
    updateCard(boardId, listId, cardId, { labels: card.labels.filter(l => l.id !== labelId) });
  };

  const handleDueDateChange = (e) => {
    const val = e.target.value;
    setDueDate(val);
    updateCard(boardId, listId, cardId, { dueDate: val ? new Date(val).toISOString() : null });
  };

  const handleDelete = () => {
    deleteCard(boardId, listId, cardId);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content bg-card border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex-1 mr-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
              className="w-full text-lg font-semibold bg-transparent border-none outline-none focus:bg-secondary/30 rounded px-1 py-0.5 -ml-1 transition-colors"
            />
            <p className="text-xs text-muted-foreground mt-1">
              in list <span className="font-medium text-foreground/80">{list?.title}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 pb-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Labels</span>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {card.labels.map((label) => (
                <Badge
                  key={label.id}
                  className="cursor-pointer hover:opacity-80 transition-opacity text-white border-none"
                  style={{ backgroundColor: label.color }}
                  onClick={() => handleRemoveLabel(label.id)}
                >
                  {label.text} ×
                </Badge>
              ))}
              <button
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className="px-2 py-0.5 text-xs rounded-full border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                + Add
              </button>
            </div>
            {showLabelPicker && (
              <div className="bg-secondary/50 rounded-lg p-3 space-y-2 animate-slide-down">
                <Input
                  value={newLabelText}
                  onChange={(e) => setNewLabelText(e.target.value)}
                  placeholder="Label text..."
                  className="bg-background/50 text-sm h-8"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddLabel()}
                />
                <div className="flex gap-1.5">
                  {LABEL_COLORS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setSelectedLabelColor(c.value)}
                      className={`w-6 h-6 rounded-full transition-all ${selectedLabelColor === c.value ? 'ring-2 ring-white ring-offset-1 ring-offset-card scale-110' : ''}`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
                <Button size="sm" onClick={handleAddLabel} disabled={!newLabelText.trim()}>Add label</Button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Due Date</span>
            </div>
            <Input
              type="date"
              value={dueDate}
              onChange={handleDueDateChange}
              className="bg-secondary/50 text-sm w-auto"
            />
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <AlignLeft className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Description</span>
            </div>
            {editingDesc ? (
              <div className="space-y-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a more detailed description..."
                  rows={4}
                  autoFocus
                  className="bg-secondary/50 text-sm"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDescSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setDescription(card.description); setEditingDesc(false); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => setEditingDesc(true)}
                className="min-h-[60px] bg-secondary/30 rounded-lg p-3 text-sm cursor-pointer hover:bg-secondary/50 transition-colors"
              >
                {card.description || <span className="text-muted-foreground">Add a more detailed description...</span>}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-border/50">
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete card
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
