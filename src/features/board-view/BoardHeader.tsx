import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, MoreHorizontal, Filter, Image as ImageIcon, Trash2, Pencil, Check, X, UserPlus, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Board, BoardRole, Label } from '@/types/board';
import BoardFilterPanel from './BoardFilterPanel';
import { generateBoardKey } from '@/utils/board';

type Setter<T> = T | ((prev: T) => T);

interface BoardMember {
  userId: string;
  display_name: string | null;
  email: string | null;
}

const MEMBER_COLORS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899'];
function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}
function initials(name: string | null, email: string | null) {
  const src = name || email || '?';
  return (src.split(/\s|@/)[0]?.[0] ?? '?').toUpperCase();
}

interface BoardHeaderProps {
  board: Board;
  canEdit: boolean;
  role: BoardRole | null;
  members: BoardMember[];
  hasActiveFilters: boolean;
  filterOpen: boolean;
  onFilterToggle: () => void;
  onFilterClose: () => void;
  onTitleSave: (title: string) => void;
  onKeySave: (key: string) => void;
  onStar: () => void;
  onInvite: () => void;
  onBackgroundPicker: () => void;
  onArchive: () => void;
  filterKeyword: string;
  setFilterKeyword: (v: string) => void;
  filterLabels: string[];
  setFilterLabels: (v: Setter<string[]>) => void;
  filterDueDate: string[];
  setFilterDueDate: (v: Setter<string[]>) => void;
  filterStatus: string[];
  setFilterStatus: (v: Setter<string[]>) => void;
  filterActivity: string[];
  setFilterActivity: (v: Setter<string[]>) => void;
  allLabels: Label[];
  clearAllFilters: () => void;
}

export default function BoardHeader({
  board, canEdit, role, members, hasActiveFilters, filterOpen, onFilterToggle, onFilterClose,
  onTitleSave, onKeySave, onStar, onInvite, onBackgroundPicker, onArchive,
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
  const [editingKey, setEditingKey] = useState(false);
  const [keyValue, setKeyValue] = useState(board.key ?? '');
  const [showMenu, setShowMenu] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const membersRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setTitleValue(board.title); }, [board.title]);
  useEffect(() => { setKeyValue(board.key ?? ''); }, [board.key]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showMenu) { setShowMenu(false); return; }
      if (showMembersPanel) { setShowMembersPanel(false); return; }
      if (filterOpen) { onFilterClose(); }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showMenu, showMembersPanel, filterOpen, onFilterClose]);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  useEffect(() => {
    if (!showMembersPanel) return;
    const handler = (e: MouseEvent) => { if (!membersRef.current?.contains(e.target as Node)) setShowMembersPanel(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMembersPanel]);

  useEffect(() => {
    if (!filterOpen) return;
    const handler = (e: MouseEvent) => { if (!filterRef.current?.contains(e.target as Node)) onFilterClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [filterOpen, onFilterClose]);

  const handleTitleSubmit = () => {
    const val = titleValue.trim();
    if (val && val !== board.title) onTitleSave(val);
    else setTitleValue(board.title);
    setEditingTitle(false);
  };

  const handleKeySubmit = () => {
    const val = keyValue.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (val && val !== board.key) onKeySave(val);
    else setKeyValue(board.key ?? '');
    setEditingKey(false);
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

      {/* Board key badge — click to edit */}
      {editingKey ? (
        <div className="flex items-center gap-1">
          <input
            value={keyValue}
            onChange={(e) => setKeyValue(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
            onBlur={handleKeySubmit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleKeySubmit();
              if (e.key === 'Escape') { setKeyValue(board.key ?? ''); setEditingKey(false); }
            }}
            className="w-20 text-xs font-mono bg-white/10 text-white px-1.5 py-0.5 rounded border border-white/30 outline-none uppercase"
            maxLength={8}
            autoFocus
          />
          <button onClick={handleKeySubmit} className="p-0.5 rounded hover:bg-white/10 transition-colors">
            <Check className="w-3 h-3 text-white/70" />
          </button>
          <button onClick={() => { setKeyValue(board.key ?? ''); setEditingKey(false); }} className="p-0.5 rounded hover:bg-white/10 transition-colors">
            <X className="w-3 h-3 text-white/70" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => canEdit && setEditingKey(true)}
          className="group flex items-center gap-1 text-xs font-mono text-white/40 px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 transition-colors"
          title="Click to edit board key"
        >
          {board.key || generateBoardKey(board.title)}
          {canEdit && <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />}
        </button>
      )}

      <button onClick={onStar} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
        <Star className={`w-4 h-4 ${board.starred ? 'fill-yellow-300 text-yellow-300' : 'text-white/60'}`} />
      </button>

      <div className="flex-1" />

      {/* Member avatars */}
      {members.length > 0 && (
        <div className="flex items-center -space-x-2">
          {members.slice(0, 4).map((m) => (
            <div
              key={m.userId}
              title={m.display_name || m.email || m.userId}
              className="w-7 h-7 rounded-full border-2 border-black/20 flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ backgroundColor: avatarColor(m.userId) }}
            >
              {initials(m.display_name, m.email)}
            </div>
          ))}
          {members.length > 4 && (
            <div className="w-7 h-7 rounded-full border-2 border-black/20 bg-white/20 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
              +{members.length - 4}
            </div>
          )}
        </div>
      )}

      <Button
        size="sm"
        onClick={onInvite}
        className="gap-1.5 text-xs h-8 bg-white/15 text-white border border-white/25 hover:bg-white/25"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Invite
      </Button>

      {/* Members panel */}
      <div className="relative" ref={membersRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMembersPanel(v => !v)}
          className="gap-1.5 text-white/90 hover:text-white hover:bg-white/10"
        >
          <Users className="w-4 h-4" />
          Members
          {members.length > 0 && (
            <span className="text-[10px] bg-white/20 rounded-full px-1.5">{members.length}</span>
          )}
        </Button>
        {showMembersPanel && (
            <div className="absolute top-full right-0 mt-1 w-64 bg-card border border-border rounded-xl shadow-2xl z-50 animate-slide-down text-foreground overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                <span className="text-sm font-semibold">Members ({members.length})</span>
                <button onClick={() => setShowMembersPanel(false)} className="p-1 rounded hover:bg-secondary transition-colors">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              {members.length > 0 ? (
                <div className="py-1 max-h-64 overflow-y-auto">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-2.5 px-4 py-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: avatarColor(m.userId) }}
                      >
                        {initials(m.display_name, m.email)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.display_name || m.email}</p>
                        {m.display_name && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground px-4 py-4">No members yet. Invite someone!</p>
              )}
            </div>
        )}
      </div>

      <div className="relative" ref={filterRef}>
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

      <div className="relative" ref={menuRef}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowMenu(v => !v)}
          className="text-white/90 hover:text-white hover:bg-white/10"
        >
          <MoreHorizontal className="w-4 h-4" />
        </Button>
        {showMenu && (
          <div className="absolute top-full right-0 mt-1 bg-popover border border-border rounded-lg shadow-xl p-1 z-50 min-w-[220px] animate-slide-down">
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
        )}
      </div>

    </div>
  );
}
