import { X, Trash2, Shield, User, Eye, MoreVertical } from 'lucide-react'
import type { BoardRole, BoardMember } from '@/types/board'
import { getAvatarColor, getUserInitials } from '@/utils/user'

interface BoardMembersPanelProps {
  boardId: string
  members: BoardMember[]
  role: BoardRole | null
  ownerId: string | undefined
  onRemoveMember?: (userId: string) => void
  onUpdateRole?: (userId: string, newRole: BoardRole) => void
  onEditMember?: (member: BoardMember) => void
  onClose: () => void
}

const ROLE_ICONS = {
  admin: Shield,
  member: User,
  observer: Eye,
  owner: Shield,
}

export default function BoardMembersPanel({
  members,
  role,
  ownerId,
  onRemoveMember,
  onEditMember,
  onClose,
}: BoardMembersPanelProps) {
  return (
    <div className="absolute top-full right-0 mt-1 w-80 bg-card border border-border/40 rounded-2xl shadow-2xl z-50 animate-slide-down text-foreground overflow-hidden backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-secondary/10">
        <span className="text-sm font-bold">Board Members ({members.length})</span>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-secondary transition-colors">
          <X className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
      {members.length > 0 ? (
        <div className="py-2 max-h-96 overflow-y-auto">
          {members.map((m) => {
            const Icon = ROLE_ICONS[m.role || 'member']
            const isOwner = m.userId === ownerId
            const canManage = (role === 'owner' || role === 'admin') && !isOwner

            return (
              <div
                key={m.userId}
                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-secondary/40 transition-colors"
              >
                {m.avatar_url ? (
                  <img
                    src={m.avatar_url}
                    alt={m.display_name || ''}
                    className="w-10 h-10 rounded-full object-cover shrink-0 shadow-sm border border-border/20"
                  />
                ) : (
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm"
                    style={{ backgroundColor: getAvatarColor(m.userId) }}
                  >
                    {getUserInitials(m.display_name, m.email)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold truncate text-foreground/90">
                      {m.display_name || m.email}
                    </p>
                    {isOwner && (
                      <span className="text-[8px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Owner
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Icon className="w-3 h-3 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground capitalize">
                      {m.role || 'member'}
                    </span>
                  </div>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onEditMember?.(m)}
                      className="p-1.5 rounded-lg hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                      title="Manage member"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveMember?.(m.userId)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                      title="Remove from board"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground px-4 py-6 text-center italic">
          No members yet. Invite someone!
        </p>
      )}
    </div>
  )
}
