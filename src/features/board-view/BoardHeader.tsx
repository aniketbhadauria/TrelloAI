import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MoreHorizontal, Filter, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Board, BoardRole } from '@/types/board';
import BoardFilterPanel from './BoardFilterPanel';
import type { Label } from '@/types/board';

interface BoardHeaderProps {
  board: Board;
  canEdit: boolean;
  role: BoardRole | null;
  hasActiveFilters: boolean;
  filterOpen: boolean;
  onFilterToggle: () => void;
  onFilterClose: () => void;
  onTitleSave: (title: string) => void;
  onStar: () => void;
  onBackgroundPicker: () => void;
  onArchive: () => void;
  // filter state passed through to panel
  filterKeyword: string;
  setFilterKeyword: (v: string) => void;
  filterLabels: string[];
  setFilterLabels: React.Dispatch<React.SetStateAction<string[]>>;
  filterDueDate: string[];
  setFilterDueDate: React.Dispatch<React.SetStateAction<string[]>>;
  filterStatus: string[];
  setFilterStatus: React.Dispatch<React.SetStateAction<string[]>>;
  filterActivity: string[];
  setFilterActivity: React.Dispatch<React.SetStateAction<string[]>>;
  allLabels: Label[];
  clearAllFilters: () => void;
}

export default function BoardHeader({
  board, canEdit, role, hasActiveFilters, filterOpen, onFilterToggle, onFilterClose,
  onTitleSave, onStar, onBackgroundPicker, onArchive,
  filterKeyword, setFilterKeyword,
  filterLabels, setFilterLabels,
  filterDueDate, setFilterDueDate,
  filterStatus, setFilterStatus,
  filterActivity, setFilterActivity,
  allLabels, clearAllFilters,
}: BoardHeaderProps) {
  const navigate = useNavigate();
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleValue, setTitleValue] = useState(board.title);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    setTitleValue(board.title);
  }, [board.title]);

  const handleTitleSubmit = () => {
    const val = titleValue.trim();
    if (val && val !== board.title) onTitleSave(val);
    else setTitleValue(board.title);
    setEditingTitle(false);
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-black/25 backdrop-blur-md shrink-0 relative z-20 text-white">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate('/boards')}
        className="gap-1.5 text-white/90 hover:text-white hover:bg-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        Boards
      </Button>
      <div className="w-px h-6 bg-white/20" />

      {editingTitle ? (
        <input
          value={titleValue}
          onChange={(e) => setTitleValue(e.target.value)}
          onBlur={handleTitleSubmit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleTitleSubmit();
            if (e.key === 'Escape') { setTitleValue(board.title); setEditingTitle(false); }
          }}
          className="text-lg font-bold bg-secondary/50 px-2 py-1 rounded-lg border border-primary/30 outline-none"
          autoFocus
        />
      ) : (
        <h1
          className="text-lg font-bold cursor-pointer hover:bg-white/10 px-2 py-1 rounded-lg transition-colors text-white"
          onClick={() => canEdit && setEditingTitle(true)}
        >
          {board.title}
        </h1>
      )}

      {board.key && (
        <span className="text-xs font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/10">
          {board.key}
        </span>
      )}

      <button
        onClick={onStar}
        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
      >
        <Star className={`w-4 h-4 ${board.starred ? 'fill-yellow-300 text-yellow-300' : 'text-white/60'}`} />
      </button>

      <div className="flex-1" />

      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onFilterToggle}
          className={`gap-1.5 text-white/90 hover:text-white hover:bg-white/10 ${hasActiveFilters ? 'bg-white/15' : ''}`}
        >
          <Filter className="w-4 h-4" />
          Filter
          {hasActiveFilters && (
            <span className="w-4 h-4 rounded-full bg-white text-black text-[10px] flex items-center justify-center font-bold">!</span>
          )}
        </Button>
        {filterOpen && (
          <BoardFilterPanel
            filterKeyword={filterKeyword} setFilterKeyword={setFilterKeyword}
            filterLabels={filterLabels} setFilterLabels={setFilterLabels}
            filterDueDate={filterDueDate} setFilterDueDate={setFilterDueDate}
            filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterActivity={filterActivity} setFilterActivity={setFilterActivity}
            allLabels={allLabels}
            hasActiveFilters={hasActiveFilters}
            clearAllFilters={clearAllFilters}
            onClose={onFilterClose}
          />
        )}
      </div>

      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMenu(v => !v)}
          className="text-white/90 hover:text-white hover:bg-white/10"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
        {showMenu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
            <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl p-1 z-20 min-w-[220px] animate-slide-down">
              <button
                onClick={() => { onBackgroundPicker(); setShowMenu(false); }}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-secondary/60 rounded-md transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                Change background
              </button>
              {role === 'owner' && (
                <button
                  onClick={() => { onArchive(); setShowMenu(false); }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Archive board
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
