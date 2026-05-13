import { X, Shield, User, Eye, Check, Loader2 } from 'lucide-react'
import type { BoardRole, BoardMember } from '@/types/board'
import { getAvatarColor, getUserInitials } from '@/utils/user'
import { Button } from '@/components/ui/button'
import { useState } from 'react'

interface EditMemberRoleModalProps {
  member: BoardMember
  currentRole: BoardRole
  onSave: (newRole: BoardRole) => Promise<void>
  onClose: () => void
}

const ROLES: { value: BoardRole; label: string; icon: any; description: string }[] = [
  {
    value: 'admin',
    label: 'Admin',
    icon: Shield,
    description: 'Can manage members, lists, and cards.',
  },
  {
    value: 'member',
    label: 'Member',
    icon: User,
    description: 'Can create and edit lists and cards.',
  },
  {
    value: 'observer',
    label: 'Observer',
    icon: Eye,
    description: 'Can only view cards and add comments.',
  },
]

export default function EditMemberRoleModal({
  member,
  currentRole,
  onSave,
  onClose,
}: EditMemberRoleModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<BoardRole>(currentRole)

  const handleSave = async () => {
    if (selectedRole === currentRole) {
      onClose()
      return
    }
    setLoading(true)
    try {
      await onSave(selectedRole)
      onClose()
    } catch (err) {
      // toast is handled in parent BoardMembersPanel
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay z-[100] px-4" onClick={onClose}>
      <div
        className="modal-content bg-card text-card-foreground border border-border/40 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-card/80 backdrop-blur-sm z-10 py-1">
          <h2 className="text-xl font-bold tracking-tight">Edit Member Role</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-4 p-4 bg-secondary/20 rounded-2xl border border-border/30 mb-6">
          {member.avatar_url ? (
            <img
              src={member.avatar_url}
              alt=""
              className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shadow-sm"
            />
          ) : (
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold border-2 border-primary/20 shadow-sm"
              style={{ backgroundColor: getAvatarColor(member.userId) }}
            >
              {getUserInitials(member.display_name, member.email)}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-lg truncate text-foreground">
              {member.display_name || member.email}
            </p>
            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
          </div>
        </div>

        <div className="space-y-3 mb-8">
          {ROLES.map((r) => {
            const Icon = r.icon
            const isSelected = selectedRole === r.value
            return (
              <button
                key={r.value}
                onClick={() => setSelectedRole(r.value)}
                className={`group w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left ${
                  isSelected
                    ? 'bg-primary/10 border-primary ring-1 ring-primary'
                    : 'border-border/40 hover:bg-secondary/40 hover:border-border'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-md'
                      : 'bg-secondary text-muted-foreground group-hover:text-foreground'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`font-bold transition-colors ${isSelected ? 'text-foreground' : 'text-foreground/80'}`}
                    >
                      {r.label}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {r.description}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        <div className="flex gap-3 sticky bottom-0 bg-card/80 backdrop-blur-sm pt-2 pb-1">
          <Button
            variant="ghost"
            className="flex-1 h-12 rounded-2xl font-semibold"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            className="flex-1 h-12 rounded-2xl shadow-lg shadow-primary/20 font-bold"
            disabled={loading}
            onClick={handleSave}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}
