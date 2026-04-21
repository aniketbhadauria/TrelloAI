import { useEffect, useMemo, useState } from 'react';
import { useBoards } from '../context/BoardContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Users, Search, UserPlus } from 'lucide-react';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';

function getInitials(name) {
  if (!name) return 'U';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getColor(seed) {
  const colors = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#f97316', '#ef4444', '#ec4899'];
  let hash = 0;
  for (const ch of seed || 'user') hash = ch.codePointAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function normEmail(s) {
  return (s || '').trim().toLowerCase() || null;
}
function normName(s) {
  return (s || '').trim().toLowerCase() || null;
}

/** Merge rows that share the same id, email, or name (Trello-style duplicate cleanup). */
function dedupeCollaborators(list) {
  if (list.length < 2) return list;
  const n = list.length;
  const parent = list.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  const merge = (a, b) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  };
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = list[i];
      const b = list[j];
      if (a.id && b.id && a.id === b.id) {
        merge(i, j);
        continue;
      }
      const e1 = normEmail(a.email);
      const e2 = normEmail(b.email);
      if (e1 && e2 && e1 === e2) {
        merge(i, j);
        continue;
      }
      const n1 = normName(a.name);
      const n2 = normName(b.name);
      if (n1 && n2 && n1 === n2) merge(i, j);
    }
  }
  const byRoot = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r).push(list[i]);
  }
  return [...byRoot.values()].map((group) => {
    const boardsCount = group.reduce((m, x) => Math.max(m, x.boardsCount), 0);
    const id = group.map((m) => m.id).find(Boolean) || null;
    const email = group.map((m) => m.email).find(Boolean) || null;
    const name =
      group.map((m) => m.name).find((n) => n && n !== 'Unknown') || group[0].name;
    return {
      key: id || normEmail(email) || normName(name) || group[0].key,
      id,
      name,
      email,
      boardsCount,
    };
  });
}

export default function Collaborators() {
  const { boards } = useBoards();
  const { user } = useAuth();
  const [directoryUsers, setDirectoryUsers] = useState([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('app_users')
      .select('id,email,display_name,updated_at')
      .order('updated_at', { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load collaborators:', error.message);
          return;
        }
        setDirectoryUsers(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const boardMemberStats = useMemo(() => {
    const stats = new Map();
    for (const board of boards) {
      const seenInBoard = new Set();
      for (const list of board.lists || []) {
        for (const card of list.cards || []) {
          for (const member of card.members || []) {
            const key = member.id || (member.name || '').trim().toLowerCase();
            if (!key) continue;
            if (!stats.has(key)) {
              stats.set(key, {
                key,
                id: member.id || null,
                name: member.name || 'Unknown',
                email: member.email || null,
                boardsCount: 0,
              });
            }
            if (!seenInBoard.has(key)) {
              stats.get(key).boardsCount += 1;
              seenInBoard.add(key);
            }
          }
        }
      }
    }
    return stats;
  }, [boards]);

  const collaborators = useMemo(() => {
    const merged = new Map(boardMemberStats);
    for (const usr of directoryUsers) {
      const key = usr.id || usr.email || (usr.display_name || '').trim().toLowerCase();
      if (!key) continue;
      const existing = merged.get(key);
      if (existing) {
        existing.id = existing.id || usr.id || null;
        existing.email = existing.email || usr.email || null;
        existing.name = existing.name || usr.display_name || usr.email || 'Unknown';
      } else {
        merged.set(key, {
          key,
          id: usr.id || null,
          email: usr.email || null,
          name: usr.display_name || usr.email || 'Unknown',
          boardsCount: 0,
        });
      }
    }
    const q = query.trim().toLowerCase();
    const raw = [...merged.values()];
    const deduped = dedupeCollaborators(raw);
    return deduped
      .filter((member) => {
        if (!q) return true;
        return (
          (member.name || '').toLowerCase().includes(q) ||
          (member.email || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.boardsCount - a.boardsCount || a.name.localeCompare(b.name));
  }, [boardMemberStats, directoryUsers, query]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto page-enter">
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-muted-foreground" />
            Collaborators
            <span className="text-sm text-muted-foreground font-medium">{collaborators.length}</span>
          </h1>
          <Button type="button" className="gap-2">
            <UserPlus className="w-4 h-4" />
            Invite Workspace members
          </Button>
        </div>
        <p className="text-muted-foreground mt-2">Mapped from existing workspace members and card assignments.</p>
      </div>

      <div className="border border-border/60 rounded-xl bg-card/70">
        <div className="p-4 border-b border-border/50">
          <div className="relative max-w-xs">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by name"
              className="pl-9"
            />
          </div>
        </div>

        <div className="divide-y divide-border/40">
          {collaborators.map((member) => {
            const isCurrentUser = !!(user?.id && member.id === user.id);
            return (
              <div key={member.key} className="flex items-center gap-4 px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: getColor(member.id || member.email || member.name) }}>
                  {getInitials(member.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold truncate">
                    {member.name}
                    {isCurrentUser ? <span className="text-xs text-muted-foreground ml-1">(you)</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{member.email || 'No email recorded'}</p>
                </div>
                <div className="text-xs rounded-md bg-secondary/60 px-2 py-1 min-w-[84px] text-center">
                  Boards ({member.boardsCount})
                </div>
                <div className="text-xs rounded-md bg-secondary/60 px-2 py-1 min-w-[72px] text-center">
                  Admin
                </div>
              </div>
            );
          })}
          {collaborators.length === 0 && (
            <div className="px-4 py-8 text-sm text-muted-foreground text-center">No collaborators found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
