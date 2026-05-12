import { useState, useEffect } from 'react';
import { X, Crown, Shield, User, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { logError } from '../lib/logger';
import { useAuth } from '../context/AuthContext';
import InviteMemberModal from './InviteMemberModal';

const MEMBER_COLORS = ['#8b5cf6','#3b82f6','#06b6d4','#10b981','#f59e0b','#f97316','#ef4444','#ec4899'];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return MEMBER_COLORS[Math.abs(h) % MEMBER_COLORS.length];
}
function Avatar({ name }) {
  const label = (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ backgroundColor: avatarColor(name) }}>
      {label}
    </div>
  );
}

const ROLE_META = {
  owner:    { label: 'Owner',    Icon: Crown,  color: 'text-yellow-500' },
  admin:    { label: 'Admin',    Icon: Shield, color: 'text-blue-500'   },
  member:   { label: 'Member',   Icon: User,   color: 'text-green-500'  },
  observer: { label: 'Observer', Icon: Eye,    color: 'text-muted-foreground' },
};

export default function BoardMembersPanel({ boardId, ownerId, ownerName, currentUserRole, onClose, onMembersChange }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    (async () => {
      const { data: memberships, error: mErr } = await supabase
        .from('board_members')
        .select('user_id, role, invited_at')
        .eq('board_id', boardId);

      if (cancelled) return;
      if (mErr) { logError('Failed to load board members', { message: mErr.message }); setLoading(false); return; }

      const userIds = (memberships || []).map(m => m.user_id);
      let profiles = [];
      if (userIds.length > 0) {
        const { data: p } = await supabase
          .from('app_users')
          .select('id, display_name, email')
          .in('id', userIds);
        profiles = p || [];
      }

      if (cancelled) return;
      setMembers((memberships || []).map(m => ({
        ...m,
        profile: profiles.find(p => p.id === m.user_id) || null,
      })));
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [boardId]);

  const handleRoleChange = async (userId, newRole) => {
    const { error } = await supabase
      .from('board_members')
      .update({ role: newRole })
      .eq('board_id', boardId)
      .eq('user_id', userId);
    if (error) { logError('Failed to update role', { message: error.message }); return; }
    setMembers(prev => prev.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
  };

  const handleRemove = async (userId) => {
    const { error } = await supabase
      .from('board_members')
      .delete()
      .eq('board_id', boardId)
      .eq('user_id', userId);
    if (error) { logError('Failed to remove member', { message: error.message }); return; }
    setMembers(prev => prev.filter(m => m.user_id !== userId));
    onMembersChange?.();
    if (userId === user?.id) onClose();
  };

  const existingMemberIds = [ownerId, ...members.map(m => m.user_id)];
  const ownerDisplayName = ownerName || (user?.id === ownerId
    ? (user?.user_metadata?.full_name || user?.email)
    : 'Board owner');

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div
          className="modal-content bg-card border border-border rounded-2xl p-5 w-full max-w-sm mx-4 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Board members</h3>
            <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center py-6">
              <div className="w-5 h-5 border-2 border-pink-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-1 mb-4">
              {/* Owner row — always first, not editable */}
              <div className="flex items-center gap-3 px-1 py-2 rounded-lg">
                <Avatar name={ownerDisplayName} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">
                    {ownerDisplayName}
                    {user?.id === ownerId && <span className="text-muted-foreground font-normal"> (you)</span>}
                  </p>
                </div>
                <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 shrink-0">
                  <Crown className="w-3.5 h-3.5" /> Owner
                </span>
              </div>

              {members.map(m => {
                const name = m.profile?.display_name || m.profile?.email || 'Unknown';
                const meta = ROLE_META[m.role] || ROLE_META.member;
                const isMe = m.user_id === user?.id;
                return (
                  <div key={m.user_id} className="flex items-center gap-3 px-1 py-2 rounded-lg hover:bg-secondary/30 group">
                    <Avatar name={name} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {name}{isMe && <span className="text-muted-foreground font-normal"> (you)</span>}
                      </p>
                      {m.profile?.display_name && (
                        <p className="text-xs text-muted-foreground truncate">{m.profile.email}</p>
                      )}
                    </div>
                    {canManage ? (
                      <select
                        value={m.role}
                        onChange={e => handleRoleChange(m.user_id, e.target.value)}
                        className="text-xs border border-border/50 rounded-md px-1.5 py-1 bg-secondary/40 outline-none focus:border-primary/50 cursor-pointer"
                      >
                        <option value="admin">Admin</option>
                        <option value="member">Member</option>
                        <option value="observer">Observer</option>
                      </select>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs font-medium shrink-0 ${meta.color}`}>
                        <meta.Icon className="w-3.5 h-3.5" />
                        {meta.label}
                      </span>
                    )}
                    {(canManage || isMe) && (
                      <button
                        onClick={() => handleRemove(m.user_id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-muted-foreground hover:text-red-500"
                        title={isMe && !canManage ? 'Leave board' : 'Remove'}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {canManage && (
            <button
              onClick={() => setShowInvite(true)}
              className="w-full py-2 text-sm text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
            >
              + Invite member
            </button>
          )}
        </div>
      </div>

      {showInvite && (
        <InviteMemberModal
          boardId={boardId}
          existingMemberIds={existingMemberIds}
          onClose={() => setShowInvite(false)}
          onInvited={(newMember) => {
            setMembers(prev => [...prev, {
              user_id: newMember.id,
              role: newMember.role,
              invited_at: new Date().toISOString(),
              profile: { id: newMember.id, display_name: newMember.display_name, email: newMember.email },
            }]);
            onMembersChange?.();
          }}
        />
      )}
    </>
  );
}
