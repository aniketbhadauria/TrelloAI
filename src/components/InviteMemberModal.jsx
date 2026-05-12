import { useState } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import { useDebouncedCallback } from '../hooks/useDebouncedCallback';

const MEMBER_COLORS = ['#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#f97316','#ef4444','#ec4899'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}
function Initials({ name }) {
  const label = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ backgroundColor: avatarColor(name) }}>
      {label}
    </div>
  );
}

const ROLE_DESCRIPTIONS = {
  admin: 'Can edit the board and manage members.',
  member: 'Can view and edit cards and lists.',
  observer: 'Can view the board but cannot make changes.',
};

export default function InviteMemberModal({ boardId, existingMemberIds = [], onClose, onInvited }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [selected, setSelected] = useState(null);
  const [role, setRole] = useState('member');
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState(null);

  const search = useDebouncedCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    const { data, error: err } = await supabase
      .from('app_users')
      .select('id, display_name, email')
      .or(`display_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10);
    setSearching(false);
    if (err) { logError('User search failed', { message: err.message }); return; }
    setResults(data || []);
  }, 300);

  const handleQueryChange = (e) => {
    setQuery(e.target.value);
    setSelected(null);
    search.run(e.target.value);
  };

  const selectUser = (u) => {
    setSelected(u);
    setQuery(u.display_name || u.email);
    setResults([]);
  };

  const handleInvite = async () => {
    if (!selected) return;
    setInviting(true);
    setError(null);
    const { error: err } = await supabase.from('board_members').insert({
      board_id: boardId,
      user_id: selected.id,
      role,
    });
    setInviting(false);
    if (err) {
      setError(err.message);
      logError('Failed to invite member', { message: err.message });
      return;
    }
    onInvited?.({ ...selected, role });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl p-5 w-full max-w-md mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">Invite to board</h3>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          value={query}
          onChange={handleQueryChange}
          placeholder="Search by name or email..."
          className="w-full h-9 px-3 text-sm bg-secondary/40 border border-border/50 rounded-lg outline-none focus:border-primary/50 transition-colors mb-2"
          autoFocus
        />

        {searching && <p className="text-xs text-muted-foreground mb-2">Searching…</p>}

        {results.length > 0 && !selected && (
          <div className="border border-border/50 rounded-lg overflow-hidden mb-3 max-h-48 overflow-y-auto">
            {results.map(u => {
              const alreadyAdded = existingMemberIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  disabled={alreadyAdded}
                  onClick={() => selectUser(u)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                    alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-secondary/40'
                  }`}
                >
                  <Initials name={u.display_name || u.email} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{u.display_name || u.email}</p>
                    {u.display_name && (
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    )}
                  </div>
                  {alreadyAdded && (
                    <span className="ml-auto text-xs text-muted-foreground shrink-0">Added</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {selected && (
          <div className="mb-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Role</p>
            <div className="flex gap-2">
              {['admin', 'member', 'observer'].map(r => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors capitalize ${
                    role === r
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border/50 hover:bg-secondary/40'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[role]}</p>
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-border/50 hover:bg-secondary/40 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={!selected || inviting}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {inviting ? 'Adding…' : 'Add to board'}
          </button>
        </div>
      </div>
    </div>
  );
}
