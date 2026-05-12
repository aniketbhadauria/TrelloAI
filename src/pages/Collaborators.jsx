import { useEffect, useMemo, useState } from 'react';
import { useBoards } from '../context/BoardContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Search, UserPlus, X, Loader2, Pencil, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { cn } from '../lib/utils';
import { logError } from '../lib/logger';

/* ── Helpers ─────────────────────────────────────────────────── */
function getInitials(name) {
  const str = String(name ?? '').trim();
  if (!str) return 'U';
  return str.split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

function getColor(seed) {
  const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899'];
  let hash = 0;
  for (const ch of seed || 'user') hash = ch.codePointAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function normEmail(s) { return (s || '').trim().toLowerCase() || null; }
function normName(s)  { return (s || '').trim().toLowerCase() || null; }

function deriveUserKey(identity) {
  if (!identity) return null;
  if (identity.id) return String(identity.id);
  const e = normEmail(identity.email);
  if (e) return e;
  const display = identity.name != null && String(identity.name).trim() !== '' ? identity.name : identity.display_name;
  return normName(display);
}

function dedupeCollaborators(list) {
  if (list.length < 2) return list;
  const n = list.length;
  const parent = list.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const merge = (a, b) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent[ra] = rb; };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = list[i]; const b = list[j];
      if (a.id && b.id && a.id === b.id) { merge(i, j); continue; }
      const e1 = normEmail(a.email); const e2 = normEmail(b.email);
      if (e1 && e2 && e1 === e2) { merge(i, j); continue; }
      const n1 = normName(a.name); const n2 = normName(b.name);
      if (n1 && n2 && n1 === n2) merge(i, j);
    }
  }
  const byRoot = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(list[i]);
  }
  return [...byRoot.values()].map((group) => ({
    key: group.map(m => m.id).find(Boolean) || normEmail(group.map(m => m.email).find(Boolean)) || normName(group[0].name) || group[0].key,
    id:         group.map(m => m.id).find(Boolean) || null,
    name:       group.map(m => m.name).find(n => n && n !== 'Unknown') || group[0].name,
    email:      group.map(m => m.email).find(Boolean) || null,
    role:       group.map(m => m.role).find(r => r != null && String(r).trim() !== '') || null,
    boardsCount: group.reduce((m, x) => Math.max(m, x.boardsCount), 0),
    directoryId: group.map(m => m.directoryId).find(Boolean) || null,
  }));
}

const ROLES = ['Member', 'Admin', 'Viewer', 'Guest'];

