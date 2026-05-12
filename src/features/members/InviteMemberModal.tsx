import { useState, useEffect } from 'react';
import { X, Search, UserPlus, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { apiSearchUsers, apiInviteMember, apiFetchBoardMembers } from '@/api/members';
import type { BoardRole } from '@/types/board';

interface Props {
  boardId: string;
  ownerId: string | undefined;
  onClose: () => void;
}

const ROLES: { value: BoardRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'observer', label: 'Observer' },
];

const MEMBER_COLORS = ['#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#f97316','#ef4444','#ec4899'];

function avatarColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}

function initials(name: string | null, email: string | null) {
  const src = name || email || '?';
  return src.split(/\s|@/)[0]?.[0]?.toUpperCase() ?? '?';
}

export default function InviteMemberModal({ boardId, ownerId, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Awaited<ReturnType<typeof apiSearchUsers>>>([]);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set(ownerId ? [ownerId] : []));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [role, setRole] = useState<BoardRole>('member');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    apiFetchBoardMembers(boardId).then(members => {
      setExistingIds(new Set([ownerId, ...members.map(m => m.userId)].filter(Boolean) as string[]));
    });
  }, [boardId, ownerId]);

  useEffect(() => {
    if (!query.trim()) { setResults([]); return; }
    const t = setTimeout(() => apiSearchUsers(query).then(setResults), 300);
    return () => clearTimeout(t);
  }, [query]);

  const handleInvite = async () => {
    if (!selectedId) return;
    setLoading(true);
    try {
      await apiInviteMember(boardId, selectedId, role);
      setDone(true);
      setExistingIds(prev => new Set([...prev, selectedId]));
      setSelectedId(null);
      setQuery('');
      setResults([]);
      setTimeout(() => setDone(false), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Invite to board
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedId(null); }}
            placeholder="Search by name or email…"
            className="pl-9"
            autoFocus
          />
        </div>

        {results.length > 0 && (
          <div className="border border-border rounded-xl overflow-hidden mb-3">
            {results.map(u => {
              const isExisting = existingIds.has(u.id);
              const isSelected = selectedId === u.id;
              return (
                <button
                  key={u.id}
                  disabled={isExisting}
                  onClick={() => setSelectedId(isSelected ? null : u.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    isExisting
                      ? 'opacity-50 cursor-not-allowed bg-secondary/20'
                      : isSelected
                      ? 'bg-primary/10'
                      : 'hover:bg-secondary/40'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: avatarColor(u.id) }}
                  >
                    {initials(u.display_name, u.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name || u.email}</p>
                    {u.display_name && <p className="text-xs text-muted-foreground truncate">{u.email}</p>}
                  </div>
                  {isExisting && <span className="text-xs text-muted-foreground">Added</span>}
                  {isSelected && !isExisting && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        )}

        {selectedId && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-muted-foreground">Role:</span>
            <div className="flex gap-1">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${
                    role === r.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {done && (
          <p className="text-sm text-green-500 mb-3 flex items-center gap-1.5">
            <Check className="w-4 h-4" /> Member invited successfully
          </p>
        )}

        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button className="flex-1" disabled={!selectedId || loading} onClick={handleInvite}>
            {loading ? 'Inviting…' : 'Invite'}
          </Button>
        </div>
      </div>
    </div>
  );
}
