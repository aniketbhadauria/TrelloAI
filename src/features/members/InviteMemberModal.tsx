import { useState, useEffect } from 'react'
import { X, Search, UserPlus, Check, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { apiSearchUsers, apiInviteMember, apiFetchBoardMembers } from '@/api/members'
import { sendNotification } from '@/context/NotificationContext'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'
import type { BoardRole } from '@/types/board'
import { getAvatarColor, getUserInitials } from '@/utils/user'

interface Props {
  boardId: string
  boardTitle: string
  ownerId: string | undefined
  onClose: () => void
}

const ROLES: { value: BoardRole; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
  { value: 'observer', label: 'Observer' },
]

export default function InviteMemberModal({ boardId, boardTitle, ownerId, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Awaited<ReturnType<typeof apiSearchUsers>>>([])
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set(ownerId ? [ownerId] : []))
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [role, setRole] = useState<BoardRole>('member')
  const [loading, setLoading] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    apiFetchBoardMembers(boardId).then((members) => {
      setExistingIds(
        new Set([ownerId, ...members.map((m) => m.userId)].filter(Boolean) as string[])
      )
    })
  }, [boardId, ownerId])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    const t = setTimeout(() => apiSearchUsers(query).then(setResults), 300)
    return () => clearTimeout(t)
  }, [query])

  const toggleSelection = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const handleInviteAll = async () => {
    if (selectedIds.size === 0) return
    setLoading(true)
    try {
      const actorName =
        user?.user_metadata?.display_name ||
        user?.user_metadata?.full_name ||
        user?.email ||
        'Someone'

      const promises = Array.from(selectedIds).map(async (id) => {
        await apiInviteMember(boardId, id, role)
        const invitedUser = results.find((u) => u.id === id)
        if (invitedUser?.email) {
          void sendNotification({
            userEmail: invitedUser.email,
            title: `Invitation to ${boardTitle}`,
            body: `${actorName} invited you to join the board "${boardTitle}"`,
            boardId,
          })
        }
      })

      await Promise.all(promises)

      setExistingIds((prev) => new Set([...prev, ...Array.from(selectedIds)]))
      setSelectedIds(new Set())
      setQuery('')
      setResults([])
      toast.success(`Successfully invited ${promises.length} member(s)`)
    } catch (err) {
      toast.error('Failed to invite some members. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content bg-card border border-border rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />
            Invite to board
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="pl-9 bg-secondary/20 border-transparent focus:border-primary/30 transition-all"
            autoFocus
          />
        </div>

        {results.length > 0 && (
          <div className="border border-border/40 rounded-xl overflow-hidden mb-3 bg-secondary/5">
            {results.map((u) => {
              const isExisting = existingIds.has(u.id)
              const isSelected = selectedIds.has(u.id)
              return (
                <button
                  key={u.id}
                  disabled={isExisting}
                  onClick={() => toggleSelection(u.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-all ${
                    isExisting
                      ? 'opacity-50 cursor-not-allowed bg-secondary/10'
                      : isSelected
                        ? 'bg-primary/10'
                        : 'hover:bg-secondary/40'
                  }`}
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={u.display_name || ''}
                      className="w-8 h-8 rounded-full object-cover shrink-0 shadow-sm border border-border/20"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 shadow-sm"
                      style={{ backgroundColor: getAvatarColor(u.id) }}
                    >
                      {getUserInitials(u.display_name, u.email)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate text-foreground/90">
                      {u.display_name || u.email}
                    </p>
                    {u.display_name && (
                      <p className="text-[10px] text-muted-foreground truncate">{u.email}</p>
                    )}
                  </div>
                  {isExisting ? (
                    <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
                      Added
                    </span>
                  ) : isSelected ? (
                    <Check className="w-4 h-4 text-primary" />
                  ) : null}
                </button>
              )
            })}
          </div>
        )}

        {selectedIds.size > 0 && (
          <div className="flex items-center justify-between mb-4 bg-secondary/20 p-3 rounded-xl border border-border/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted-foreground">Role:</span>
              <div className="flex gap-1">
                {ROLES.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                      role === r.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border bg-background hover:border-primary/50 text-muted-foreground'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
            <span className="text-[10px] font-bold bg-primary/20 text-primary px-2 py-0.5 rounded-full">
              {selectedIds.size} selected
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1 h-10 text-sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            className="flex-1 h-10 text-sm shadow-lg shadow-primary/20"
            disabled={selectedIds.size === 0 || loading}
            onClick={handleInviteAll}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              `Invite ${selectedIds.size > 0 ? selectedIds.size : ''}`
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