/* ── Invite Modal ────────────────────────────────────────────── */
function InviteModal({ onClose, onInvited }) {
  const [email, setEmail]       = useState('');
  const [name, setName]         = useState('');
  const [role, setRole]         = useState('Member');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError('Enter a valid email address.'); return; }

    setLoading(true);
    setError('');

    const { data, error: err } = await supabase
      .from('app_users')
      .upsert(
        { email: trimmedEmail, display_name: name.trim() || trimmedEmail.split('@')[0], role, updated_at: new Date().toISOString() },
        { onConflict: 'email', ignoreDuplicates: false }
      )
      .select('id,email,display_name,role,updated_at')
      .maybeSingle();

    setLoading(false);

    if (err) {
      logError('Failed to invite collaborator', { message: err.message });
      setError(err.message);
      return;
    }
    onInvited(data);
    onClose();
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-modal-title"
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="invite-modal-title" className="text-lg font-semibold">Invite to Workspace</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="invite-email" className="text-xs font-medium text-muted-foreground mb-1.5 block">Email address *</label>
            <Input
              id="invite-email"
              type="email"
              placeholder="colleague@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="invite-name" className="text-xs font-medium text-muted-foreground mb-1.5 block">Display name</label>
            <Input
              id="invite-name"
              placeholder="Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="invite-role" className="text-xs font-medium text-muted-foreground mb-1.5 block">Role</label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    role === r
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              {loading ? 'Adding…' : 'Add to Workspace'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Edit Modal ──────────────────────────────────────────────── */
function EditModal({ member, onClose, onSaved }) {
  const [email, setEmail]     = useState(member.email || '');
  const [name, setName]       = useState(member.name !== 'Unknown' ? member.name : '');
  const [role, setRole]       = useState(member.role || 'Member');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) { setError('Email is required.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError('Enter a valid email address.'); return; }

    setLoading(true);
    setError('');

    const { data, error: err } = await supabase
      .from('app_users')
      .update({ email: trimmedEmail, display_name: name.trim() || trimmedEmail.split('@')[0], role, updated_at: new Date().toISOString() })
      .eq('id', member.directoryId)
      .select('id,email,display_name,role,updated_at')
      .maybeSingle();

    setLoading(false);
    if (err) {
      logError('Failed to update collaborator', { message: err.message });
      setError(err.message);
      return;
    }
    onSaved(data);
    onClose();
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={e => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-modal-title"
        className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 id="edit-modal-title" className="text-lg font-semibold">Edit Member</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="edit-email" className="text-xs font-medium text-muted-foreground mb-1.5 block">Email address *</label>
            <Input
              id="edit-email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="edit-name" className="text-xs font-medium text-muted-foreground mb-1.5 block">Display name</label>
            <Input
              id="edit-name"
              placeholder="Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="edit-role" className="text-xs font-medium text-muted-foreground mb-1.5 block">Role</label>
            <div className="flex gap-2 flex-wrap">
              {ROLES.map(r => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                    role === r
                      ? 'bg-primary/15 border-primary/40 text-primary'
                      : 'bg-secondary/40 border-border/50 text-muted-foreground hover:text-foreground hover:border-border',
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 mt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={loading} className="gap-1.5">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Pencil className="w-3.5 h-3.5" />}
              {loading ? 'Saving…' : 'Save changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────── */
export default function Collaborators() {
  const { boards }  = useBoards();
  const { user }    = useAuth();
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [query, setQuery]       = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [removingId, setRemovingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('app_users')
      .select('id,email,display_name,role,updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) { logError('Failed to load collaborators', { message: error.message }); return; }
        setDirectoryUsers(data || []);
      });
    return () => { cancelled = true; };
  }, []);

  const boardMemberStats = useMemo(() => {
    const stats = new Map();
    for (const board of boards) {
      const seenInBoard = new Set();
      for (const list of board.lists || []) {
        for (const card of list.cards || []) {
          for (const member of card.members || []) {
            const key = deriveUserKey({ id: member.id, email: member.email, name: member.name });
            if (!key) continue;
            if (!stats.has(key)) {
              stats.set(key, { key, id: member.id || null, name: member.name || 'Unknown', email: member.email || null, role: member.role ?? null, boardsCount: 0, directoryId: null });
            }
            if (!seenInBoard.has(key)) { stats.get(key).boardsCount += 1; seenInBoard.add(key); }
          }
        }
      }
    }
    return stats;
  }, [boards]);

  const collaborators = useMemo(() => {
    const merged = new Map(boardMemberStats);
    for (const usr of directoryUsers) {
      const key = deriveUserKey(usr);
      if (!key) continue;
      const existing = merged.get(key);
      if (existing) {
        existing.id          = existing.id || usr.id || null;
        existing.email       = existing.email || usr.email || null;
        existing.name        = existing.name || usr.display_name || usr.email || 'Unknown';
        existing.role        = existing.role || usr.role || null;
        existing.directoryId = usr.id || null;
      } else {
        merged.set(key, { key, id: usr.id || null, email: usr.email || null, name: usr.display_name || usr.email || 'Unknown', role: usr.role ?? null, boardsCount: 0, directoryId: usr.id || null });
      }
    }
    const q = query.trim().toLowerCase();
    const raw = [...merged.values()];
    const deduped = dedupeCollaborators(raw);
    return deduped
      .filter(m => !q || (m.name || '').toLowerCase().includes(q) || (m.email || '').toLowerCase().includes(q))
      .sort((a, b) => b.boardsCount - a.boardsCount || a.name.localeCompare(b.name));
  }, [boardMemberStats, directoryUsers, query]);

  function handleInvited(newUser) {
    if (!newUser) return;
    setDirectoryUsers(prev => {
      const idx = prev.findIndex(u => u.id === newUser.id || normEmail(u.email) === normEmail(newUser.email));
      if (idx !== -1) { const updated = [...prev]; updated[idx] = newUser; return updated; }
      return [newUser, ...prev];
    });
  }

  function handleSaved(updated) {
    if (!updated) return;
    setDirectoryUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  }

  async function handleRemove(member) {
    const dirId = member.directoryId;
    if (!dirId) return;
    setRemovingId(dirId);
    const { error } = await supabase.from('app_users').delete().eq('id', dirId);
    setRemovingId(null);
    if (error) { logError('Failed to delete collaborator', { message: error.message }); return; }
    setDirectoryUsers(prev => prev.filter(u => u.id !== dirId));
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto page-enter">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-muted-foreground" />
            Collaborators
            <span className="text-sm text-muted-foreground font-medium">{collaborators.length}</span>
          </h1>
          <Button type="button" className="gap-2" onClick={() => setShowInvite(true)}>
            <UserPlus className="w-4 h-4" aria-hidden />
            Invite member
          </Button>
        </div>
        <p className="text-muted-foreground mt-2">Workspace members from board assignments and your directory.</p>
      </div>

      <div className="border border-border/60 rounded-xl bg-card/70">
        <div className="p-4 border-b border-border/50">
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Filter by name or email"
              className="pl-9"
            />
          </div>
        </div>

        <div className="divide-y divide-border/40">
          {collaborators.map((member) => {
            const isCurrentUser = !!(user?.id && member.id === user.id);
            const roleText = typeof member.role === 'string' && member.role.trim() !== '' ? member.role.trim() : null;
            const canRemove = !!member.directoryId && !isCurrentUser;

            return (
              <div key={member.key} className="flex items-center gap-4 px-4 py-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: getColor(member.id || member.email || member.name) }}
                >
                  {getInitials(member.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {member.name}
                    {isCurrentUser && <span className="text-xs text-muted-foreground ml-1">(you)</span>}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{member.email || 'No email recorded'}</p>
                </div>

                <div className="text-xs rounded-md bg-secondary/60 px-2 py-1 min-w-[84px] text-center shrink-0">
                  Boards ({member.boardsCount})
                </div>

                <div className="text-xs rounded-md bg-secondary/60 px-2 py-1 min-w-[72px] text-center shrink-0">
                  {roleText ?? 'Member'}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canRemove ? (
                    <>
                      <button
                        onClick={() => setEditingMember(member)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                        title="Edit member"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      {removingId === member.directoryId ? (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground mx-1.5" />
                      ) : (
                        <button
                          onClick={() => handleRemove(member)}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title="Remove from workspace"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="w-16" />
                  )}
                </div>
              </div>
            );
          })}
          {collaborators.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">No collaborators found.</div>
          )}
        </div>
      </div>

      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onInvited={handleInvited} />}
      {editingMember && <EditModal member={editingMember} onClose={() => setEditingMember(null)} onSaved={handleSaved} />}
    </div>
  );
}
